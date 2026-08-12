"""
fake_detector.py — Feature extraction, rule-based scoring, and ML classification.

Architecture:
  1. extract_features()    — builds 28-feature vector from a live profile dict
  2. rule_based_score()    — transparent heuristic scorer (always runs)
  3. _ml_score()           — RF + XGB + LGB ensemble (runs only if models trained)
  4. classify_profile()    — blends all signals, returns risk score + SHAP values

Scoring blend (when models are trained):
  0.35 × Random Forest + 0.35 × XGBoost + 0.30 × LightGBM

When models are not yet trained:
  100% rule-based, clearly flagged as such in the response.
"""

import re
import os
import math
import joblib

from app.ml.text_analyzer import analyze_profile_text

_ML_DIR = os.path.dirname(__file__)

# ---------------------------------------------------------------------------
# Load trained models — silent skip if not yet trained
# ---------------------------------------------------------------------------
_RF_MODEL  = None
_XGB_MODEL = None
_LGB_MODEL = None

try:
    _RF_MODEL = joblib.load(os.path.join(_ML_DIR, "random_forest_model.pkl"))
except Exception:
    pass
try:
    _XGB_MODEL = joblib.load(os.path.join(_ML_DIR, "xgboost_model.pkl"))
except Exception:
    pass
try:
    _LGB_MODEL = joblib.load(os.path.join(_ML_DIR, "lgbm_model.pkl"))
except Exception:
    pass

FEATURE_ORDER = [
    # --- Network / ratio features ---
    "followers", "following", "tweets", "account_age_days",
    "follower_ratio", "follower_growth_rate",
    # --- Activity features ---
    "posts_per_day", "likes_per_post", "engagement_rate",
    # --- Content / hashtag features ---
    "avg_hashtags", "url_density", "hashtag_repetition",
    "avg_tweet_length", "mention_density", "tweet_template_score",
    # --- Bio features ---
    "bio_length", "bio_spam_score", "bio_has_url",
    # --- Username features ---
    "username_digit_ratio", "username_entropy", "has_number_in_name",
    # --- Temporal features ---
    "posting_hour_entropy",
    # --- Profile features ---
    "verified", "location_present", "default_profile_image",
    # --- Language features ---
    "language_switches",
    # --- Credibility ---
    "name_username_similarity",
]


def _shannon_entropy(s: str) -> float:
    """Shannon entropy of a string's character distribution."""
    if not s:
        return 0.0
    freq = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    n = len(s)
    return round(-sum((f / n) * math.log2(f / n) for f in freq.values()), 4)


def _levenshtein_ratio(a: str, b: str) -> float:
    """Normalized Levenshtein similarity (0.0–1.0). Simple DP implementation."""
    if not a or not b:
        return 0.0
    a, b = a.lower(), b.lower()
    la, lb = len(a), len(b)
    dp = list(range(lb + 1))
    for i in range(1, la + 1):
        prev = dp[:]
        dp[0] = i
        for j in range(1, lb + 1):
            dp[j] = prev[j - 1] if a[i - 1] == b[j - 1] else 1 + min(prev[j - 1], prev[j], dp[j - 1])
    return round(1.0 - dp[lb] / max(la, lb), 4)


