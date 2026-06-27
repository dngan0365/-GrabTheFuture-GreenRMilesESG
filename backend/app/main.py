from fastapi import FastAPI

from app.routers import prediction, recommendation

app = FastAPI(
    title="Green Mobility API",
    version="1.0.0",
    description="Backend API for Green Mobility Incentive Platform",
)

API_PREFIX = "/api/v1"

# AI feature routes (Sections 11 & 12).
app.include_router(prediction.router, prefix=API_PREFIX)
app.include_router(recommendation.router, prefix=API_PREFIX)


@app.get("/")
async def root():
    return {
        "message": "Green Mobility API is running"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy"
    }