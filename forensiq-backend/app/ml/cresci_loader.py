"""
cresci_loader.py — Loader and feature converter for the Cresci-2017 benchmark dataset.

Reads genuine_accounts and social_spambots datasets from Cresci-2017 zip/CSV files,
transforms profile rows into our exact 26-feature schema, and returns a labeled DataFrame:
  label = 1 (bot)
  label = 0 (genuine / real)

Now joins tweets.csv per user to compute real text-derived features (hashtag_repetition,
avg_tweet_length, mention_density, tweet_template_score, posting_hour_entropy,
language_switches, avg_hashtags) instead of using fixed constants.
"""

import os
import re
import io
import math
import zipfile
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from collections import defaultdict

from app.ml.fake_detector import _shannon_entropy, _levenshtein_ratio
from app.ml.text_analyzer import analyze_tweets, analyze_bio, posting_hour_entropy

_ML_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(_ML_DIR, "data")
ZIP_PATH = os.path.join(DATA_DIR, "cresci-2017.zip")

# Maximum tweets per user to process (matches live inference behavior)
_MAX_TWEETS_PER_USER = 10


def _parse_created_at(val: str) -> int:
    if not val or pd.isna(val):
        return 365
    val_str = str(val).strip()
    # Try common formats
    for fmt in [
        "%a %b %d %H:%M:%S +0000 %Y",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]:
        try:
            dt = datetime.strptime(val_str, fmt).replace(tzinfo=timezone.utc)
            ref = datetime(2017, 6, 1, tzinfo=timezone.utc)  # Cresci-2017 collection date baseline
            return max(1, (ref - dt).days)
        except Exception:
            pass
    return 365


def _extract_posting_hours(created_at_values: list) -> list:
    """Extract hour-of-day from tweet created_at timestamps."""
    hours = []
    for val in created_at_values:
        if not val or pd.isna(val):
            continue
        val_str = str(val).strip()
        for fmt in ["%a %b %d %H:%M:%S +0000 %Y", "%Y-%m-%d %H:%M:%S"]:
            try:
                dt = datetime.strptime(val_str, fmt)
                hours.append(dt.hour)
                break
            except Exception:
                pass
    return hours


def _load_tweets_for_group(sub_zip: zipfile.ZipFile) -> dict:
    """
    Load tweets.csv from a Cresci sub-zip and return a dict mapping
    user_id -> list of tweet dicts (up to _MAX_TWEETS_PER_USER per user).

    Each tweet dict has: content, num_hashtags, num_urls, num_mentions, created_at
    """
    tweets_by_user = defaultdict(list)

    for inner in sub_zip.namelist():
        if inner.endswith("tweets.csv"):
            try:
                # Read in chunks to handle large files efficiently
                chunk_iter = pd.read_csv(
                    sub_zip.open(inner),
                    encoding="latin1",
                    on_bad_lines="skip",
                    usecols=["user_id", "text", "num_hashtags", "num_urls",
                             "num_mentions", "created_at"],
                    chunksize=50000,
                )
                for chunk in chunk_iter:
                    for _, row in chunk.iterrows():
                        uid = row.get("user_id")
                        if pd.isna(uid):
                            continue
                        uid = int(uid)
                        # Keep up to _MAX_TWEETS_PER_USER per user
                        if len(tweets_by_user[uid]) >= _MAX_TWEETS_PER_USER:
                            continue
                        text = str(row.get("text", ""))
                        if text.lower() in ("nan", "none", ""):
                            continue
                        tweets_by_user[uid].append({
                            "content": text[:280],
                            "num_hashtags": int(row.get("num_hashtags", 0)) if not pd.isna(row.get("num_hashtags")) else 0,
                            "num_urls": int(row.get("num_urls", 0)) if not pd.isna(row.get("num_urls")) else 0,
                            "num_mentions": int(row.get("num_mentions", 0)) if not pd.isna(row.get("num_mentions")) else 0,
                            "created_at": str(row.get("created_at", "")),
                        })
            except Exception as e:
                print(f"[cresci_loader] Warning: failed to load tweets.csv: {e}")
            break

    return dict(tweets_by_user)


