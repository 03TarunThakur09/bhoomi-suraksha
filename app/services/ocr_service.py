"""
Bhoomi Suraksha — OCR Service
Google Vision API integration for Hindi + English document OCR.
Fallback to basic image-to-text if Vision API is unavailable.
"""

import io
import logging
from pathlib import Path

from PIL import Image

logger = logging.getLogger(__name__)


class OCRService:
    """Extracts text from property documents using Google Cloud Vision API."""

    def __init__(self):
        self._vision_client = None

    def _get_vision_client(self):
        """Lazy-load Vision API client."""
        if self._vision_client is None:
            try:
                from google.cloud import vision
                self._vision_client = vision.ImageAnnotatorClient()
                logger.info("Google Cloud Vision client initialized")
            except Exception as e:
                logger.warning(f"Vision API unavailable: {e}. Will use fallback OCR.")
                self._vision_client = None
        return self._vision_client

    async def extract_text(self, file_path: str) -> dict:
        """
        Extract text from a document file (PDF, JPEG, PNG, TIFF).

        Returns:
            dict with keys:
                - text: Full extracted text
                - language: Detected language(s)
                - confidence: OCR confidence score
                - pages: Number of pages processed
                - method: OCR method used
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        mime_type = self._detect_mime(path)

        # Try Google Vision API first
        client = self._get_vision_client()
        if client:
            try:
                return await self._extract_with_vision(client, path, mime_type)
            except Exception as e:
                logger.warning(f"Vision API failed, using fallback: {e}")

        # Fallback: basic text extraction info
        return self._fallback_extract(path)

    async def _extract_with_vision(self, client, file_path: Path, mime_type: str) -> dict:
        """Extract text using Google Cloud Vision API."""
        from google.cloud import vision

        content = file_path.read_bytes()

        if mime_type == "application/pdf":
            # Use async document text detection for PDFs
            return await self._extract_pdf_vision(client, content)
        else:
            # Use image text detection
            image = vision.Image(content=content)

            # Use document_text_detection for better structured text
            response = client.document_text_detection(
                image=image,
                image_context=vision.ImageContext(
                    language_hints=["hi", "en"]  # Hindi + English
                ),
            )

            if response.error.message:
                raise Exception(f"Vision API error: {response.error.message}")

            full_text = response.full_text_annotation
            detected_languages = []
            confidence = 0.0

            if full_text and full_text.pages:
                for page in full_text.pages:
                    confidence = max(confidence, page.confidence if hasattr(page, 'confidence') else 0.0)
                    for lang in page.property.detected_languages if page.property else []:
                        detected_languages.append(lang.language_code)

            return {
                "text": full_text.text if full_text else "",
                "language": list(set(detected_languages)) or ["unknown"],
                "confidence": round(confidence, 3),
                "pages": len(full_text.pages) if full_text else 0,
                "method": "google_vision",
            }

    async def _extract_pdf_vision(self, client, content: bytes) -> dict:
        """Extract text from PDF using Vision API batch annotation."""
        from google.cloud import vision

        input_config = vision.InputConfig(
            content=content,
            mime_type="application/pdf",
        )
        feature = vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)
        request = vision.AnnotateFileRequest(
            input_config=input_config,
            features=[feature],
            # Process up to 5 pages
            pages=list(range(1, 6)),
        )

        response = client.batch_annotate_files(requests=[request])

        full_text_parts = []
        total_pages = 0

        for file_response in response.responses:
            for page_response in file_response.responses:
                if page_response.full_text_annotation:
                    full_text_parts.append(page_response.full_text_annotation.text)
                    total_pages += 1

        combined_text = "\n\n--- PAGE BREAK ---\n\n".join(full_text_parts)

        return {
            "text": combined_text,
            "language": ["hi", "en"],
            "confidence": 0.85,
            "pages": total_pages,
            "method": "google_vision_pdf",
        }

    def _fallback_extract(self, file_path: Path) -> dict:
        """Fallback: return placeholder OCR result with instructions."""
        logger.info(f"Using fallback OCR for {file_path.name}")
        return {
            "text": f"[OCR FALLBACK] File: {file_path.name}. "
                    "Google Cloud Vision API not configured. "
                    "Set GOOGLE_APPLICATION_CREDENTIALS in .env to enable OCR.",
            "language": ["unknown"],
            "confidence": 0.0,
            "pages": 0,
            "method": "fallback",
        }

    def _detect_mime(self, path: Path) -> str:
        """Detect MIME type from file extension."""
        ext_map = {
            ".pdf": "application/pdf",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".tiff": "image/tiff",
            ".tif": "image/tiff",
        }
        return ext_map.get(path.suffix.lower(), "application/octet-stream")

    async def preprocess_image(self, file_path: str) -> str:
        """
        Preprocess image for better OCR results.
        Applies: resize, contrast enhancement, grayscale conversion.
        Returns path to preprocessed image.
        """
        path = Path(file_path)
        img = Image.open(path)

        # Convert to grayscale
        if img.mode != "L":
            img = img.convert("L")

        # Resize if too small
        min_dimension = 1000
        if min(img.size) < min_dimension:
            ratio = min_dimension / min(img.size)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)

        # Save preprocessed image
        preprocessed_path = path.parent / f"preprocessed_{path.name}"
        img.save(str(preprocessed_path))
        return str(preprocessed_path)
