"""
Bhoomi Suraksha — Pydantic Schemas
Request/Response models for API endpoints.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ── Auth Schemas ──────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: str | None
    subscription_tier: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Document Schemas ──────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    document_type: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int


# ── Entity Extraction Schemas ─────────────────────────────────

class PropertyAddress(BaseModel):
    village: str | None = None
    village_hindi: str | None = None
    tehsil: str | None = None
    district: str | None = None
    state: str | None = None
    pin_code: str | None = None


class OwnerInfo(BaseModel):
    name: str | None = None
    name_hindi: str | None = None
    father_name: str | None = None
    relationship: str | None = None  # seller, buyer, witness


class ExtractedEntities(BaseModel):
    document_type: str | None = None
    document_type_hindi: str | None = None
    owners: list[OwnerInfo] = []
    khasra_number: str | None = None
    gata_number: str | None = None
    khata_number: str | None = None
    plot_area: str | None = None
    plot_area_unit: str | None = None  # bigha, biswa, sq_ft, sq_m
    registration_number: str | None = None
    registration_date: str | None = None
    stamp_duty: str | None = None
    property_address: PropertyAddress | None = None
    additional_details: dict = {}
    confidence: float = 0.0


# ── Analyze & Narration Schemas ───────────────────────────────

class AnalyzeResponse(BaseModel):
    document_id: str
    document_type: str | None = None
    entities: dict
    confidence: float


class EntitiesResponse(BaseModel):
    document_id: str
    document_type: str | None = None
    entities: dict
    confidence: float


class NarrationResponse(BaseModel):
    document_id: str
    narration: str


# ── Health Check ──────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
