from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.ml.credibility_engine import score_credibility

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
    verified: bool = False
    posts_per_day: float = 0
    location: str = "Unknown"

@router.post("/score")
async def score(data: ProfileRequest):
    try:
        result = score_credibility(data.dict())
        return {**result, "username": data.username, "platform": data.platform}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
