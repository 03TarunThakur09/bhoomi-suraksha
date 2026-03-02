"""
Bhoomi Suraksha — End-to-End Pipeline Test
Tests the full OCR → Entity Extraction → JSON Output pipeline
on sample Hindi property documents (Khasra/Khatauni).

Usage:
    # Test with the sample Khasra image:
    python tests/test_pipeline_e2e.py

    # Test with your own document:
    python tests/test_pipeline_e2e.py path/to/your/document.pdf

Output:
    - Prints OCR text to console
    - Prints extracted entities to console
    - Saves full results to tests/output/result_<timestamp>.json
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from app.services.ocr_service import OCRService
from app.services.entity_extractor import GeminiEntityExtractor
from app.services.trust_scorer import TrustScorer
from app.services.cross_verifier import CrossVerificationService


# ── Color helpers for terminal output ─────────────────
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"


def print_header(text: str):
    print(f"\n{BOLD}{CYAN}{'═' * 60}")
    print(f"  {text}")
    print(f"{'═' * 60}{RESET}\n")


def print_step(step: int, text: str):
    print(f"{BOLD}{GREEN}[Step {step}]{RESET} {text}")


def print_field(label: str, value, indent: int = 2):
    spaces = " " * indent
    if value:
        print(f"{spaces}{YELLOW}{label}:{RESET} {value}")


async def run_pipeline(file_path: str) -> dict:
    """Run the full OCR → Entity Extraction → Trust Score pipeline."""

    results = {
        "input_file": file_path,
        "timestamp": datetime.now().isoformat(),
        "ocr": {},
        "entities": {},
        "cross_verification": {},
        "trust_score": {},
    }

    # ── Step 1: OCR ──────────────────────────────────────
    print_header("Step 1: OCR — Extracting text from document")
    ocr_service = OCRService()

    try:
        ocr_result = await ocr_service.extract_text(file_path)
        ocr_text = ocr_result.get("text", "")
        ocr_method = ocr_result.get("method", "unknown")
        ocr_lang = ocr_result.get("languages", [])

        results["ocr"] = {
            "text": ocr_text,
            "method": ocr_method,
            "languages": ocr_lang,
            "character_count": len(ocr_text),
            "status": "success",
        }

        print_step(1, f"OCR Method: {ocr_method}")
        print_step(1, f"Languages Detected: {ocr_lang}")
        print_step(1, f"Characters Extracted: {len(ocr_text)}")
        print(f"\n{BOLD}--- OCR Output (raw text) ---{RESET}")
        print(ocr_text[:2000] if len(ocr_text) > 2000 else ocr_text)
        print(f"{BOLD}--- End OCR Output ---{RESET}\n")

    except Exception as e:
        print(f"{RED}OCR Failed: {e}{RESET}")
        print(f"{YELLOW}Falling back to Gemini vision for text extraction...{RESET}")

        # Fallback: Use Gemini to read the image directly
        try:
            from google import genai
            from google.genai import types

            api_key = os.getenv("GEMINI_API_KEY", "")
            if not api_key:
                raise ValueError("GEMINI_API_KEY not set")

            client = genai.Client(api_key=api_key)

            # Read image as bytes
            with open(file_path, "rb") as f:
                image_bytes = f.read()

            # Determine mime type
            ext = Path(file_path).suffix.lower()
            mime_map = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".tiff": "image/tiff", ".pdf": "application/pdf"}
            mime_type = mime_map.get(ext, "image/png")

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    "Read ALL text from this Indian property document image. The document is likely in Hindi (Devanagari script). Extract every single field, label, and value you can see. Output the complete raw text preserving the original structure as much as possible. Include all Hindi text exactly as written."
                ],
                config=types.GenerateContentConfig(temperature=0.1, max_output_tokens=4096),
            )

            ocr_text = response.text
            results["ocr"] = {
                "text": ocr_text,
                "method": "gemini_vision_fallback",
                "languages": ["hi", "en"],
                "character_count": len(ocr_text),
                "status": "success (gemini fallback)",
            }

            print_step(1, f"Gemini Vision OCR - Characters: {len(ocr_text)}")
            print(f"\n{BOLD}--- OCR Output (Gemini Vision) ---{RESET}")
            print(ocr_text)
            print(f"{BOLD}--- End OCR Output ---{RESET}\n")

        except Exception as e2:
            print(f"{RED}Gemini Vision Fallback also failed: {e2}{RESET}")
            results["ocr"]["status"] = f"failed: {e2}"
            return results

    if not ocr_text.strip():
        print(f"{RED}No text extracted from document. Aborting.{RESET}")
        return results

    # ── Step 2: Entity Extraction ────────────────────────
    print_header("Step 2: Gemini Entity Extraction")
    extractor = GeminiEntityExtractor()

    try:
        entities = await extractor.extract_entities(ocr_text)
        entities_dict = entities.model_dump(exclude_none=True)
        results["entities"] = entities_dict

        print_step(2, f"Extraction Confidence: {entities.confidence}")
        print_step(2, f"Document Type: {entities.document_type} ({entities.document_type_hindi or '-'})")
        print()

        # Print extracted fields
        print(f"{BOLD}  📋 Extracted Entities:{RESET}")
        print_field("Document Type", entities.document_type)
        print_field("Document Type (Hindi)", entities.document_type_hindi)
        print_field("Khasra Number", entities.khasra_number)
        print_field("Gata Number", entities.gata_number)
        print_field("Khata Number", entities.khata_number)
        print_field("Plot Area", f"{entities.plot_area} {entities.plot_area_unit or ''}")
        print_field("Registration No", entities.registration_number)
        print_field("Registration Date", entities.registration_date)
        print_field("Stamp Duty", entities.stamp_duty)
        print_field("Confidence", f"{entities.confidence:.2f}")

        if entities.owners:
            print(f"\n  {BOLD}👤 Owners/Parties:{RESET}")
            for i, owner in enumerate(entities.owners, 1):
                print(f"    Owner {i}:")
                print_field("Name", owner.name, 6)
                print_field("Name (Hindi)", owner.name_hindi, 6)
                print_field("Father's Name", owner.father_name, 6)
                print_field("Role", owner.relationship, 6)

        if entities.property_address:
            addr = entities.property_address
            print(f"\n  {BOLD}📍 Address:{RESET}")
            print_field("District", addr.district)
            print_field("Tehsil", addr.tehsil)
            print_field("Village", addr.village)
            print_field("Village (Hindi)", addr.village_hindi)
            print_field("State", addr.state)

        if entities.additional_details:
            print(f"\n  {BOLD}📎 Additional Details:{RESET}")
            for k, v in entities.additional_details.items():
                print_field(k, v)

    except Exception as e:
        print(f"{RED}Entity extraction failed: {e}{RESET}")
        results["entities"]["status"] = f"failed: {e}"
        return results

    # ── Step 3: Cross-Verification ───────────────────────
    print_header("Step 3: Cross-Verification (Government Portals)")
    cross_verifier = CrossVerificationService()

    try:
        verification_results = await cross_verifier.verify_all(entities_dict)
        verification_dict = cross_verifier.results_to_dict(verification_results)
        results["cross_verification"] = verification_dict

        for portal, result in verification_dict.items():
            status = result["match_status"]
            icon = {"matched": "✅", "skipped": "⏭️", "pending": "🔄", "error": "❌"}.get(status, "❓")
            print_step(3, f"{icon} {portal}: {status}")

    except Exception as e:
        print(f"{RED}Cross-verification failed: {e}{RESET}")
        results["cross_verification"]["status"] = f"failed: {e}"

    # ── Step 4: Trust Score ──────────────────────────────
    print_header("Step 4: Trust Score Calculation")
    scorer = TrustScorer()

    try:
        score_data = await scorer.calculate_score(
            entities=entities,
            verification_results=results.get("cross_verification", {}),
        )
        results["trust_score"] = score_data

        trust = score_data["trust_score"]
        if trust >= 70:
            color = GREEN
            label = "HIGH TRUST ✅"
        elif trust >= 40:
            color = YELLOW
            label = "MODERATE ⚠️"
        else:
            color = RED
            label = "LOW TRUST ❌"

        print(f"  {BOLD}{color}Trust Score: {trust}/100  [{label}]{RESET}")
        print_field("Completeness", f"{score_data['completeness_score']}/100")
        print_field("Consistency", f"{score_data['consistency_score']}/100")
        print_field("Verification", f"{score_data['verification_score']}/100")

        if score_data.get("anomalies"):
            print(f"\n  {BOLD}⚠️ Anomalies:{RESET}")
            for a in score_data["anomalies"]:
                sev = a.get("severity", "low")
                sev_color = {"critical": RED, "high": RED, "medium": YELLOW, "low": GREEN}.get(sev, RESET)
                print(f"    {sev_color}[{sev.upper()}]{RESET} {a.get('description', '')}")

        if score_data.get("gemini_analysis"):
            print(f"\n  {BOLD}🤖 AI Analysis:{RESET}")
            print(f"  {score_data['gemini_analysis']}")

    except Exception as e:
        print(f"{RED}Trust scoring failed: {e}{RESET}")
        results["trust_score"]["status"] = f"failed: {e}"

    return results


async def main():
    # Determine input file
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        sample = Path(__file__).parent / "sample_docs" / "khasra_bulandshahr.png"
        if sample.exists():
            file_path = str(sample)
        else:
            print(f"{RED}No input file provided and no sample found.{RESET}")
            print(f"Usage: python {sys.argv[0]} <path/to/document.pdf|jpg|png>")
            sys.exit(1)

    file_path = str(Path(file_path).resolve())
    print(f"\n{BOLD}{'🏠' * 5}  Bhoomi Suraksha — Pipeline Test  {'🏠' * 5}{RESET}")
    print(f"  Input: {file_path}")
    print(f"  Size:  {os.path.getsize(file_path) / 1024:.1f} KB")
    print(f"  Time:  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Run pipeline
    results = await run_pipeline(file_path)

    # Save to JSON
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = Path(file_path).stem
    output_file = output_dir / f"result_{filename}_{timestamp}.json"

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False, default=str)

    print_header("📁 Results Saved")
    print(f"  {GREEN}✅ JSON saved to: {output_file}{RESET}")
    print(f"  File size: {output_file.stat().st_size / 1024:.1f} KB\n")

    return results


if __name__ == "__main__":
    asyncio.run(main())
