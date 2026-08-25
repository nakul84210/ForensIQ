"""
credibility_engine.py — Detailed multi-factor credibility scoring engine.

Computes 4 factor categories:
  1. Account History   (age, username pattern, bio completeness, verified status)
  2. Engagement Quality (follower/following ratio, likes/post, post/like ratio)
  3. Content Quality    (posting frequency, hashtag usage, template originality, language coherence)
  4. Network Trust      (follower tier, connection ratio, mention density, profile completeness)
"""

import re
from app.ml.text_analyzer import analyze_profile_text, analyze_bio


def score_account_history(profile: dict) -> dict:
    age = profile.get("account_age_days", 0)
    username = profile.get("username", "")
    bio = profile.get("bio", "") or ""
    verified = profile.get("verified", False)

    # 1. Age score (0-25)
    age_score = min(age / 365.0 * 25.0, 25.0)

    # 2. Username pattern score (0-20)
    digit_ratio = len(re.findall(r'\d', username)) / max(len(username), 1)
    if digit_ratio > 0.4:
        username_score = 5
        user_val = f"High digit ratio ({round(digit_ratio*100)}%)"
    elif re.search(r'(bot|spam|fake|auto|pump|clone|mass).*\d|\d{4,}', username, re.I):
        username_score = 8
        user_val = "Suspicious pattern"
    else:
        username_score = 20
        user_val = "Natural pattern"

    # 3. Bio completeness (0-25)
    bio_score = min(len(bio) / 80.0 * 25.0, 25.0)

    # 4. Verified status (0-25)
    verified_score = 25 if verified else 10 if age > 365 else 0

    items = [
        {"label": "Account Age", "value": f"{age} days", "score": round(age_score), "max": 25, "detail": "Older accounts demonstrate established history"},
        {"label": "Username Pattern", "value": user_val, "score": round(username_score), "max": 20, "detail": "Natural usernames are more credible than random digits"},
        {"label": "Profile Completeness", "value": f"{len(bio)} chars bio", "score": round(bio_score), "max": 25, "detail": "Detailed profiles reflect genuine user activity"},
        {"label": "Verified Status", "value": "Verified" if verified else "Standard Account", "score": round(verified_score), "max": 25, "detail": "Platform verification provides strong identity proof"},
    ]
    total = round(age_score + username_score + bio_score + verified_score)
    return {"category": "Account History", "icon": "📅", "score": min(total, 100), "maxScore": 100, "items": items}


def score_engagement(profile: dict) -> dict:
    followers = profile.get("followers", 0)
    following = profile.get("following", 1)
    likes_per_post = profile.get("likes_per_post", 0)
    posts = profile.get("posts", 0)

    ratio = followers / max(following, 1)

    # Ratio score (0-25)
    ratio_score = min(ratio * 12.5, 25.0) if ratio <= 2.0 else 25.0

    # Like score (0-25)
    like_score = min(likes_per_post / 15.0 * 25.0, 25.0)

    # Post volume consistency (0-25)
    vol_score = 25.0 if posts > 100 else min(posts / 100.0 * 25.0, 25.0)

    # Engagement health (0-25)
    engagement_rate = likes_per_post / max(followers, 1)
    if 0.01 <= engagement_rate <= 0.15:
        health_score = 25.0
        health_val = f"Organic ({round(engagement_rate*100, 1)}%)"
    elif engagement_rate > 0.3 and followers > 500:
        health_score = 12.0
        health_val = f"Abnormally High ({round(engagement_rate*100, 1)}%)"
    else:
        health_score = 15.0
        health_val = f"Low ({round(engagement_rate*100, 2)}%)"

    items = [
        {"label": "Follower Ratio", "value": f"{round(ratio, 2)} ratio", "score": round(ratio_score), "max": 25, "detail": "Organic ratio indicates authentic community reach"},
        {"label": "Avg Likes per Post", "value": f"{round(likes_per_post, 1)} likes", "score": round(like_score), "max": 25, "detail": "Consistent likes indicate active audience"},
        {"label": "Total Post Activity", "value": f"{posts} posts", "score": round(vol_score), "max": 25, "detail": "Sustained activity history supports authenticity"},
        {"label": "Engagement Health", "value": health_val, "score": round(health_score), "max": 25, "detail": "Realistic engagement rate vs follower count"},
    ]
    total = round(ratio_score + like_score + vol_score + health_score)
    return {"category": "Engagement Quality", "icon": "📊", "score": min(total, 100), "maxScore": 100, "items": items}


