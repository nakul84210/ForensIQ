from fastapi import APIRouter, UploadFile, File, HTTPException
from app.ml.image_analyzer import detect_deepfake

router = APIRouter()

@router.post("/detect")
async def detect(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    try:
        image_bytes = await file.read()
        filename = file.filename or ""
        result = detect_deepfake(image_bytes, filename=filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
