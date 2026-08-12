from fastapi import APIRouter
import json
import os

router = APIRouter()

@router.get("/metrics")
async def get_metrics():
    try:
        metrics_path = os.path.join(os.path.dirname(__file__), "../ml/metrics.json")
        metrics_path = os.path.abspath(metrics_path)
        with open(metrics_path) as f:
            return json.load(f)
    except Exception as e:
        return {"error": str(e)}