def _compute_text_features_from_tweets(tweets: list) -> dict:
    """
    Compute the 7 text-derived features from real tweet data,
    using the same logic as text_analyzer.py does for live profiles.
    """
    if not tweets:
        # NaN for all tweet-content-derived features when no tweets are available.
        # Previously these were synthetic 0.0 values, which caused a
        # training/inference mismatch: the model learned that all-zero content
        # features = bot because training used 0.0 while live inference also
        # produces 0.0 from fxTwitter (which never returns tweet content).
        #
        # Using NaN instead of 0.0 here means:
        #   - XGB and LGB learn the correct NaN-routing direction from Cresci
        #     no-tweet profiles during training.
        #   - During inference, extract_features() also emits NaN for these
        #     features when engagement_data_available=False, creating a
        #     consistent training/inference distribution.
        return {
            "avg_hashtags":           np.nan,
            "url_density":            np.nan,
            "hashtag_repetition":     np.nan,
            "avg_tweet_length":       np.nan,
            "mention_density":        np.nan,
            "tweet_template_score":   np.nan,
            "posting_hour_entropy_val": np.nan,
            "language_switches":      np.nan,
        }

    # Use analyze_tweets from text_analyzer for consistency with live inference
    tweet_analysis = analyze_tweets(tweets)

    # Compute avg_hashtags from tweet-level data
    total_hashtags = sum(t.get("num_hashtags", 0) for t in tweets)
    avg_hashtags = round(total_hashtags / len(tweets), 2) if tweets else 0.0

    # Extract posting hours for entropy calculation
    hours = _extract_posting_hours([t.get("created_at", "") for t in tweets])
    phe = posting_hour_entropy(hours)

    return {
        "avg_hashtags": avg_hashtags,
        "url_density": tweet_analysis.get("url_density", 0.0),
        "hashtag_repetition": tweet_analysis.get("hashtag_repetition", 0.0),
        "avg_tweet_length": tweet_analysis.get("avg_tweet_length", 60.0),
        "mention_density": tweet_analysis.get("mention_density", 0.2),
        "tweet_template_score": tweet_analysis.get("tweet_template_score", 0.0),
        "posting_hour_entropy_val": phe,
        "language_switches": tweet_analysis.get("language_switches", 0),
    }


def row_to_features(row: dict, user_tweets: list = None) -> dict:
    username   = str(row.get("screen_name") or row.get("username") or "").strip()
    name       = str(row.get("name") or username).strip()
    followers  = max(0, int(float(row.get("followers_count") or 0)))
    following  = max(1, int(float(row.get("friends_count") or 1)))
    tweets     = max(0, int(float(row.get("statuses_count") or 0)))
    favourites = max(0, int(float(row.get("favourites_count") or 0)))
    bio        = str(row.get("description") or "").strip()
    if bio.lower() in ("nan", "none", "null"):
        bio = ""

    account_age = _parse_created_at(row.get("created_at"))
    posts_pd    = round(tweets / account_age, 4)
    likes_pp    = round(favourites / max(tweets, 1), 4)

    fol_ratio   = round(followers / max(following, 1), 4)
    fol_growth  = round(followers / account_age, 4)
    eng_rate    = round(likes_pp / max(followers, 1), 6)

    digits       = len(re.findall(r'\d', username))
    digit_ratio  = round(digits / max(len(username), 1), 4)
    ent          = _shannon_entropy(username)
    has_bot_pat  = int(bool(re.search(r"(bot|spam|fake|auto|pump|clone|mass).*\d|\d{4,}", username, re.I)))

    bio_analysis = analyze_bio(bio)
    bio_spam    = bio_analysis.get("bio_spam_score", 0.0)
    bio_has_url = int(bio_analysis.get("bio_has_url", False))

    verified    = int(bool(row.get("verified", False)))
    loc         = str(row.get("location") or "").strip()
    loc_present = int(bool(loc and loc.lower() not in ("nan", "none", "null", "unknown")))

    # default_profile_image intentionally not computed:
    # field is NaN in 99.7% of Cresci rows; SHAP=0 in all 3 models.
    # Removed from FEATURE_ORDER to keep the schema honest.

    sim = _levenshtein_ratio(
        re.sub(r'[^a-z]', '', name.lower()),
        re.sub(r'[^a-z0-9]', '', username.lower()),
    )

    # Compute text features from real tweet data when available
    text_feats = _compute_text_features_from_tweets(user_tweets)

    return {
        "followers":             followers,
        "following":             following,
        "tweets":                tweets,
        "account_age_days":      account_age,
        "follower_ratio":        fol_ratio,
        "follower_growth_rate":  fol_growth,
        "posts_per_day":         posts_pd,
        "likes_per_post":        likes_pp,
        "engagement_rate":       eng_rate,
        "avg_hashtags":          text_feats["avg_hashtags"],
        "url_density":           text_feats["url_density"],
        "hashtag_repetition":    text_feats["hashtag_repetition"],
        "avg_tweet_length":      text_feats["avg_tweet_length"],
        "mention_density":       text_feats["mention_density"],
        "tweet_template_score":  text_feats["tweet_template_score"],
        "bio_length":            len(bio),
        "bio_spam_score":        bio_spam,
        "bio_has_url":           bio_has_url,
        "username_digit_ratio":  digit_ratio,
        "username_entropy":      ent,
        "has_number_in_name":    has_bot_pat,
        "posting_hour_entropy":  text_feats["posting_hour_entropy_val"],
        "verified":              verified,
        "location_present":      loc_present,
        # default_profile_image removed from FEATURE_ORDER — not included here
        "language_switches":     text_feats["language_switches"],
        "name_username_similarity": sim,
    }


