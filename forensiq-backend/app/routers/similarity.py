from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.ml.similarity_engine import scan_similarity

router = APIRouter()

class ScanRequest(BaseModel):
    text: str
    threshold: float = 0.6

@router.post("/scan")
async def scan(data: ScanRequest):
    try:
        result = scan_similarity(data.text, data.threshold)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
