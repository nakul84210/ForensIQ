from fastapi import APIRouter, HTTPException
from app.database import get_db
from datetime import datetime, timezone
import logging

logger = logging.getLogger("forensiq")
router = APIRouter()

DEFAULT_MOCK_REPORTS = [
    {
        "id": "RPT-001",
        "username": "@shadow_bot_99",
        "platform": "Twitter",
        "risk_score": 96.0,
        "status": "Fake",
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "reasons": ["Abnormal follower-to-following ratio (1:50)", "Account age less than 60 days"],
    },
    {
        "id": "RPT-002",
        "username": "@crypto_pump_bot",
        "platform": "Twitter",
        "risk_score": 94.0,
        "status": "Fake",
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "reasons": ["Automated posting speed (>25 posts/day)", "Repetitive crypto hashtags"],
    },
    {
        "id": "RPT-003",
        "username": "@news_spreader",
        "platform": "Instagram",
        "risk_score": 78.0,
        "status": "Suspicious",
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "reasons": ["Copy-paste text similarity match", "Low organic engagement"],
    },
    {
        "id": "RPT-004",
        "username": "@verified_analyst_demo",
        "platform": "Twitter",
        "risk_score": 4.5,
        "status": "Real",
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "reasons": [],
    },
]

@router.get("/all")
async def get_all_reports():
    try:
        db = get_db()
        cursor = db.analyses.find({}).sort("analyzed_at", -1).limit(50)
        raw_results = await cursor.to_list(length=50)
        if raw_results and len(raw_results) > 0:
            formatted = []
            for idx, r in enumerate(raw_results):
                doc_id = str(r.get("_id", ""))
                rpt_id = r.get("id") or (f"RPT-{doc_id[-6:].upper()}" if doc_id else f"RPT-{idx+1:03d}")
                r["id"] = rpt_id
                r["analysis_id"] = doc_id or rpt_id
                if "_id" in r:
                    del r["_id"]
                formatted.append(r)
            return {"reports": formatted, "is_sample_data": False}
    except Exception as e:
        logger.warning(f"[reports] DB query error: {e}")
    # Explicitly flag mock data so the frontend displays sample data banner
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
        return {"total": 0, "fake": 0, "suspicious": 0, "real": 0, "is_sample_data": False}
    except Exception as e:
        logger.warning(f"[reports] Stats query error: {e}")
    return {"total": 0, "fake": 0, "suspicious": 0, "real": 0, "is_sample_data": True}