def score_content(profile: dict) -> dict:
    posts_per_day = profile.get("posts_per_day", 0)
    avg_hashtags = profile.get("avg_hashtags", 0)
    text_signals = analyze_profile_text(profile)

    # Frequency score (0-25)
    if posts_per_day <= 5:
        freq_score = 25.0
        freq_val = f"{round(posts_per_day, 1)}/day (Normal)"
    elif posts_per_day <= 15:
        freq_score = 18.0
        freq_val = f"{round(posts_per_day, 1)}/day (Active)"
    else:
        freq_score = 5.0
        freq_val = f"{round(posts_per_day, 1)}/day (High)"

    # Hashtag score (0-25)
    if avg_hashtags <= 3:
        ht_score = 25.0
    elif avg_hashtags <= 7:
        ht_score = 15.0
    else:
        ht_score = 5.0

    # Originality (0-25) based on template score
    template_score = text_signals.get("tweet_template_score", 0.0)
    orig_score = round(max(0.0, (1.0 - template_score) * 25.0))
    orig_val = "Unique" if template_score < 0.3 else "Repetitive" if template_score > 0.6 else "Moderate"

    # Language coherence (0-25)
    switches = text_signals.get("language_switches", 0)
    lang_score = 25.0 if switches <= 1 else 15.0 if switches <= 3 else 5.0
    lang = text_signals.get("dominant_language", "en").upper()

    items = [
        {"label": "Posting Cadence", "value": freq_val, "score": round(freq_score), "max": 25, "detail": "Human-paced posting schedule"},
        {"label": "Hashtag Density", "value": f"{round(avg_hashtags, 1)} avg/post", "score": round(ht_score), "max": 25, "detail": "Moderate hashtag usage avoids spam flags"},
        {"label": "Content Originality", "value": orig_val, "score": orig_score, "max": 25, "detail": "Varied non-repetitive phrasing"},
        {"label": "Language Coherence", "value": f"Language: {lang}", "score": round(lang_score), "max": 25, "detail": "Consistent primary language usage"},
    ]
    total = round(freq_score + ht_score + orig_score + lang_score)
    return {"category": "Content Quality", "icon": "📝", "score": min(total, 100), "maxScore": 100, "items": items}


def score_network(profile: dict) -> dict:
    followers = profile.get("followers", 0)
    following = profile.get("following", 1)
    location = profile.get("location", "") or ""

    # Follower tier score (0-25)
    if followers > 10000:
        tier_score = 25.0
        tier_val = "High Audience"
    elif followers > 500:
        tier_score = 20.0
        tier_val = "Moderate Audience"
    else:
        tier_score = 12.0
        tier_val = "Growing Audience"

    # Connection balance (0-25)
    ratio = followers / max(following, 1)
    balance_score = 25.0 if ratio >= 0.5 else 12.0

    # Geo presence (0-25)
    geo_score = 25.0 if location and location.strip().lower() not in ("", "unknown") else 10.0
    geo_val = location if geo_score == 25.0 else "Not Specified"

    # Spam keyword check (0-25)
    # Compute real bio_spam_score from the bio text using the same logic as
    # text_analyzer.py. Previously this read profile.get("features", {}).get("bio_spam_score", 0.0)
    # which always returned 0.0 because ProfileRequest is a flat dict without a "features" key.
    bio_text = profile.get("bio", "") or ""
    bio_analysis = analyze_bio(bio_text)
    bio_spam = bio_analysis.get("bio_spam_score", 0.0)
    spam_score = 25.0 if bio_spam == 0 else 10.0 if bio_spam < 0.3 else 0.0

    items = [
        {"label": "Audience Reach", "value": tier_val, "score": round(tier_score), "max": 25, "detail": "Follower volume tier classification"},
        {"label": "Network Balance", "value": f"{followers} fol / {following} ing", "score": round(balance_score), "max": 25, "detail": "Balanced following-to-follower relationship"},
        {"label": "Geographic Metadata", "value": geo_val, "score": round(geo_score), "max": 25, "detail": "Specified profile location metadata"},
        {"label": "Spam Flag Audit", "value": "Clean" if spam_score == 25 else "Flagged", "score": round(spam_score), "max": 25, "detail": "Absence of promotional or spam keywords"},
    ]
    total = round(tier_score + balance_score + geo_score + spam_score)
    return {"category": "Network Trust", "icon": "🕸️", "score": min(total, 100), "maxScore": 100, "items": items}


def grade(score: int) -> str:
    if score >= 85: return "A"
    if score >= 70: return "B"
    if score >= 55: return "C"
    if score >= 40: return "D"
    return "F"


def verdict(score: int) -> dict:
    if score >= 85: return {"text": "High Credibility", "color": "text-green-400"}
    if score >= 70: return {"text": "Moderate Credibility", "color": "text-blue-400"}
    if score >= 55: return {"text": "Low Credibility", "color": "text-yellow-400"}
    if score >= 40: return {"text": "Very Low Credibility", "color": "text-orange-400"}
    return {"text": "Extremely Low Credibility", "color": "text-red-400"}


def score_credibility(profile: dict) -> dict:
    history = score_account_history(profile)
    engagement = score_engagement(profile)
    content = score_content(profile)
    network = score_network(profile)
    overall = round((history["score"] + engagement["score"] + content["score"] + network["score"]) / 4)
    g = grade(overall)
    v = verdict(overall)
    return {
        "overall_score": overall,
        "grade": g,
        "verdict": v["text"],
        "verdict_color": v["color"],
        "factors": [history, engagement, content, network],
    }
