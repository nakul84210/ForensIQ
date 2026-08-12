"""
text_analyzer.py — NLP-based signals for bot/fake account detection.

All signals here are computed purely from the text data already available
in the live Twitter profile (bio string + list of recent tweet dicts).
No external API calls — fast and offline.

Signals produced:
  bio_spam_score      — 0.0–1.0, fraction of spam keywords matched in bio
  bio_has_url         — bool, bio contains a link
  tweet_template_score — 0.0–1.0, how repetitive the recent tweets are
  url_density         — avg URLs per tweet
  hashtag_repetition  — fraction of hashtags that are duplicates
  avg_tweet_length    — average character count per tweet
  mention_density     — avg @mentions per tweet
  dominant_language   — ISO 639-1 code ('en', 'es', …) or 'unknown'
  language_switches   — number of language changes across recent tweets
"""

import re
import math
from difflib import SequenceMatcher
from typing import Optional

try:
    from langdetect import detect, LangDetectException
    _LANGDETECT_AVAILABLE = True
except ImportError:
    _LANGDETECT_AVAILABLE = False


# ---------------------------------------------------------------------------
# Bio spam keyword list
# Words/phrases strongly associated with spam, bot, or inauthentic accounts.
# Curated from common patterns in research literature.
# ---------------------------------------------------------------------------
_BIO_SPAM_KEYWORDS = [
    # Follow-back bots
    "follow back", "followback", "i follow back", "follow4follow", "f4f",
    "follow for follow", "follow me back", "team followback",
    # Promo / engagement farming
    "dm for promo", "dm to promote", "promo here", "paid promo",
    "buy followers", "get followers", "gain followers", "grow your account",
    # Crypto spam
    "crypto signals", "forex signals", "binary trading", "trade signals",
    "bitcoin giveaway", "crypto giveaway", "nft drop", "free crypto",
    "airdrop", "pump signal", "100x gem",
    # Generic spam
    "click link", "check bio", "link in bio", "visit my", "subscribe to",
    "make money fast", "earn from home", "passive income", "financial freedom",
    # Mass engagement
    "auto like", "auto retweet", "mass follow", "like for like", "l4l",
]

_URL_PATTERN = re.compile(
    r'https?://\S+|www\.\S+|t\.co/\S+', re.IGNORECASE
)
_MENTION_PATTERN = re.compile(r'@\w+')
_HASHTAG_PATTERN = re.compile(r'#\w+')


def _text_similarity(a: str, b: str) -> float:
    """Return similarity ratio between two strings (0.0–1.0)."""
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def analyze_bio(bio: str) -> dict:
    """Analyze the profile bio for spam signals."""
    if not bio:
        return {
            "bio_spam_score": 0.0,
            "bio_has_url": False,
            "bio_length": 0,
        }

    bio_lower = bio.lower()
    matched = sum(1 for kw in _BIO_SPAM_KEYWORDS if kw in bio_lower)
    spam_score = round(min(matched / 3.0, 1.0), 3)  # saturates at 3+ keywords

    return {
        "bio_spam_score": spam_score,
        "bio_has_url": bool(_URL_PATTERN.search(bio)),
        "bio_length": len(bio),
    }


