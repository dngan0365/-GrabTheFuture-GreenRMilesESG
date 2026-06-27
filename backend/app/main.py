from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, auth, carbon, meta, rewards, rides
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for Green Mobility Incentive Platform",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(carbon.router, prefix="/api")
app.include_router(meta.router, prefix="/api")
app.include_router(rides.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(rewards.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "message": "Green Mobility API is running",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