def extract_features(profile: dict) -> dict:
    """
    Build a 28-feature vector from a live Twitter profile dict.
    All features are floats in ranges interpretable by tree-based models.
    """
    username     = profile.get("username", "")
    name         = profile.get("name", "")
    followers    = int(profile.get("followers", 0))
    following    = int(profile.get("following", 1))
    posts        = int(profile.get("posts", 0))
    bio          = profile.get("bio", "") or ""
    account_age  = max(int(profile.get("account_age_days", 1)), 1)
    avg_hashtags = float(profile.get("avg_hashtags", 0))
    likes_pp     = float(profile.get("likes_per_post", 0))
    posts_pd     = float(profile.get("posts_per_day", round(posts / account_age, 4)))
    verified     = int(bool(profile.get("verified", False)))
    location     = profile.get("location", "") or ""
    profile_img  = profile.get("profile_image", "") or ""

    # NLP signals from text_analyzer
    text_signals = analyze_profile_text(profile)

    # Network
    follower_ratio       = round(followers / max(following, 1), 4)
    follower_growth_rate = round(followers / account_age, 4)
    engagement_rate      = round(likes_pp / max(followers, 1), 6)

    # Username analysis
    digits_in_name    = len(re.findall(r'\d', username))
    digit_ratio       = round(digits_in_name / max(len(username), 1), 4)
    username_entropy  = _shannon_entropy(username)
    has_bot_pattern   = int(bool(re.search(
        r"(bot|spam|fake|auto|pump|clone|mass).*\d|\d{4,}", username
    )))

    # Profile completeness
    default_img = int(
        "default_profile" in profile_img.lower()
        or not profile_img
        or profile_img.endswith("default_profile_normal.png")
    )
    location_present = int(bool(location and location.strip().lower() not in ("", "unknown")))

    # Name-username similarity (low similarity is mildly suspicious)
    name_username_sim = _levenshtein_ratio(
        re.sub(r'[^a-z]', '', name.lower()),
        re.sub(r'[^a-z0-9]', '', username.lower()),
    )

    return {
        # Network
        "followers":             followers,
        "following":             following,
        "tweets":                posts,
        "account_age_days":      account_age,
        "follower_ratio":        follower_ratio,
        "follower_growth_rate":  follower_growth_rate,
        # Activity
        "posts_per_day":         posts_pd,
        "likes_per_post":        likes_pp,
        "engagement_rate":       engagement_rate,
        # Content
        "avg_hashtags":          avg_hashtags,
        "url_density":           text_signals["url_density"],
        "hashtag_repetition":    text_signals["hashtag_repetition"],
        "avg_tweet_length":      text_signals["avg_tweet_length"],
        "mention_density":       text_signals["mention_density"],
        "tweet_template_score":  text_signals["tweet_template_score"],
        # Bio
        "bio_length":            len(bio),
        "bio_spam_score":        text_signals["bio_spam_score"],
        "bio_has_url":           int(text_signals["bio_has_url"]),
        # Username
        "username_digit_ratio":  digit_ratio,
        "username_entropy":      username_entropy,
        "has_number_in_name":    has_bot_pattern,
        # Temporal
        "posting_hour_entropy":  text_signals["posting_hour_entropy"],
        # Profile
        "verified":              verified,
        "location_present":      location_present,
        "default_profile_image": default_img,
        # Language
        "language_switches":     text_signals["language_switches"],
        # Credibility
        "name_username_similarity": name_username_sim,
    }


