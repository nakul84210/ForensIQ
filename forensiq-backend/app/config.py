from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "forensiq"
    SECRET_KEY: str = "forensiq-secret-key-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    TWITTER_BEARER_TOKEN: str = ""
    TWITTER_CONSUMER_KEY: str = ""
    TWITTER_CONSUMER_SECRET: str = ""
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_WORKSPACE_ID: str = ""
    ANTHROPIC_MODEL: str = "claude-3-7-sonnet-20250219"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "qwen/qwen3.8-27b"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
