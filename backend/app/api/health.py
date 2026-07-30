from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "service": "roadguardian-api"}