def load_cresci_dataset() -> pd.DataFrame:
    """
    Extract and process Cresci-2017 genuine and bot accounts.
    Now joins tweets.csv per user to compute real text-derived features
    instead of using fixed placeholder constants.
    Returns a balanced pandas DataFrame with 28 feature columns + 'label' column.
    """
    if not os.path.exists(ZIP_PATH):
        raise FileNotFoundError(f"{ZIP_PATH} not found. Run dataset downloader first.")

    records = []

    with zipfile.ZipFile(ZIP_PATH) as master_zip:
        names = master_zip.namelist()

        # Genuine accounts
        genuine_zips = [n for n in names if "genuine_accounts.csv.zip" in n]
        # Bot accounts
        bot_zips = [n for n in names if any(k in n for k in ["social_spambots_1", "social_spambots_2", "social_spambots_3", "fake_followers", "traditional_spambots_1"])]

        # Process Genuine
        for g_name in genuine_zips:
            print(f"[cresci_loader] Loading genuine accounts from {g_name}...")
            sub = zipfile.ZipFile(io.BytesIO(master_zip.read(g_name)))

            # Load tweets for this group
            print(f"[cresci_loader] Loading tweets for genuine accounts...")
            tweets_by_user = _load_tweets_for_group(sub)
            tweets_loaded = sum(len(v) for v in tweets_by_user.values())
            users_with_tweets = len(tweets_by_user)
            print(f"[cresci_loader] Loaded {tweets_loaded} tweets for {users_with_tweets} genuine users")

            for inner in sub.namelist():
                if inner.endswith("users.csv"):
                    df_raw = pd.read_csv(sub.open(inner), encoding="latin1", on_bad_lines="skip")
                    for _, row in df_raw.iterrows():
                        user_id = int(row.get("id", 0))
                        user_tweets = tweets_by_user.get(user_id, [])
                        feat = row_to_features(row.to_dict(), user_tweets=user_tweets)
                        feat["label"] = 0  # Real
                        feat["username"] = str(row.get("screen_name") or "")
                        records.append(feat)

        n_genuine = len(records)
        print(f"[cresci_loader] Loaded {n_genuine} genuine accounts.")

        # Process Bots (sample up to ~1.2x genuine to keep balanced)
        bot_records = []
        for b_name in bot_zips:
            if len(bot_records) >= int(n_genuine * 1.2):
                break
            print(f"[cresci_loader] Loading bot accounts from {b_name}...")
            sub = zipfile.ZipFile(io.BytesIO(master_zip.read(b_name)))

            # Load tweets for this group
            print(f"[cresci_loader] Loading tweets for bot group...")
            tweets_by_user = _load_tweets_for_group(sub)
            tweets_loaded = sum(len(v) for v in tweets_by_user.values())
            users_with_tweets = len(tweets_by_user)
            print(f"[cresci_loader] Loaded {tweets_loaded} tweets for {users_with_tweets} bot users")

            for inner in sub.namelist():
                if inner.endswith("users.csv"):
                    df_raw = pd.read_csv(sub.open(inner), encoding="latin1", on_bad_lines="skip")
                    for _, row in df_raw.iterrows():
                        user_id = int(row.get("id", 0))
                        user_tweets = tweets_by_user.get(user_id, [])
                        feat = row_to_features(row.to_dict(), user_tweets=user_tweets)
                        feat["label"] = 1  # Bot
                        feat["username"] = str(row.get("screen_name") or "")
                        bot_records.append(feat)
                        if len(bot_records) >= int(n_genuine * 1.2):
                            break

        print(f"[cresci_loader] Loaded {len(bot_records)} bot accounts.")
        records.extend(bot_records)

    df_full = pd.DataFrame(records)
    print(f"[cresci_loader] Total dataset size: {len(df_full)} profiles ({(df_full['label']==1).sum()} bot, {(df_full['label']==0).sum()} real)")
    return df_full
