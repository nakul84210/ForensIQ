import re
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from datetime import datetime, timezone
from app.ml.fake_detector import classify_profile
from app.ml.narrator import generate_narrative
from app.services.pdf_service import generate_forensic_pdf
from app.database import get_db
from app.services.twitter_service import fetch_twitter_profile
from app.config import settings
from app.routers.network import invalidate_graph_cache

router = APIRouter()

class ProfileRequest(BaseModel):
    username: str
    platform: str = "Twitter"
    followers: int = 0
    following: int = 0
    posts: int = 0
    bio: str = ""
    account_age_days: int = 0
    avg_hashtags: float = 0
    likes_per_post: float = 0
    posts_per_day: float = 0
    verified: bool = False

class NarrateRequest(BaseModel):
    regenerate: bool = False

async def _find_analysis_doc(analysis_id: str, db):
    """Locate analysis document by ObjectId, custom ID, or username."""
    clean_id = (analysis_id or "").strip()
    if not clean_id:
        return None

    # 1. Try 24-char ObjectId
    if len(clean_id) == 24:
        try:
            doc = await db.analyses.find_one({"_id": ObjectId(clean_id)})
            if doc:
                return doc
        except Exception:
            pass

    # 2. Try stored 'id' or 'analysis_id'
    doc = await db.analyses.find_one({"$or": [{"id": clean_id}, {"analysis_id": clean_id}]})
    if doc:
        return doc

    # 3. Try username lookup (fetch most recent)
    clean_user = clean_id.lstrip("@").lower()
    doc = await db.analyses.find_one(
        {"username": {"$regex": f"^{re.escape(clean_user)}$", "$options": "i"}},
        sort=[("analyzed_at", -1)]
    )
    return doc

async def run_analysis(profile: dict, db) -> dict:
    result = classify_profile(profile)
    doc = {
        "username": profile["username"],
        "name": profile.get("name", profile["username"]),
        "platform": profile.get("platform", "Twitter"),
        "risk_score": result["risk_score"],
        "status": result["status"],
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "model_scores": result["model_scores"],
        "followers": profile.get("followers", 0),
        "following": profile.get("following", 0),
        "posts": profile.get("posts", 0),
        "bio": profile.get("bio", ""),
        "account_age_days": profile.get("account_age_days", 0),
        "verified": profile.get("verified", False),
        "location": profile.get("location", "Unknown"),
        "profile_image": profile.get("profile_image", ""),
        "avg_hashtags": profile.get("avg_hashtags", 0.0),
        "likes_per_post": profile.get("likes_per_post", 0.0),
        "posts_per_day": profile.get("posts_per_day", 0.0),
        # recent_posts is the field Louvain similarity uses — must be persisted.
        # Scrapers that resolve only user metadata (fxTwitter, OG-meta, RapidAPI)
        # will have already been supplemented by a Syndication backfill call in
        # fetch_twitter_profile(); if that also failed, this is []
        "recent_posts": profile.get("recent_posts") or [],
        "scrape_strategy": profile.get("dataset_source") or profile.get("source") or "manual",
        "reasons": result["reasons"],
        "shap_explanation": result.get("shap_explanation", []),
        "features": result.get("features", {}),
        "engagement_data_available": result.get("engagement_data_available", True),
        "blend_description": result.get("blend_description", ""),
        "narrative": None,
    }
    insert_res = await db.analyses.insert_one(doc)
    doc_id = str(insert_res.inserted_id)
    rpt_id = f"RPT-{doc_id[-6:].upper()}"
    await db.analyses.update_one({"_id": insert_res.inserted_id}, {"$set": {"id": rpt_id, "analysis_id": doc_id}})
    # Bust the network graph cache — new data means new potential edges/clusters
    invalidate_graph_cache()

    return {
        "id": doc_id,
        "analysis_id": doc_id,
        "report_id": rpt_id,
        "username": profile["username"],
        "name": profile.get("name", profile["username"]),
        "platform": profile.get("platform", "Twitter"),
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
        "blend_description": result.get("blend_description", ""),
        "shap_values": result.get("shap_values"),
        "shap_explanation": result.get("shap_explanation", []),
        "recent_posts": profile.get("recent_posts", []),
        "data_source": profile.get("dataset_source", "manual"),
        "matched_from_dataset": profile.get("dataset_source") in ["cresci_2017_synthetic", "synthetic_demo"],
        "from_twitter_api": profile.get("dataset_source") in ["live_twitter", "twitter_api_live"],
        "engagement_data_available": result.get("engagement_data_available", True),
        "narrative": None,
    }

