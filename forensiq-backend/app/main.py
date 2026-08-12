from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect_db, close_db
from app.routers import auth, analyze, reports, deepfake, similarity, credibility, metrics

app = FastAPI(
    title="ForensIQ API",
    description="Social Media Forensic Analysis Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["Analysis"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(deepfake.router, prefix="/api/deepfake", tags=["Deepfake"])
app.include_router(similarity.router, prefix="/api/similarity", tags=["Similarity"])
app.include_router(credibility.router, prefix="/api/credibility", tags=["Credibility"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["Metrics"])

@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await close_db()

@app.get("/")
async def root():
    return {"message": "ForensIQ API is running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