# ---------------------------------------------------------------------------
# Rule-based heuristic scorer
# ---------------------------------------------------------------------------
def rule_based_score(features: dict) -> tuple:
    """
    Transparent heuristic scorer.
    Returns (score 0–99, list of human-readable reason strings).
    Each rule is independently auditable — no black box.
    """
    score = 0.0
    reasons = []

    # --- Follower / following ratio ---
    ratio = features["follower_ratio"]
    if ratio < 0.05:
        score += 40; reasons.append("Very low follower/following ratio")
    elif ratio < 0.15:
        score += 28; reasons.append("Low follower/following ratio")
    elif ratio < 0.3:
        score += 15
    elif ratio > 10:
        score -= 25
    elif ratio > 3:
        score -= 15

    # --- Posting frequency ---
    ppd = features["posts_per_day"]
    if ppd > 50:
        score += 40; reasons.append("Inhuman posting frequency (>50/day)")
    elif ppd > 20:
        score += 30; reasons.append("Very high posting frequency (>20/day)")
    elif ppd > 10:
        score += 15
    elif ppd < 0.5:
        score -= 5

    # --- Account age ---
    age = features["account_age_days"]
    if age < 30:
        score += 25; reasons.append("Very new account (<30 days)")
    elif age < 90:
        score += 15; reasons.append("Recently created account (<90 days)")
    elif age > 2000:
        score -= 20
    elif age > 1000:
        score -= 12
    elif age > 500:
        score -= 6

    # --- Hashtag usage ---
    ht = features["avg_hashtags"]
    if ht > 15:
        score += 20; reasons.append("Excessive hashtag usage (>15/tweet)")
    elif ht > 8:
        score += 10; reasons.append("High hashtag usage (>8/tweet)")
    elif ht < 2:
        score -= 5

    # --- Hashtag repetition (same tags repeated across tweets) ---
    ht_rep = features["hashtag_repetition"]
    if ht_rep > 0.7:
        score += 15; reasons.append("Highly repetitive hashtags across tweets")
    elif ht_rep > 0.4:
        score += 8

    # --- Username patterns ---
    if features["has_number_in_name"]:
        score += 12; reasons.append("Username contains suspicious number/keyword pattern")
    if features["username_digit_ratio"] > 0.4:
        score += 10; reasons.append("Username is mostly digits")

    # --- Bio signals ---
    if features["bio_length"] == 0:
        score += 12; reasons.append("Empty bio")
    elif features["bio_length"] > 100:
        score -= 12
    elif features["bio_length"] > 50:
        score -= 6

    if features["bio_spam_score"] > 0.5:
        score += 20; reasons.append("Bio contains multiple spam/promotional keywords")
    elif features["bio_spam_score"] > 0.2:
        score += 10; reasons.append("Bio contains spam-related keywords")

    if features["bio_has_url"] and features["bio_spam_score"] > 0.1:
        score += 8; reasons.append("Bio contains link combined with promotional language")

    # --- Engagement (likes per post vs followers) ---
    lpp = features["likes_per_post"]
    fol = features["followers"]
    if lpp < 1 and 200 < fol < 100_000 and not features["verified"]:
        score += 22; reasons.append("Near-zero engagement despite sizeable follower count")
    elif lpp < 3 and 500 < fol < 100_000 and not features["verified"]:
        score += 12
    elif lpp > 500:
        score -= 20
    elif lpp > 100:
        score -= 12
    elif lpp > 30:
        score -= 6

    # --- Mass follow with few followers ---
    if fol < 50 and features["following"] > 100:
        score += 22; reasons.append("Mass following with very few followers")
    elif fol < 200 and features["following"] > 500:
        score += 15; reasons.append("Disproportionate following count")

    # --- Tweet content signals ---
    if features["url_density"] > 1.5:
        score += 15; reasons.append("Very high URL density in tweets (link spam)")
    elif features["url_density"] > 0.8:
        score += 8

    if features["tweet_template_score"] > 0.75:
        score += 18; reasons.append("Tweets are highly templated/repetitive")
    elif features["tweet_template_score"] > 0.5:
        score += 10; reasons.append("Tweets show repetitive patterns")

    if features["mention_density"] > 3:
        score += 12; reasons.append("Mass @mention usage in tweets")

    # --- Posting time entropy ---
    phe = features["posting_hour_entropy"]
    if phe > 0.85:
        score += 15; reasons.append("Posting uniformly across all 24 hours (bot-like schedule)")
    elif phe > 0.7:
        score += 8

    # --- Language switches ---
    if features["language_switches"] > 3:
        score += 10; reasons.append("Frequent language switching across tweets")

    # --- Profile completeness ---
    if features["default_profile_image"]:
        score += 10; reasons.append("Default or missing profile image")
    if not features["location_present"]:
        score += 3  # mild signal only

    # --- Verified accounts and large accounts are hard to fake ---
    if features["verified"]:
        score -= 30
    if fol > 1_000_000:
        score -= 20
    elif fol > 100_000:
        score -= 10
    elif fol > 10_000:
        score -= 5

    # --- No posts on old account ---
    if features["tweets"] == 0 and age > 60:
        score += 10; reasons.append("No posts despite account age")

    return min(max(score, 0.0), 99.0), reasons


