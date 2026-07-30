import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import predict, analytics, health
from app.core.logging_config import get_logger

logger = get_logger(__name__)

app = FastAPI(
    title="RoadGuardian AI API",
    description="Backend for the multi-agent road damage assessment system.",
    version="1.0.0"
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(predict.router)
app.include_router(analytics.router)

if __name__ == "__main__":
    import uvicorn
    # Start the main backend service on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
