import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from fastapi import HTTPException

logger = logging.getLogger("forensiq")

client = None
db = None

async def connect_db():
    global client, db
    try:
        client = AsyncIOMotorClient(settings.MONGO_URL, serverSelectionTimeoutMS=3000)
        db = client[settings.DB_NAME]
        # Verify connection
        await client.admin.command('ping')
        logger.info("Connected to MongoDB successfully.")
    except Exception as e:
        logger.warning(f"MongoDB connection warning: {e}. Server is running in degraded mode.")

async def close_db():
    global client
    if client:
        client.close()
        logger.info("Disconnected from MongoDB")

def get_db():
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection is not available")
    return db