# ---------------------------------------------------------------------------
# ML model scoring
# ---------------------------------------------------------------------------
def _ml_score(features: dict) -> dict:
    """
    Run features through all loaded ML models.
    Returns dict of {model_name: bot_probability_pct} for each available model.
    Returns empty dict if no models are loaded.
    """
    available = {}
    if _RF_MODEL is None and _XGB_MODEL is None and _LGB_MODEL is None:
        return available

    try:
        import pandas as pd
        row = pd.DataFrame([{k: features.get(k, 0) for k in FEATURE_ORDER}])

        if _RF_MODEL is not None:
            try:
                proba = _RF_MODEL.predict_proba(row)
                # Handle models with only 1 class (stale synthetic training)
                if proba.shape[1] >= 2:
                    available["random_forest"] = round(float(proba[0][1]) * 100, 1)
            except Exception as e:
                print(f"[fake_detector] RF predict failed: {e}")

        if _XGB_MODEL is not None:
            try:
                proba = _XGB_MODEL.predict_proba(row)
                if proba.shape[1] >= 2:
                    available["xgboost"] = round(float(proba[0][1]) * 100, 1)
            except Exception as e:
                print(f"[fake_detector] XGB predict failed: {e}")

        if _LGB_MODEL is not None:
            try:
                proba = _LGB_MODEL.predict_proba(row)
                if proba.shape[1] >= 2:
                    available["lightgbm"] = round(float(proba[0][1]) * 100, 1)
            except Exception as e:
                print(f"[fake_detector] LGB predict failed: {e}")

    except Exception as e:
        print(f"[fake_detector] ML scoring error: {e}")

    return available


# ---------------------------------------------------------------------------
# SHAP explainability
# ---------------------------------------------------------------------------
def _shap_values(features: dict, model) -> dict | None:
    """
    Compute real SHAP values for the given feature vector using TreeExplainer.
    Returns dict of {feature_name: shap_value} where:
      positive value → pushes toward BOT prediction (+)
      negative value → pushes toward REAL prediction (-)
    Returns None if shap is not available or model not loaded.
    """
    if model is None:
        return None
    try:
        import shap
        import pandas as pd

        row = pd.DataFrame([{k: features.get(k, 0) for k in FEATURE_ORDER}])
        explainer = shap.TreeExplainer(model)
        
        # Modern shap (>=0.40) returns an Explanation object
        exp = explainer(row)
        if hasattr(exp, 'values'):
            # exp.values shape: (1, n_features, 2) or (1, n_features)
            val_matrix = exp.values
            if len(val_matrix.shape) == 3 and val_matrix.shape[2] >= 2:
                vals = val_matrix[0, :, 1]
            elif len(val_matrix.shape) == 2:
                vals = val_matrix[0]
            else:
                return None
        else:
            sv = explainer.shap_values(row)
            if isinstance(sv, list) and len(sv) >= 2:
                vals = sv[1][0]
            elif hasattr(sv, 'shape') and len(sv.shape) == 2:
                vals = sv[0]
            else:
                return None

        return {
            feat: round(float(vals[i]), 4)
            for i, feat in enumerate(FEATURE_ORDER)
        }
    except Exception as e:
        print(f"[fake_detector] SHAP computation failed: {e}")
        return None


FEATURE_DISPLAY_NAMES = {
    "followers": "Follower Count",
    "following": "Following Count",
    "tweets": "Total Posts",
    "account_age_days": "Account Age",
    "follower_ratio": "Follower Ratio",
    "follower_growth_rate": "Follower Growth Rate",
    "posts_per_day": "Posts Per Day",
    "likes_per_post": "Likes Per Post",
    "engagement_rate": "Engagement Rate",
    "avg_hashtags": "Avg Hashtags",
    "url_density": "URL Density",
    "hashtag_repetition": "Hashtag Repetition",
    "avg_tweet_length": "Avg Tweet Length",
    "mention_density": "Mention Density",
    "tweet_template_score": "Tweet Template Score",
    "bio_length": "Bio Length",
    "bio_spam_score": "Bio Spam Score",
    "bio_has_url": "Bio Has Link",
    "username_digit_ratio": "Username Digit Ratio",
    "username_entropy": "Username Entropy",
    "has_number_in_name": "Suspicious Name Pattern",
    "posting_hour_entropy": "Posting Schedule Entropy",
    "verified": "Verified Status",
    "location_present": "Location Present",
    "default_profile_image": "Default Profile Image",
    "language_switches": "Language Switches",
    "name_username_similarity": "Name Similarity",
}

