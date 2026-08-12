from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from app.ml.fake_detector import classify_profile
from app.database import get_db
from app.services.twitter_service import fetch_twitter_profile

router = APIRouter()

class ProfileRequest(BaseModel):
    username: str
    platform: str
    followers: int = 0
    following: int = 0
    posts: int = 0
    bio: str = ""
    account_age_days: int = 0
    avg_hashtags: float = 0
    likes_per_post: float = 0
    posts_per_day: float = 0
    verified: bool = False

async def run_analysis(profile: dict, db) -> dict:
    result = classify_profile(profile)
    doc = {
        "username": profile["username"],
        "platform": profile["platform"],
        "risk_score": result["risk_score"],
        "status": result["status"],
        "analyzed_at": datetime.utcnow().isoformat(),
        "model_scores": result["model_scores"],
    }
    await db.analyses.insert_one(doc)
    return {
        "username": profile["username"],
        "name": profile.get("name", profile["username"]),
        "platform": profile["platform"],
        "followers": profile.get("followers", 0),
        "following": profile.get("following", 0),
        "posts": profile.get("posts", 0),
        "bio": profile.get("bio", ""),
        "account_age_days": profile.get("account_age_days", 0),
        "verified": profile.get("verified", False),
        "location": profile.get("location", "Unknown"),
        "profile_image": profile.get("profile_image", ""),
        "risk_score": result["risk_score"],
        "status": result["status"],
        "reasons": result["reasons"],
        "features": result["features"],
        "models_trained": result.get("models_trained", False),
        "model_scores": result["model_scores"],
        "shap_values": result.get("shap_values"),
        "shap_explanation": result.get("shap_explanation", []),
        "recent_posts": profile.get("recent_posts", []),
        "data_source": profile.get("dataset_source", "manual"),
        "matched_from_dataset": profile.get("dataset_source") == "cresci_2017_synthetic",
        "from_twitter_api": profile.get("dataset_source") in ["live_twitter", "twitter_api_live"],
    }

@router.get("/search/{username}")
async def search_profile(username: str):
    db = get_db()
    clean = username.lstrip("@").lower().strip()

    # Step 1 — Try fetching live Twitter profile first
    twitter_profile = fetch_twitter_profile(clean)
    if twitter_profile.get("found"):
        return {"found": True, "profile": twitter_profile, "source": "twitter_api"}

    # Step 2 — Search MongoDB benchmark dataset (for synthetic bot presets)
    db_profile = await db.profiles.find_one(
        {"username": {"$regex": "^" + clean + "$", "$options": "i"}},
        {"_id": 0}
    )
    if db_profile:
        return {"found": True, "profile": db_profile, "source": "database"}

    return {"found": False, "username": clean, "error": twitter_profile.get("error", "Not found on Twitter/X")}

@router.post("/profile")
async def analyze_profile(data: ProfileRequest):
    db = get_db()
    try:
        clean = data.username.lstrip("@").lower().strip()

        # Step 1 — Fetch live Twitter profile first
        twitter_profile = fetch_twitter_profile(clean)
        if twitter_profile.get("found"):
            result = await run_analysis(twitter_profile, db)
            return result

        # Step 2 — Search MongoDB benchmark dataset
        db_profile = await db.profiles.find_one(
            {"username": {"$regex": "^" + clean + "$", "$options": "i"}},
            {"_id": 0}
        )
        if db_profile:
            result = await run_analysis(db_profile, db)
            return result

        # Step 3 — Use manual data
        profile = data.dict()
        profile["username"] = clean
        result = await run_analysis(profile, db)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_history():
    db = get_db()
    cursor = db.analyses.find({}, {"_id": 0}).sort("analyzed_at", -1).limit(20)
    results = await cursor.to_list(length=20)
    return results

@router.get("/profiles/list")
async def list_profiles():
    db = get_db()
    cursor = db.profiles.find({}, {"_id": 0, "username": 1, "platform": 1, "label": 1, "followers": 1}).limit(50)
    results = await cursor.to_list(length=50)
    return results

@router.get("/twitter-bots")
async def get_twitter_bots():
    """Fetch all verified bot accounts active on Twitter/X with risk classifications."""
    db = get_db()
    try:
        cursor = db.profiles.find(
            {"label": "bot", "platform": {"$regex": "^twitter$", "$options": "i"}},
            {"_id": 0}
        ).limit(100)
        bot_list = await cursor.to_list(length=100)

        # Classify each bot profile with risk scores
        results = []
        for p in bot_list:
            res = classify_profile(p)
            results.append({
                "username": "@" + p["username"],
                "name": p.get("name", p["username"]),
                "platform": "Twitter",
                "followers": p.get("followers", 0),
                "following": p.get("following", 0),
                "posts": p.get("posts", 0),
                "bio": p.get("bio", ""),
                "account_age_days": p.get("account_age_days", 0),
                "risk_score": res["risk_score"],
                "status": res["status"],
                "location": p.get("location", "Unknown"),
                "reasons": res["reasons"],
                "recent_posts": p.get("recent_posts", []),
                "dataset_source": p.get("dataset_source", "cresci_2017_synthetic"),
            })

        return {
            "total": len(results),
            "platform": "Twitter",
            "bots": results
        }
    except Exception as e:
        return {
            "total": 0,
            "platform": "Twitter",
            "error": str(e),
            "bots": []
        }

@router.get("/bots")
async def get_bots_by_platform(platform: str = "Twitter"):
    """Fetch bot accounts filtered by platform (Twitter, Instagram, etc.)."""
    db = get_db()
    try:
        cursor = db.profiles.find(
            {"label": "bot", "platform": {"$regex": "^" + platform + "$", "$options": "i"}},
            {"_id": 0}
        ).limit(100)
        bot_list = await cursor.to_list(length=100)

        results = []
        for p in bot_list:
            res = classify_profile(p)
            results.append({
                "username": "@" + p["username"],
                "platform": p.get("platform", platform),
                "followers": p.get("followers", 0),
                "following": p.get("following", 0),
                "posts": p.get("posts", 0),
                "bio": p.get("bio", ""),
                "account_age_days": p.get("account_age_days", 0),
                "risk_score": res["risk_score"],
                "status": res["status"],
                "location": p.get("location", "Unknown"),
                "reasons": res["reasons"],
                "recent_posts": p.get("recent_posts", []),
            })

        return {
            "total": len(results),
            "platform": platform,
            "bots": results
        }
    except Exception as e:
        return {"total": 0, "platform": platform, "error": str(e), "bots": []}