def analyze_tweets(recent_posts: list) -> dict:
    """
    Analyze a list of recent post dicts.
    Each post dict should have at least a 'content' key.
    """
    if not recent_posts:
        return {
            "tweet_template_score": 0.0,
            "url_density": 0.0,
            "hashtag_repetition": 0.0,
            "avg_tweet_length": 0.0,
            "mention_density": 0.0,
            "dominant_language": "unknown",
            "language_switches": 0,
            "posting_hours": [],
        }

    texts = [p.get("content", "") for p in recent_posts if p.get("content")]
    if not texts:
        return {
            "tweet_template_score": 0.0,
            "url_density": 0.0,
            "hashtag_repetition": 0.0,
            "avg_tweet_length": 0.0,
            "mention_density": 0.0,
            "dominant_language": "unknown",
            "language_switches": 0,
            "posting_hours": [],
        }

    n = len(texts)

    # Template / repetition score — average pairwise similarity
    if n >= 2:
        similarities = []
        for i in range(min(n, 8)):           # compare up to 8 tweets to keep O(n²) small
            for j in range(i + 1, min(n, 8)):
                similarities.append(_text_similarity(texts[i], texts[j]))
        template_score = round(sum(similarities) / len(similarities), 3) if similarities else 0.0
    else:
        template_score = 0.0

    # URL density
    url_counts = [len(_URL_PATTERN.findall(t)) for t in texts]
    url_density = round(sum(url_counts) / n, 3)

    # Hashtag repetition: what fraction of all hashtags are duplicates?
    all_tags = []
    for t in texts:
        all_tags.extend(h.lower() for h in _HASHTAG_PATTERN.findall(t))
    if all_tags:
        unique_tags = len(set(all_tags))
        hashtag_repetition = round(1.0 - (unique_tags / len(all_tags)), 3)
    else:
        hashtag_repetition = 0.0

    # Average tweet length
    avg_tweet_length = round(sum(len(t) for t in texts) / n, 1)

    # Mention density
    mention_counts = [len(_MENTION_PATTERN.findall(t)) for t in texts]
    mention_density = round(sum(mention_counts) / n, 3)

    # Language detection
    dominant_language = "unknown"
    language_switches = 0
    if _LANGDETECT_AVAILABLE and texts:
        try:
            full_text = " ".join(texts[:5])  # use first 5 tweets for detection
            dominant_language = detect(full_text)

            # Detect per-tweet and count switches
            langs = []
            for t in texts[:8]:
                try:
                    if len(t.strip()) > 10:
                        langs.append(detect(t))
                except LangDetectException:
                    pass
            if langs:
                switches = sum(1 for i in range(1, len(langs)) if langs[i] != langs[i - 1])
                language_switches = switches
        except LangDetectException:
            pass

    # Posting hours (extracted from 'time' field if present, e.g. "Mon Aug 07 14:32:11 +0000 2025")
    posting_hours = []
    for p in recent_posts:
        time_str = p.get("time", "")
        if time_str and len(time_str) > 10:
            try:
                from datetime import datetime
                dt = datetime.strptime(time_str, "%a %b %d %H:%M:%S +0000 %Y")
                posting_hours.append(dt.hour)
            except (ValueError, TypeError):
                pass

    return {
        "tweet_template_score": template_score,
        "url_density": url_density,
        "hashtag_repetition": hashtag_repetition,
        "avg_tweet_length": avg_tweet_length,
        "mention_density": mention_density,
        "dominant_language": dominant_language,
        "language_switches": language_switches,
        "posting_hours": posting_hours,
    }


def posting_hour_entropy(hours: list) -> float:
    """
    Shannon entropy of posting hours (0–23).
    High entropy (≈ log2(24) ≈ 4.58) → posting at all hours → bot signal.
    Low entropy → concentrated posting times → human signal.
    Returns 0.0–1.0 normalized.
    """
    if not hours:
        return 0.0

    counts = [0] * 24
    for h in hours:
        counts[int(h) % 24] += 1

    total = len(hours)
    entropy = 0.0
    for c in counts:
        if c > 0:
            p = c / total
            entropy -= p * math.log2(p)

    # Normalize to 0–1 (max entropy for 24 buckets = log2(24) ≈ 4.58)
    return round(entropy / math.log2(24), 3)


def analyze_profile_text(profile: dict) -> dict:
    """
    Top-level function — call this from extract_features().
    Returns a flat dict of all NLP-derived signals.
    """
    bio = profile.get("bio", "") or ""
    recent_posts = profile.get("recent_posts", []) or []

    bio_signals = analyze_bio(bio)
    tweet_signals = analyze_tweets(recent_posts)
    hours = tweet_signals.pop("posting_hours", [])
    hour_entropy = posting_hour_entropy(hours)

    return {
        **bio_signals,
        **tweet_signals,
        "posting_hour_entropy": hour_entropy,
    }