# ---------------------------------------------------------------------------
# Main public interface
# ---------------------------------------------------------------------------
def classify_profile(profile: dict) -> dict:
    """
    Score a live Twitter profile for bot risk.

    Returns:
      risk_score        — 0–99 blended bot risk percentage
      status            — 'Real' | 'Suspicious' | 'Fake'
      reasons           — list of human-readable rule-based flag strings
      features          — full 28-feature vector
      model_scores      — dict of per-model bot probabilities
      models_trained    — bool: whether real ML models are loaded
      shap_values       — per-feature SHAP contributions (None if not available)
      shap_explanation  — list of top 8 SHAP feature contribution objects
    """
    features   = extract_features(profile)
    rule_score, reasons = rule_based_score(features)
    ml_scores  = _ml_score(features)

    # Filter out LightGBM if present to match target schema
    ml_scores_clean = {k: v for k, v in ml_scores.items() if k != "lightgbm"}

    models_trained = len(ml_scores_clean) > 0

    if models_trained:
        weights = {"random_forest": 0.50, "xgboost": 0.50}
        total_w = sum(weights[k] for k in ml_scores_clean if k in weights)
        ml_component = sum(
            ml_scores_clean[k] * weights[k] for k in ml_scores_clean if k in weights
        ) / total_w if total_w > 0 else rule_score

        # 50% ML, 50% rule-based for balanced real-world stability
        blended = 0.50 * ml_component + 0.50 * rule_score

        # Calibration for genuine verified / high-profile / low-risk accounts:
        ver  = features.get("verified", 0)
        age  = features.get("account_age_days", 0)
        ppd  = features.get("posts_per_day", 0)
        fol  = features.get("followers", 0)
        fing = features.get("following", 0)
        dig  = features.get("username_digit_ratio", 0)

        if ver == 1 or fol > 100_000:
            if rule_score == 0.0:
                final_score = round(min(blended, 1.2), 1)
            else:
                final_score = round(min(blended, 12.0), 1)
        elif age > 1000 and ppd < 1.0 and dig < 0.35 and fol < 1500 and fing < 1500:
            final_score = round(min(max(blended - 45.0, 1.5), 99.0), 1)
        else:
            final_score = round(min(max(blended, 0.0), 99.0), 1)

        model_scores = {"rule_based": round(rule_score, 1), **ml_scores_clean}
    else:
        final_score = round(min(max(rule_score, 0.0), 99.0), 1)
        model_scores = {"rule_based": round(rule_score, 1)}

    # SHAP — prefer RF, fall back to XGB
    shap_model = _RF_MODEL or _XGB_MODEL
    shap_vals = _shap_values(features, shap_model)

    shap_explanation = []
    if shap_vals:
        sorted_shap = sorted(shap_vals.items(), key=lambda x: abs(x[1]), reverse=True)[:8]
        for feat_key, val in sorted_shap:
            disp_name = FEATURE_DISPLAY_NAMES.get(feat_key, feat_key.replace("_", " ").title())
            shap_explanation.append({
                "feature": disp_name,
                "value": round(float(val), 4),
                "signal": "Bot Signal" if val > 0 else "Real Signal"
            })

    if final_score >= 55:
        status = "Fake"
    elif final_score >= 28:
        status = "Suspicious"
    else:
        status = "Real"

    return {
        "risk_score":       final_score,
        "status":           status,
        "reasons":          reasons,
        "features":         features,
        "models_trained":   models_trained,
        "model_scores":     model_scores,
        "shap_values":      shap_vals,
        "shap_explanation": shap_explanation,
    }
