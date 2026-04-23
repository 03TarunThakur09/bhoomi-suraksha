"""
Bhoomi Suraksha — Multi-Engine OCR Service
Supports three engines: Gemini Vision, PaddleOCR, IndicOCR (EasyOCR/AI4Bharat).
"""

import asyncio
import io
import logging
from pathlib import Path

from PIL import Image

logger = logging.getLogger(__name__)


# ── PDF → Images helper ───────────────────────────────────────

def _pdf_to_images(file_path: Path) -> list[bytes]:
    """Convert PDF pages to PNG image bytes using PyMuPDF (max 5 pages)."""
    try:
        import fitz  # pymupdf
        doc = fitz.open(str(file_path))
        images = []
        for i in range(min(len(doc), 5)):
            page = doc[i]
            pix = page.get_pixmap(dpi=200)
            images.append(pix.tobytes("png"))
        doc.close()
        return images
    except ImportError:
        logger.warning("pymupdf not installed — cannot process PDF for this engine")
        return []


# ── Engine 1: Gemini Vision ───────────────────────────────────

class GeminiOCREngine:
    """OCR via Gemini Vision API (uses existing GEMINI_API_KEY, free tier)."""

    async def extract_text(self, file_path: Path) -> dict:
        from app.config import settings
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)

        if file_path.suffix.lower() == ".pdf":
            images = _pdf_to_images(file_path)
            if not images:
                return _empty_result("gemini_vision")

            parts = [
                types.Part.from_bytes(data=img, mime_type="image/png")
                for img in images
            ]
            parts.append(
                "Extract all text from these document images. "
                "Return only the raw text, preserving line breaks and structure."
            )
            response = await asyncio.to_thread(
                client.models.generate_content,
                model="gemini-1.5-flash",
                contents=parts,
            )
            pages = len(images)
        else:
            mime_map = {
                ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                ".png": "image/png", ".tiff": "image/tiff", ".tif": "image/tiff",
            }
            mime_type = mime_map.get(file_path.suffix.lower(), "image/jpeg")
            img_bytes = file_path.read_bytes()
            response = await asyncio.to_thread(
                client.models.generate_content,
                model="gemini-1.5-flash",
                contents=[
                    types.Part.from_bytes(data=img_bytes, mime_type=mime_type),
                    "Extract all text from this document image. "
                    "Return only the raw text, preserving line breaks and structure.",
                ],
            )
            pages = 1

        return {
            "text": response.text or "",
            "language": ["hi", "en"],
            "confidence": 0.9,
            "pages": pages,
            "method": "gemini_vision",
        }


# ── Engine 2: PaddleOCR ───────────────────────────────────────

class PaddleOCREngine:
    """OCR via PaddleOCR (open source, runs locally, no API key needed)."""

    def __init__(self):
        self._ocr = None

    def _get_ocr(self):
        if self._ocr is None:
            try:
                from paddleocr import PaddleOCR
                # lang='hi' uses PaddleOCR's Hindi Devanagari model
                self._ocr = PaddleOCR(use_angle_cls=True, lang="hi", use_gpu=False, show_log=False)
                logger.info("PaddleOCR initialized (Hindi model)")
            except ImportError:
                raise RuntimeError(
                    "PaddleOCR not installed. Run: pip install paddlepaddle paddleocr"
                )
        return self._ocr

    async def extract_text(self, file_path: Path) -> dict:
        ocr = self._get_ocr()

        if file_path.suffix.lower() == ".pdf":
            images = _pdf_to_images(file_path)
            if not images:
                return _empty_result("paddle_ocr")
            all_text, total_conf, count = [], 0.0, 0
            for img_bytes in images:
                lines, conf, n = _parse_paddle_result(
                    await asyncio.to_thread(ocr.ocr, img_bytes, cls=True)
                )
                all_text.extend(lines)
                all_text.append("\n--- PAGE BREAK ---\n")
                total_conf += conf
                count += n
            return {
                "text": "\n".join(all_text),
                "language": ["hi", "en"],
                "confidence": round(total_conf / max(count, 1), 3),
                "pages": len(images),
                "method": "paddle_ocr",
            }
        else:
            img_bytes = file_path.read_bytes()
            result = await asyncio.to_thread(ocr.ocr, img_bytes, cls=True)
            lines, total_conf, count = _parse_paddle_result(result)
            return {
                "text": "\n".join(lines),
                "language": ["hi", "en"],
                "confidence": round(total_conf / max(count, 1), 3),
                "pages": 1,
                "method": "paddle_ocr",
            }