@router.get("/search/{username}")
async def search_profile(username: str):
    db = get_db()
    clean = username.lstrip("@").lower().strip()
    if not clean:
        return {"found": False, "username": "", "error": "Invalid username specified"}

    # Step 1 — Try fetching live Twitter profile first
    twitter_profile = fetch_twitter_profile(clean)
    if twitter_profile.get("found"):
        return {"found": True, "profile": twitter_profile, "source": "twitter_api"}

    # Step 2 — Search MongoDB benchmark dataset (for synthetic bot presets) safely with escaped regex
    escaped_clean = re.escape(clean)
    db_profile = await db.profiles.find_one(
        {"username": {"$regex": f"^{escaped_clean}$", "$options": "i"}},
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
        if not clean:
            raise HTTPException(status_code=400, detail="Username cannot be empty")

        # Step 1 — Fetch live Twitter profile first
        twitter_profile = fetch_twitter_profile(clean)
        if twitter_profile.get("found"):
            result = await run_analysis(twitter_profile, db)
            return result

        # Step 2 — Search MongoDB benchmark dataset safely
        escaped_clean = re.escape(clean)
        db_profile = await db.profiles.find_one(
            {"username": {"$regex": f"^{escaped_clean}$", "$options": "i"}},
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

    except HTTPException:
        raise
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
        escaped_platform = re.escape(platform)
        cursor = db.profiles.find(
            {"label": "bot", "platform": {"$regex": f"^{escaped_platform}$", "$options": "i"}},
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

@router.get("/threats")
async def get_threat_feed():
    """Fetch live threat intelligence feed from real analysis results.

    Returns the most-recent analysis per unique username (deduplication by username,
    latest analyzed_at wins). Returns real fields only: status, risk_score, reasons.
    No fabricated category labels.
    """
    db = get_db()
    try:
        # Fetch all Fake/Suspicious records sorted newest-first.
        # We over-fetch (200) so deduplication still leaves a useful list.
        cursor = db.analyses.find(
            {"status": {"$in": ["Fake", "Suspicious"]}},
            {"_id": 0}
        ).sort("analyzed_at", -1).limit(200)
        all_threats = await cursor.to_list(length=200)

        # Deduplicate: keep only the most-recent record per username.
        # Also track how many times each username appears so we can surface that
        # as an honest, informative field ("analyzed_count").
        seen: dict = {}       # username -> most-recent doc (already first due to sort)
        counts: dict = {}     # username -> total matching records

        for t in all_threats:
            uname = t.get("username", "")
            key = uname.lower().lstrip("@")
            counts[key] = counts.get(key, 0) + 1
            if key not in seen:
                seen[key] = t   # first occurrence = most recent (sorted desc)

        formatted = []
        for idx, (key, t) in enumerate(seen.items()):
            uname = t.get("username", "")
            if not uname.startswith("@"):
                uname = "@" + uname

            status = t.get("status", "Fake")
            risk = round(t.get("risk_score", 0), 1)
            reasons = t.get("reasons", [])
            analyze_count = counts.get(key, 1)

            formatted.append({
                "id": f"THR-{idx + 1:03d}",
                "username": uname,
                "platform": t.get("platform", "Twitter"),
                "status": status,
                "risk_score": risk,
                "reasons": reasons,
                "analyzed_at": t.get("analyzed_at", ""),
                "analyze_count": analyze_count,
                "isNew": idx < 3,
            })

        return {
            "total": len(formatted),
            "threats": formatted,
            "is_empty": len(formatted) == 0,
        }
    except Exception as e:
        return {"total": 0, "threats": [], "error": str(e), "is_empty": True}

@router.post("/{analysis_id}/narrate")
async def generate_or_get_narrative(analysis_id: str, body: NarrateRequest = NarrateRequest()):
    """
    Generate or retrieve an AI forensic intelligence narrative for a stored analysis.
    Uses Anthropic Claude API. Caches the result in db.analyses to prevent duplicate calls.
    """
    db = get_db()
    doc = await _find_analysis_doc(analysis_id, db)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Analysis '{analysis_id}' not found.")

    # Return cached narrative unless regeneration was explicitly requested
    if doc.get("narrative") and not body.regenerate:
        return {
            "success": True,
            "narrative": doc["narrative"],
            "cached": True,
            "analysis_id": str(doc.get("_id", analysis_id))
        }

    profile = {
        "username": doc.get("username", "unknown"),
        "name": doc.get("name", ""),
        "platform": doc.get("platform", "Twitter"),
        "followers": doc.get("followers", 0),
        "following": doc.get("following", 0),
        "posts": doc.get("posts", 0),
        "bio": doc.get("bio", ""),
        "location": doc.get("location", "Unknown"),
        "account_age_days": doc.get("account_age_days", 0),
        "verified": doc.get("verified", False),
    }
    classify_result = {
        "risk_score": doc.get("risk_score", 0.0),
        "status": doc.get("status", "Unknown"),
        "reasons": doc.get("reasons", []),
        "model_scores": doc.get("model_scores", {}),
        "shap_explanation": doc.get("shap_explanation", []),
        "features": doc.get("features", {}),
        "engagement_data_available": doc.get("engagement_data_available", True),
    }

    try:
        narrative = generate_narrative(profile, classify_result)
        await db.analyses.update_one(
            {"_id": doc["_id"]},
            {"$set": {"narrative": narrative, "narrative_updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {
            "success": True,
            "narrative": narrative,
            "cached": False,
            "analysis_id": str(doc["_id"])
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{analysis_id}/report.pdf")
async def download_analysis_pdf(analysis_id: str):
    """
    Generate and download a comprehensive Forensic Intelligence Dossier PDF.
    Includes profile summary, risk status, model scores, SHAP explanations,
    rule flags, and AI narrative (generated if key is available).
    """
    db = get_db()
    doc = await _find_analysis_doc(analysis_id, db)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Analysis '{analysis_id}' not found.")

    profile = {
        "username": doc.get("username", "unknown"),
        "name": doc.get("name", ""),
        "platform": doc.get("platform", "Twitter"),
        "followers": doc.get("followers", 0),
        "following": doc.get("following", 0),
        "posts": doc.get("posts", 0),
        "location": doc.get("location", "Unknown"),
        "account_age_days": doc.get("account_age_days", 0),
        "verified": doc.get("verified", False),
        "analyzed_at": doc.get("analyzed_at"),
    }
    classify_result = {
        "risk_score": doc.get("risk_score", 0.0),
        "status": doc.get("status", "Unknown"),
        "reasons": doc.get("reasons", []),
        "model_scores": doc.get("model_scores", {}),
        "shap_explanation": doc.get("shap_explanation", []),
        "features": doc.get("features", {}),
        "engagement_data_available": doc.get("engagement_data_available", True),
    }

    narrative = doc.get("narrative")
    # If narrative is missing and any narration API key is available, attempt to generate it.
    # Narrator tries Groq first, then Anthropic — check either key.
    _has_narration_key = (settings.GROQ_API_KEY or "").strip() or (settings.ANTHROPIC_API_KEY or "").strip()
    if not narrative and _has_narration_key:
        try:
            narrative = generate_narrative(profile, classify_result)
            await db.analyses.update_one(
                {"_id": doc["_id"]},
                {"$set": {"narrative": narrative, "narrative_updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        except Exception:
            pass

    report_id_str = doc.get("id") or f"FIQ-{str(doc.get('_id', '0000'))[-6:].upper()}"
    pdf_bytes = generate_forensic_pdf(
        profile=profile,
        analysis_result=classify_result,
        narrative=narrative,
        report_id=report_id_str,
    )

    safe_username = re.sub(r'[^a-zA-Z0-9_-]', '_', doc.get("username", "account"))
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=ForensIQ_Report_{safe_username}.pdf"
        }
    )
