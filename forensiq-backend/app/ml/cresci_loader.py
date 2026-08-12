"""
cresci_loader.py — Loader and feature converter for the Cresci-2017 benchmark dataset.

Reads genuine_accounts and social_spambots datasets from Cresci-2017 zip/CSV files,
transforms profile rows into our exact 28-feature schema, and returns a labeled DataFrame:
  label = 1 (bot)
  label = 0 (genuine / real)
"""

import os
import io
import re
import math
import zipfile
import pandas as pd
from datetime import datetime, timezone

from app.ml.fake_detector import _shannon_entropy, _levenshtein_ratio

_ML_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(_ML_DIR, "data")
ZIP_PATH = os.path.join(DATA_DIR, "cresci-2017.zip")

_SPAM_KEYWORDS = [
    "follow back", "followback", "f4f", "dm for promo", "crypto", "bitcoin",
    "giveaway", "airdrop", "earn money", "passive income", "free", "trade"
]


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


def row_to_features(row: dict) -> dict:
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

    bio_lower   = bio.lower()
    bio_spam_cnt = sum(1 for kw in _SPAM_KEYWORDS if kw in bio_lower)
    bio_spam    = round(min(bio_spam_cnt / 2.0, 1.0), 2)
    bio_has_url = int(bool(re.search(r'https?://\S+', bio)))

    verified    = int(bool(row.get("verified", False)))
    loc         = str(row.get("location") or "").strip()
    loc_present = int(bool(loc and loc.lower() not in ("nan", "none", "null", "unknown")))

    def_img_val = str(row.get("default_profile_image") or "").lower()
    def_img     = int(def_img_val in ("1", "true", "yes"))

    sim = _levenshtein_ratio(
        re.sub(r'[^a-z]', '', name.lower()),
        re.sub(r'[^a-z0-9]', '', username.lower()),
    )

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
        "avg_hashtags":          0.5,
        "url_density":           1.0 if bio_has_url else 0.1,
        "hashtag_repetition":    0.0,
        "avg_tweet_length":      60.0,
        "mention_density":       0.2,
        "tweet_template_score":  0.0,
        "bio_length":            len(bio),
        "bio_spam_score":        bio_spam,
        "bio_has_url":           bio_has_url,
        "username_digit_ratio":  digit_ratio,
        "username_entropy":      ent,
        "has_number_in_name":    has_bot_pat,
        "posting_hour_entropy":  0.5,
        "verified":              verified,
        "location_present":      loc_present,
        "default_profile_image": def_img,
        "language_switches":     0,
        "name_username_similarity": sim,
    }


def load_cresci_dataset() -> pd.DataFrame:
    """
    Extract and process Cresci-2017 genuine and bot accounts.
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
            for inner in sub.namelist():
                if inner.endswith("users.csv"):
                    df_raw = pd.read_csv(sub.open(inner), encoding="latin1", on_bad_lines="skip")
                    for _, row in df_raw.iterrows():
                        feat = row_to_features(row.to_dict())
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
            for inner in sub.namelist():
                if inner.endswith("users.csv"):
                    df_raw = pd.read_csv(sub.open(inner), encoding="latin1", on_bad_lines="skip")
                    for _, row in df_raw.iterrows():
                        feat = row_to_features(row.to_dict())
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
