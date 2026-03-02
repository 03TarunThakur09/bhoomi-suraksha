"""
Bhoomi Suraksha — FastAPI Application
Main application entry point with CORS, routing, and lifecycle events.
AI-powered property document analysis with entity extraction and narration.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.api import auth, documents, health

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.app_debug else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    logger.info("Starting Bhoomi Suraksha...")
    logger.info(f"Environment: {settings.app_env}")
    logger.info(f"Database: {settings.database_url.split('://')[0]}")
    logger.info(f"Gemini API: {'Configured' if settings.gemini_api_key else 'Not configured'}")

    # Create database tables
    await create_tables()
    logger.info("Database tables created")

    # Create upload directory
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    logger.info(f"Upload directory: {settings.upload_path}")

    logger.info("Bhoomi Suraksha is ready!")
    logger.info("=" * 60)

    yield

    # Shutdown
    logger.info("Shutting down Bhoomi Suraksha...")


# ── Create FastAPI App ────────────────────────────────────────

app = FastAPI(
    title="Bhoomi Suraksha",
    description=(
        "AI-powered property document analysis platform. "
        "Upload property documents, extract structured entities with AI, "
        "and listen to detailed audio narration about your documents."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS Middleware ───────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",   # Next.js dev
        "http://localhost:3000",
        "http://localhost:5173",   # Vite dev
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include Routers ──────────────────────────────────────────

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(documents.router)


# ── Root Endpoint ─────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "name": "Bhoomi Suraksha",
        "tagline": "Aapki Zameen, Aapki Suraksha",
        "version": "2.0.0",
        "description": "AI-powered property document analysis with entity extraction and audio narration",
        "docs": "/docs",
        "health": "/health",
        "features": [
            "Document upload (PDF, JPEG, PNG, TIFF)",
            "AI-powered entity extraction (Gemini)",
            "Detailed audio narration (Text-to-Speech)",
            "Hindi + English bilingual support",
        ],
    }