def _parse_paddle_result(result) -> tuple[list[str], float, int]:
    lines, total_conf, count = [], 0.0, 0
    if result and result[0]:
        for line in result[0]:
            if line and len(line) >= 2:
                lines.append(line[1][0])
                total_conf += line[1][1]
                count += 1
    return lines, total_conf, count


# ── Engine 3: IndicOCR (AI4Bharat via EasyOCR) ───────────────

class IndicOCREngine:
    """
    OCR using EasyOCR with Hindi + English language models.
    Implements the AI4Bharat IndicOCR approach for Indian language documents.
    """

    def __init__(self):
        self._reader = None

    def _get_reader(self):
        if self._reader is None:
            try:
                import easyocr
                self._reader = easyocr.Reader(["hi", "en"], gpu=False)
                logger.info("IndicOCR (EasyOCR) reader initialized with Hindi + English")
            except ImportError:
                raise RuntimeError(
                    "EasyOCR not installed. Run: pip install easyocr"
                )
        return self._reader

    async def extract_text(self, file_path: Path) -> dict:
        reader = self._get_reader()

        if file_path.suffix.lower() == ".pdf":
            images = _pdf_to_images(file_path)
            if not images:
                return _empty_result("indic_ocr")
            all_text, total_conf, count = [], 0.0, 0
            for img_bytes in images:
                result = await asyncio.to_thread(reader.readtext, img_bytes)
                for detection in result:
                    all_text.append(detection[1])
                    total_conf += detection[2]
                    count += 1
                all_text.append("\n--- PAGE BREAK ---\n")
            return {
                "text": "\n".join(all_text),
                "language": ["hi", "en"],
                "confidence": round(total_conf / max(count, 1), 3),
                "pages": len(images),
                "method": "indic_ocr",
            }
        else:
            img_bytes = file_path.read_bytes()
            result = await asyncio.to_thread(reader.readtext, img_bytes)
            lines, total_conf, count = [], 0.0, 0
            for detection in result:
                lines.append(detection[1])
                total_conf += detection[2]
                count += 1
            return {
                "text": "\n".join(lines),
                "language": ["hi", "en"],
                "confidence": round(total_conf / max(count, 1), 3),
                "pages": 1,
                "method": "indic_ocr",
            }


# ── OCR Service Factory ───────────────────────────────────────

VALID_ENGINES = {"gemini", "paddle", "indic"}


class OCRService:
    """Factory — picks the right OCR engine based on the caller's choice."""

    def __init__(self, engine: str = "gemini"):
        if engine not in VALID_ENGINES:
            logger.warning(f"Unknown OCR engine '{engine}', falling back to gemini")
            engine = "gemini"
        self.engine = engine
        if engine == "gemini":
            self._impl = GeminiOCREngine()
        elif engine == "paddle":
            self._impl = PaddleOCREngine()
        elif engine == "indic":
            self._impl = IndicOCREngine()

    async def extract_text(self, file_path: str) -> dict:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        return await self._impl.extract_text(path)


# ── Helpers ───────────────────────────────────────────────────

def _empty_result(method: str) -> dict:
    return {"text": "", "language": ["unknown"], "confidence": 0.0, "pages": 0, "method": method}
