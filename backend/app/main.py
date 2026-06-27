from fastapi import FastAPI

app = FastAPI(
    title="Green Mobility API",
    version="1.0.0",
    description="Backend API for Green Mobility Incentive Platform",
)


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