"""
Bhoomi Suraksha — Health Check API
"""

from fastapi import APIRouter
from app.schemas.schemas import HealthResponse
from app.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        environment=settings.app_env,
    )
