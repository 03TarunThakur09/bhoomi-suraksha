"""
Bhoomi Suraksha — Documents API
Upload, list, delete, analyze, and narrate property documents.
"""

import logging
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.models import Document, EntityExtraction, User
from app.schemas.schemas import (
    AnalyzeResponse,
    DocumentListResponse,
    DocumentResponse,
    EntitiesResponse,
    NarrationResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["Documents"])

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/tiff",
}


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a property document (PDF, JPEG, PNG, TIFF)."""
    # Validate file type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' not allowed. Allowed: PDF, JPEG, PNG, TIFF",
        )

    # Validate file size
    content = await file.read()
    file_size = len(content)
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_file_size_mb}MB",
        )

    # Save file to disk
    file_ext = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    user_upload_dir = settings.upload_path / current_user.id
    user_upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = user_upload_dir / unique_filename

    with open(file_path, "wb") as f:
        f.write(content)

    # Create database record
    document = Document(
        user_id=current_user.id,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=file_size,
        mime_type=file.content_type,
        status="uploaded",
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)
    return document


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all documents for the current user."""
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()
    return DocumentListResponse(documents=documents, total=len(documents))


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific document."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a document and its file."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file from disk
    file_path = Path(document.file_path)
    if file_path.exists():
        file_path.unlink()

    await db.delete(document)


# ── Analyze Endpoint ─────────────────────────────────────────

@router.post("/{document_id}/analyze", response_model=AnalyzeResponse)
async def analyze_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Analyze a document: run OCR + AI entity extraction.
    Saves extracted entities to the database and returns them.
    """
    # Get the document
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Update status to processing
    document.status = "processing"
    await db.flush()

    try:
        # Step 1: Run OCR
        from app.services.ocr_service import OCRService
        ocr_service = OCRService()
        ocr_result = await ocr_service.extract_text(document.file_path)
        # OCR service returns a dict with "text" key — extract the string
        ocr_text = ocr_result["text"] if isinstance(ocr_result, dict) else str(ocr_result)
        document.ocr_text = ocr_text
        logger.info(f"OCR complete for document {document_id}: {len(ocr_text)} chars")

        # Step 2: Run entity extraction
        from app.services.entity_extractor import GeminiEntityExtractor
        extractor = GeminiEntityExtractor()
        entities = await extractor.extract_entities(ocr_text)

        # Step 3: Save to database
        entity_dict = entities.model_dump()

        # Update document type from extraction
        document.document_type = entities.document_type
        document.status = "completed"

        # Check if entity extraction already exists for this document
        existing = await db.execute(
            select(EntityExtraction).where(EntityExtraction.document_id == document_id)
        )
        existing_entity = existing.scalar_one_or_none()

        if existing_entity:
            existing_entity.extracted_data = entity_dict
            existing_entity.document_type_detected = entities.document_type
            existing_entity.confidence_score = entities.confidence
        else:
            entity_record = EntityExtraction(
                document_id=document_id,
                extracted_data=entity_dict,
                document_type_detected=entities.document_type,
                confidence_score=entities.confidence,
            )
            db.add(entity_record)

        await db.flush()

        return AnalyzeResponse(
            document_id=document_id,
            document_type=entities.document_type,
            entities=entity_dict,
            confidence=entities.confidence,
        )

    except Exception as e:
        logger.error(f"Analysis failed for document {document_id}: {e}")
        document.status = "failed"
        await db.flush()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# ── Get Entities Endpoint ────────────────────────────────────

@router.get("/{document_id}/entities", response_model=EntitiesResponse)
async def get_entities(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get saved extracted entities for a document."""
    # Verify document belongs to user
    doc_result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    document = doc_result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get entities
    result = await db.execute(
        select(EntityExtraction)
        .where(EntityExtraction.document_id == document_id)
        .order_by(EntityExtraction.created_at.desc())
    )
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(
            status_code=404,
            detail="No entities found. Please analyze the document first.",
        )

    return EntitiesResponse(
        document_id=document_id,
        document_type=entity.document_type_detected,
        entities=entity.extracted_data,
        confidence=entity.confidence_score or 0.0,
    )


# ── Narration Endpoint ──────────────────────────────────────

@router.post("/{document_id}/narrate", response_model=NarrationResponse)
async def narrate_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate AI narration text about the document for text-to-speech."""
    # Verify document belongs to user
    doc_result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    document = doc_result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get entities
    result = await db.execute(
        select(EntityExtraction)
        .where(EntityExtraction.document_id == document_id)
        .order_by(EntityExtraction.created_at.desc())
    )
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(
            status_code=404,
            detail="No entities found. Please analyze the document first.",
        )

    # Generate narration
    from app.services.narration_service import NarrationService
    narration_service = NarrationService()
    narration = await narration_service.generate_narration(
        entities=entity.extracted_data,
        ocr_text=document.ocr_text or "",
    )

    return NarrationResponse(
        document_id=document_id,
        narration=narration,
    )


# ── Text-to-Speech (Gemini TTS) Endpoint ─────────────────────

@router.post("/{document_id}/tts")
async def generate_tts(
    document_id: str,
    voice: str = Query(default="Kore", description="Gemini TTS voice name"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate AI speech audio for a document's narration using Gemini 2.5 Flash TTS.
    Returns WAV audio file.

    Available voices: Kore (firm), Puck (upbeat), Charon (warm), Aoede, Leda,
    Fenrir, Orus, Zephyr, Achernar, Alnilam, and more.
    """
    # Verify document belongs to user
    doc_result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    document = doc_result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get entities for narration
    result = await db.execute(
        select(EntityExtraction)
        .where(EntityExtraction.document_id == document_id)
        .order_by(EntityExtraction.created_at.desc())
    )
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(
            status_code=404,
            detail="No entities found. Please analyze the document first.",
        )

    # Step 1: Generate narration text (or reuse if already generated)
    from app.services.narration_service import NarrationService
    narration_service = NarrationService()
    narration_text = await narration_service.generate_narration(
        entities=entity.extracted_data,
        ocr_text=document.ocr_text or "",
    )

    if not narration_text:
        raise HTTPException(status_code=500, detail="Failed to generate narration text")

    # Step 2: Generate TTS audio using Gemini 2.5 Flash TTS
    try:
        audio_bytes = await narration_service.generate_audio(
            narration_text=narration_text,
            voice=voice,
        )
    except Exception as e:
        logger.error(f"TTS generation failed for document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={
            "Content-Disposition": f'inline; filename="narration_{document_id}.wav"',
        },
    )
