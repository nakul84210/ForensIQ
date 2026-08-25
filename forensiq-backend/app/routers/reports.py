from fastapi import APIRouter, HTTPException
from app.database import get_db
from datetime import datetime

router = APIRouter()

DEFAULT_MOCK_REPORTS = [
    {
        "id": "RPT-001",
        "username": "@shadow_bot_99",
        "platform": "Twitter",
        "risk_score": 96.0,
        "status": "Fake",
        "analyzed_at": datetime.utcnow().isoformat(),
        "reasons": ["Abnormal follower-to-following ratio (1:50)", "Account age less than 60 days"],
    },
    {
        "id": "RPT-002",
        "username": "@crypto_pump_bot",
        "platform": "Twitter",
        "risk_score": 94.0,
        "status": "Fake",
        "analyzed_at": datetime.utcnow().isoformat(),
        "reasons": ["Automated posting speed (>25 posts/day)", "Repetitive crypto hashtags"],
    },
    {
        "id": "RPT-003",
        "username": "@news_spreader",
        "platform": "Instagram",
        "risk_score": 78.0,
        "status": "Suspicious",
        "analyzed_at": datetime.utcnow().isoformat(),
        "reasons": ["Copy-paste text similarity match", "Low organic engagement"],
    },
    {
        "id": "RPT-004",
        "username": "@imvkohli",
        "platform": "Twitter",
        "risk_score": 1.2,
        "status": "Real",
        "analyzed_at": datetime.utcnow().isoformat(),
        "reasons": [],
    },
]

@router.get("/all")
async def get_all_reports():
    try:
        db = get_db()
        cursor = db.analyses.find({}, {"_id": 0}).sort("analyzed_at", -1).limit(50)
        results = await cursor.to_list(length=50)
        if results and len(results) > 0:
            return {"reports": results, "is_sample_data": False}
    except Exception as e:
        print(f"[reports] DB query failed: {e}")
    # Explicitly flag mock data so the frontend can display a banner
    return {"reports": DEFAULT_MOCK_REPORTS, "is_sample_data": True}

@router.get("/stats")
async def get_stats():
    try:
        db = get_db()
        total = await db.analyses.count_documents({})
        if total > 0:
            fake = await db.analyses.count_documents({"status": "Fake"})
            suspicious = await db.analyses.count_documents({"status": "Suspicious"})
            real = await db.analyses.count_documents({"status": "Real"})
            return {"total": total, "fake": fake, "suspicious": suspicious, "real": real, "is_sample_data": False}
    except Exception as e:
        print(f"[reports] Stats query failed: {e}")
    return {"total": 4, "fake": 2, "suspicious": 1, "real": 1, "is_sample_data": True}
