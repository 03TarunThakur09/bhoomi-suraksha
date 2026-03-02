"""
Bhoomi Suraksha — Gemini Entity Extractor
Uses Google Gemini LLM to extract structured entities from OCR text of Indian property documents.
Supports Hindi, English, and mixed-script documents from Delhi NCR and UP regions.
Enhanced with post-processing for UP Bhulekh cross-verification compatibility.
"""

import json
import logging
import re
from typing import Any

from google import genai
from google.genai import types

from app.config import settings
from app.schemas.schemas import ExtractedEntities, OwnerInfo, PropertyAddress

logger = logging.getLogger(__name__)

# ── Hindi numeral mapping ─────────────────────────────────────────────

HINDI_DIGIT_MAP = str.maketrans("०१२३४५६७८९", "0123456789")

# ── Known UP districts for auto-detection ─────────────────────────────

UP_DISTRICT_MAP = {
    "बुलंदशहर": "Bulandshahr", "बुलन्दशहर": "Bulandshahr",
    "गाज़ियाबाद": "Ghaziabad", "गाजियाबाद": "Ghaziabad",
    "नोएडा": "Gautam Buddha Nagar", "गौतमबुद्धनगर": "Gautam Buddha Nagar",
    "मेरठ": "Meerut", "हापुड़": "Hapur", "अलीगढ़": "Aligarh",
    "आगरा": "Agra", "लखनऊ": "Lucknow", "मथुरा": "Mathura",
    "सहारनपुर": "Saharanpur", "मुज़फ़्फ़रनगर": "Muzaffarnagar",
    "बागपत": "Baghpat", "अमरोहा": "Amroha", "बिजनौर": "Bijnor",
    "मुरादाबाद": "Moradabad", "रामपुर": "Rampur", "बरेली": "Bareilly",
}

# ── Structured extraction prompt ──────────────────────────────────────

EXTRACTION_PROMPT = """You are an expert Indian property document analyst specializing in Delhi NCR and Uttar Pradesh (especially Bulandshahr district) property documents.

Analyze the following OCR-extracted text from a property document and extract ALL relevant information. The text may be in Hindi (Devanagari), English, or mixed script. Extract EVERY piece of data you can find.

IMPORTANT CONTEXT:
- This is from the Delhi NCR / Uttar Pradesh region
- Common document types: बैनामा (Sale Deed), खसरा/खतौनी (Khasra/Khatauni), उद्धरण खतौनी (Uddharan Khatauni), रजिस्ट्री (Registry), भारमुक्त प्रमाण पत्र (Encumbrance Certificate), मुख्तारनामा (Power of Attorney)
- Area units: बीघा (bigha), बिस्वा (biswa), हेक्टेयर (hectare), वर्ग फुट (sq ft), वर्ग मीटर (sq m), एकड़ (acre)
- Dates may be in Hindi format or DD/MM/YYYY or DD-MM-YYYY

CRITICAL FOR BHULEKH VERIFICATION:
- khasra_number and gata_number are often THE SAME number in UP records — always extract both
- If only one is found, copy it to both fields
- village_code (ग्राम कोड) is a numeric code essential for UP Bhulekh lookup — extract it if present
- Owner names MUST be extracted in BOTH Hindi and transliterated English for cross-matching
- Strip honorifics (श्री, श्रीमती, सुश्री) from owner names but keep the cleaned name
- For father/husband name, strip पुत्र/पुत्री/पत्नी prefixes and extract the clean name
- Convert ALL Hindi numerals (०१२३४५६७८९) to Arabic numerals (0123456789) in ALL fields
- Area must be a clean decimal number (e.g. 0.0120, not "शून्य दशमलव...")

Extract ALL of the following as JSON. If a field is not found, set it to null:

{
    "document_type": "khasra_khatauni / sale_deed / registry / encumbrance_certificate / power_of_attorney / mutation_record / other",
    "document_type_hindi": "Hindi name of document type",
    "document_subtype": "e.g. uddharan_khatauni / khasra / khatauni_nakal etc",

    "property_address": {
        "district": "District name",
        "district_hindi": "जनपद name in Hindi",
        "tehsil": "Tehsil name",
        "tehsil_hindi": "तहसील in Hindi",
        "village": "Village name in English",
        "village_hindi": "ग्राम name in Hindi",
        "village_code": "ग्राम कोड number",
        "state": "Uttar Pradesh / Delhi",
        "pin_code": "PIN code if present"
    },

    "fasli_year": "फसली वर्ष e.g. 1429-1434",
    "fasli_period": "Date range e.g. 01 July 2021 to 30 June 2027",
    "khata_number": "खाता संख्या",
    "khasra_number": "खसरा/गाटा संख्या",
    "gata_number": "गाटा number",
    "gata_unique_code": "गाटा यूनीक कोड (long numeric code)",

    "total_area": "कुल क्षेत्रफल as number",
    "total_area_unit": "hectare / bigha / sq_ft etc",
    "total_area_text": "Area in words e.g. शून्य दशमलव शून्य एक दो शून्य",
    "land_revenue": "भू-राजस्व amount in rupees",
    "land_revenue_text": "Revenue in words",

    "land_category": "भूमि श्रेणी e.g. 1-क",
    "land_category_description": "e.g. संक्रमणीय भूमिधरों के अधिकार में",
    "land_type": "कृषि भूमि / आवासीय / वाणिज्यिक etc",

    "owners": [
        {
            "name": "Owner name transliterated to English",
            "name_hindi": "Owner name in Hindi",
            "father_husband_name": "Father/husband/guardian name",
            "father_husband_name_hindi": "in Hindi",
            "relationship": "owner / seller / buyer / will_beneficiary / donor / donee",
            "caste_code": "जाति कोड if present",
            "aadhaar_last4": "Last 4 digits of Aadhaar if present",
            "pan_digits": "PAN digits 6-9 if present",
            "address": "Full address",
            "address_hindi": "पता in Hindi",
            "share_area": "हिस्से का क्षेत्रफल in hectares",
            "share_fraction": "e.g. 1/3 भाग"
        }
    ],

    "ownership_transfer_basis": "जोत का आधार e.g. दान पत्र / वसीयत / विक्रय",

    "court_orders": [
        {
            "court_name": "न्यायालय का नाम e.g. राजस्व न्यायालय (तहसीलदार)",
            "case_number": "कम्प्यूटरीकृत वाद संख्या e.g. T202211170404219",
            "order_date": "आदेश दिनांक in YYYY-MM-DD format",
            "order_basis": "e.g. दान पत्र / दुरस्ती (संशोधन से) / वसीयत",
            "digital_signatory": "Name of digital signatory",
            "signatory_designation": "e.g. रजिस्ट्रार कानूनगो",
            "signature_date": "YYYY-MM-DD"
        }
    ],

    "mutations": [
        {
            "type": "नामान्तरण / दाखिल-खारिज / दुरस्ती",
            "court_name": "Court name",
            "case_number": "Case number",
            "order_date": "YYYY-MM-DD",
            "basis": "Basis of mutation",
            "removed_party": "खारिज (removed) party name and details",
            "added_party": "दर्ज (added) party name and details",
            "digital_signatory": "Signatory name",
            "signature_date": "YYYY-MM-DD"
        }
    ],

    "mortgages": [
        {
            "status": "बंधक / बंधक-मुक्त (active mortgage / released)",
            "bank_name": "Bank/institution name",
            "bank_branch": "Branch name",
            "mortgage_date": "YYYY-MM-DD",
            "mortgage_amount": "Amount in rupees",
            "release_date": "YYYY-MM-DD if released",
            "release_amount": "Release amount",
            "gata_numbers": "Gata numbers involved",
            "area_details": "Area details for mortgaged land",
            "borrower_name": "Name of borrower",
            "digital_signatory": "Signatory name",
            "signature_date": "YYYY-MM-DD"
        }
    ],

    "will_testament": {
        "registration_date": "वसीयत दिनांक YYYY-MM-DD",
        "testator": "वसीयतकर्ता (person who made will)",
        "testator_status": "मृतक (deceased) or living",
        "beneficiaries": [
            {
                "name": "वसीयत प्राप्तकर्ता name",
                "share": "e.g. 1/3 भाग",
                "relationship": "Relation to testator"
            }
        ]
    },

    "gift_deed": {
        "type": "दान पत्र",
        "date": "YYYY-MM-DD",
        "donor": "Donor name",
        "donee": "Donee name"
    },

    "prior_orders": "पूर्व आदेशों का विवरण - full text of prior orders",

    "remarks": "अभ्युक्ति section - full text of remarks",

    "document_generation_date": "Date when this document was generated/downloaded",
    "bhunaksha_available": "Yes/No if bhunaksha (land map) is available",
    "disclaimer": "Any disclaimer text",

    "registration_number": "Registration/document number if present",
    "registration_date": "YYYY-MM-DD",
    "stamp_duty": "Stamp duty amount",

    "additional_details": {
        "circle_rate": null,
        "market_value": null,
        "consideration_amount": null,
        "boundary_north": null,
        "boundary_south": null,
        "boundary_east": null,
        "boundary_west": null,
        "encumbrance_status": "Free from encumbrance / has encumbrance",
        "rera_number": null
    },

    "confidence": 0.0
}

Rules:
1. Extract EVERY piece of data from the text into the appropriate field
2. For Hindi text, provide both Hindi and transliterated English versions
3. Convert Hindi numerals (१,२,३...) to Arabic numerals (1,2,3...)
4. Dates should always be in YYYY-MM-DD format
5. Set confidence from 0.0 to 1.0 based on extraction quality
6. If a section has multiple entries (owners, mortgages, mutations), include ALL of them as array items
7. For court orders and mutations, extract the FULL case number including prefix like T2022...
8. For mortgages, capture BOTH active mortgages and mortgage releases separately
9. For ownership shares, capture each owner's individual area share

OCR TEXT TO ANALYZE:
---
{ocr_text}
---

Return ONLY valid JSON, no other text."""


class GeminiEntityExtractor:
    """Extracts structured entities from property document OCR text using Gemini."""

    def __init__(self):
        self._client = None

    def _get_client(self) -> genai.Client:
        """Lazy-load Gemini client."""
        if self._client is None:
            if not settings.gemini_api_key:
                raise ValueError(
                    "GEMINI_API_KEY not set. Add it to your .env file."
                )
            self._client = genai.Client(api_key=settings.gemini_api_key)
            logger.info("Gemini client initialized")
        return self._client

    async def extract_entities(self, ocr_text: str) -> ExtractedEntities:
        """
        Extract structured entities from OCR text using Gemini.

        Args:
            ocr_text: Raw text extracted by OCR service

        Returns:
            ExtractedEntities with all extracted fields
        """
        if not ocr_text or ocr_text.strip() == "":
            logger.warning("Empty OCR text provided")
            return ExtractedEntities(confidence=0.0)

        # Check for fallback OCR text
        if "[OCR FALLBACK]" in ocr_text:
            logger.warning("OCR fallback text detected, cannot extract entities")
            return ExtractedEntities(
                confidence=0.0,
                additional_details={"error": "OCR not configured. Set up Google Cloud Vision API."},
            )

        try:
            client = self._get_client()
            prompt = EXTRACTION_PROMPT.replace("{ocr_text}", ocr_text[:15000])

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,  # Low temperature for factual extraction
                    max_output_tokens=8192,
                ),
            )

            # Parse the JSON response — handle various Gemini output formats
            raw_response = response.text.strip()

            # Strip markdown code fences if Gemini wraps output
            if raw_response.startswith("```"):
                raw_response = raw_response.split("\n", 1)[-1]  # drop first line
                if raw_response.endswith("```"):
                    raw_response = raw_response[:-3]
                raw_response = raw_response.strip()

            # Clean common JSON issues
            import re as _re
            # Remove control characters that break JSON parsing
            raw_response = _re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', raw_response)

            try:
                parsed = json.loads(raw_response)
            except json.JSONDecodeError:
                # Try extracting JSON object from mixed text
                json_match = _re.search(r'\{[\s\S]*\}', raw_response)
                if json_match:
                    try:
                        parsed = json.loads(json_match.group())
                    except json.JSONDecodeError:
                        # Try to repair truncated JSON by closing open braces/brackets
                        repaired = self._repair_json(json_match.group())
                        parsed = json.loads(repaired)
                else:
                    raise

            logger.info(f"Gemini extraction successful, confidence: {parsed.get('confidence', 0)}")
            entities = self._parse_response(parsed, raw_response)
            return self._post_process(entities)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini JSON response: {e}")
            return self._fallback_extract(ocr_text)
        except Exception as e:
            logger.error(f"Gemini extraction failed: {e}")
            return self._fallback_extract(ocr_text)

    @staticmethod
    def _repair_json(text: str) -> str:
        """Attempt to repair truncated JSON by closing open braces and brackets."""
        # Remove trailing comma
        text = text.rstrip().rstrip(",")
        # Count open/close braces and brackets
        open_braces = text.count("{") - text.count("}")
        open_brackets = text.count("[") - text.count("]")
        # Check if we're inside a string (odd number of unescaped quotes)
        in_string = text.count('"') % 2 == 1
        if in_string:
            text += '"'
        # Close any dangling value
        if text.rstrip().endswith(":"):
            text += " null"
        # Close brackets then braces
        text += "]" * max(0, open_brackets)
        text += "}" * max(0, open_braces)
        return text

    def _parse_response(self, data: dict, raw_response: str) -> ExtractedEntities:
        """Parse Gemini JSON response into ExtractedEntities schema."""
        # Parse owners — handle both old and new field names
        owners = []
        for owner_data in data.get("owners", []):
            owners.append(OwnerInfo(
                name=owner_data.get("name"),
                name_hindi=owner_data.get("name_hindi"),
                father_name=owner_data.get("father_name") or owner_data.get("father_husband_name"),
                relationship=owner_data.get("relationship"),
            ))

        # Parse address
        addr_data = data.get("property_address", {})
        address = PropertyAddress(
            village=addr_data.get("village"),
            village_hindi=addr_data.get("village_hindi"),
            tehsil=addr_data.get("tehsil"),
            district=addr_data.get("district"),
            state=addr_data.get("state"),
            pin_code=addr_data.get("pin_code"),
        ) if addr_data else None

        # Coerce numeric fields to strings (Gemini may return float/int)
        plot_area = data.get("plot_area") or data.get("total_area")
        if plot_area is not None:
            plot_area = str(plot_area)

        plot_area_unit = data.get("plot_area_unit") or data.get("total_area_unit")

        stamp_duty = data.get("stamp_duty")
        if stamp_duty is not None:
            stamp_duty = str(stamp_duty)

        # Collect ALL additional data into additional_details
        additional = data.get("additional_details", {}) or {}

        # Khatauni-specific fields
        extra_fields = [
            "document_subtype", "fasli_year", "fasli_period",
            "gata_unique_code", "total_area", "total_area_unit", "total_area_text",
            "land_revenue", "land_revenue_text",
            "land_category", "land_category_description", "land_type",
            "ownership_transfer_basis",
            "court_orders", "mutations", "mortgages",
            "will_testament", "gift_deed",
            "prior_orders", "remarks",
            "document_generation_date", "bhunaksha_available", "disclaimer",
        ]
        for field in extra_fields:
            val = data.get(field)
            if val is not None:
                additional[field] = val

        # Village code from address
        if addr_data.get("village_code"):
            additional["village_code"] = addr_data["village_code"]
        if addr_data.get("district_hindi"):
            additional["district_hindi"] = addr_data["district_hindi"]
        if addr_data.get("tehsil_hindi"):
            additional["tehsil_hindi"] = addr_data["tehsil_hindi"]

        # Owner extended details (shares, addresses, etc.)
        owner_details = []
        for owner_data in data.get("owners", []):
            detail = {}
            for k in ["share_area", "share_fraction", "address", "address_hindi",
                       "caste_code", "aadhaar_last4", "pan_digits",
                       "father_husband_name_hindi"]:
                if owner_data.get(k):
                    detail[k] = owner_data[k]
            if detail:
                detail["name"] = owner_data.get("name")
                owner_details.append(detail)
        if owner_details:
            additional["owner_extended_details"] = owner_details

        return ExtractedEntities(
            document_type=data.get("document_type"),
            document_type_hindi=data.get("document_type_hindi"),
            owners=owners,
            khasra_number=str(data["khasra_number"]) if data.get("khasra_number") is not None else None,
            gata_number=str(data["gata_number"]) if data.get("gata_number") is not None else None,
            khata_number=str(data["khata_number"]) if data.get("khata_number") is not None else None,
            plot_area=plot_area,
            plot_area_unit=plot_area_unit,
            registration_number=data.get("registration_number"),
            registration_date=data.get("registration_date"),
            stamp_duty=stamp_duty,
            property_address=address,
            additional_details=additional,
            confidence=float(data.get("confidence", 0.0)),
        )

    def _post_process(self, entities: ExtractedEntities) -> ExtractedEntities:
        """
        Post-process extracted entities for Bhulekh cross-verification compatibility.
        Normalizes Hindi numerals, auto-detects state, validates fields, deduplicates owners.
        """
        # 1. Normalize Hindi numerals in key fields
        if entities.khasra_number:
            entities.khasra_number = self._normalize_hindi_numerals(entities.khasra_number)
        if entities.gata_number:
            entities.gata_number = self._normalize_hindi_numerals(entities.gata_number)
        if entities.khata_number:
            entities.khata_number = self._normalize_hindi_numerals(entities.khata_number)
        if entities.plot_area:
            entities.plot_area = self._normalize_hindi_numerals(str(entities.plot_area))
            # Clean area value — remove text, keep number
            area_clean = re.sub(r'[^\d.\-]', '', entities.plot_area)
            if area_clean:
                entities.plot_area = area_clean

        # 2. Sync khasra ↔ gata (they are often the same in UP)
        if entities.khasra_number and not entities.gata_number:
            entities.gata_number = entities.khasra_number
        elif entities.gata_number and not entities.khasra_number:
            entities.khasra_number = entities.gata_number

        # 3. Auto-detect state from known district names
        if entities.property_address:
            addr = entities.property_address
            if not addr.state and addr.district:
                district_lower = addr.district.lower().strip()
                # Check English district names
                up_districts_en = [
                    "bulandshahr", "bulandshahar", "ghaziabad", "noida",
                    "gautam buddha nagar", "meerut", "hapur", "aligarh",
                    "agra", "lucknow", "mathura", "saharanpur",
                    "muzaffarnagar", "baghpat", "amroha", "bijnor",
                    "moradabad", "rampur", "bareilly",
                ]
                delhi_areas = ["delhi", "new delhi", "south delhi", "north delhi"]
                if district_lower in up_districts_en:
                    addr.state = "Uttar Pradesh"
                elif district_lower in delhi_areas:
                    addr.state = "Delhi"

            # Also check Hindi district names in additional_details
            hindi_district = entities.additional_details.get("district_hindi", "")
            if hindi_district and not addr.state:
                for hindi_name, eng_name in UP_DISTRICT_MAP.items():
                    if hindi_name in hindi_district:
                        addr.state = "Uttar Pradesh"
                        if not addr.district:
                            addr.district = eng_name
                        break

        # 4. Normalize village_code in additional_details
        village_code = entities.additional_details.get("village_code")
        if village_code:
            entities.additional_details["village_code"] = self._normalize_hindi_numerals(str(village_code))

        # 5. Normalize gata_unique_code
        gata_code = entities.additional_details.get("gata_unique_code")
        if gata_code:
            entities.additional_details["gata_unique_code"] = self._normalize_hindi_numerals(str(gata_code))

        # 6. Clean owner names — strip honorifics
        for owner in entities.owners:
            if owner.name_hindi:
                owner.name_hindi = self._clean_hindi_name(owner.name_hindi)
            if owner.name:
                owner.name = self._clean_english_name(owner.name)

        # 7. Deduplicate owners (same person in Hindi and English)
        if len(entities.owners) > 1:
            entities.owners = self._deduplicate_owners(entities.owners)

        # 8. Normalize area unit names
        if entities.plot_area_unit:
            unit_map = {
                "बीघा": "bigha", "बिस्वा": "biswa", "हेक्टेयर": "hectare",
                "वर्ग फुट": "sq_ft", "वर्ग मीटर": "sq_m", "एकड़": "acre",
                "sqft": "sq_ft", "sqm": "sq_m", "sq ft": "sq_ft", "sq m": "sq_m",
            }
            unit_lower = entities.plot_area_unit.strip().lower()
            entities.plot_area_unit = unit_map.get(unit_lower, unit_map.get(entities.plot_area_unit, entities.plot_area_unit))

        logger.info("Post-processing complete")
        return entities

    @staticmethod
    def _normalize_hindi_numerals(text: str) -> str:
        """Convert Hindi numerals ०१२३४५६७८९ to Arabic 0123456789."""
        return text.translate(HINDI_DIGIT_MAP)

    @staticmethod
    def _clean_hindi_name(name: str) -> str:
        """Strip honorifics and titles from Hindi names."""
        # Remove common prefixes
        prefixes = [
            r'^श्रीमती\s*', r'^श्री\s*', r'^सुश्री\s*',
            r'^स्व\.\s*', r'^स्वर्गीय\s*', r'^मृतक\s*',
        ]
        cleaned = name.strip()
        for prefix in prefixes:
            cleaned = re.sub(prefix, '', cleaned).strip()
        return cleaned

    @staticmethod
    def _clean_english_name(name: str) -> str:
        """Strip honorifics from transliterated English names."""
        prefixes = [
            r'^(?:Shri|Smt|Shrimati|Sushri|Late|Deceased|Mr\.?|Mrs\.?|Ms\.?)\s+',
        ]
        cleaned = name.strip()
        for prefix in prefixes:
            cleaned = re.sub(prefix, '', cleaned, flags=re.IGNORECASE).strip()
        return cleaned

    @staticmethod
    def _deduplicate_owners(owners: list[OwnerInfo]) -> list[OwnerInfo]:
        """Remove duplicate owners (same name appearing as both Hindi and English)."""
        seen_names = set()
        unique = []
        for owner in owners:
            # Create a normalized key from available names
            keys = set()
            if owner.name:
                keys.add(owner.name.lower().strip())
            if owner.name_hindi:
                keys.add(owner.name_hindi.strip())

            # Check if any key was already seen
            if not keys.intersection(seen_names):
                unique.append(owner)
                seen_names.update(keys)
            else:
                # Merge info into existing owner
                for existing in unique:
                    existing_keys = set()
                    if existing.name:
                        existing_keys.add(existing.name.lower().strip())
                    if existing.name_hindi:
                        existing_keys.add(existing.name_hindi.strip())
                    if keys.intersection(existing_keys):
                        if not existing.name_hindi and owner.name_hindi:
                            existing.name_hindi = owner.name_hindi
                        if not existing.name and owner.name:
                            existing.name = owner.name
                        if not existing.father_name and owner.father_name:
                            existing.father_name = owner.father_name
                        break
        return unique

    def _fallback_extract(self, ocr_text: str) -> ExtractedEntities:
        """Regex-based fallback extraction when Gemini is unavailable."""
        logger.info("Using regex fallback for entity extraction")
        entities = ExtractedEntities(confidence=0.2)

        # Khasra / Gata number (they are equivalent in UP)
        khasra_match = re.search(
            r'(?:खसरा\s*(?:संख्या)?|गाटा\s*(?:संख्या)?|khasra|gata|kh\.?\s*no\.?)\s*[:\-]?\s*([\d/\-]+)',
            ocr_text, re.IGNORECASE
        )
        if khasra_match:
            entities.khasra_number = self._normalize_hindi_numerals(khasra_match.group(1))
            entities.gata_number = entities.khasra_number  # Same in UP

        # Khata number
        khata_match = re.search(
            r'(?:खाता\s*(?:संख्या)?|khata\s*(?:no\.?)?)\s*[:\-]?\s*([\d/\-]+)',
            ocr_text, re.IGNORECASE
        )
        if khata_match:
            entities.khata_number = self._normalize_hindi_numerals(khata_match.group(1))

        # Village code
        vcode_match = re.search(
            r'(?:ग्राम\s*कोड|village\s*code)\s*[:\-]?\s*(\d+)',
            ocr_text, re.IGNORECASE
        )
        if vcode_match:
            entities.additional_details["village_code"] = vcode_match.group(1)

        # Registration number
        reg_match = re.search(
            r'(?:पंजीयन|registration|reg\.?\s*no\.?)\s*[:\-]?\s*(\d+[/\-]?\d*)',
            ocr_text, re.IGNORECASE
        )
        if reg_match:
            entities.registration_number = reg_match.group(1)

        # Date (DD/MM/YYYY)
        date_match = re.search(r'(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})', ocr_text)
        if date_match:
            d, m, y = date_match.groups()
            entities.registration_date = f"{y}-{m.zfill(2)}-{d.zfill(2)}"

        # Document type
        doc_type_patterns = {
            "sale_deed": r"बैनामा|sale\s*deed|विक्रय\s*पत्र|conveyance",
            "khasra_khatauni": r"खसरा|खतौनी|khasra|khatauni|उद्रन",
            "registry": r"रजिस्ट्री|registry|पंजीकरण",
            "encumbrance_certificate": r"भारमुक्त|encumbrance",
            "power_of_attorney": r"मुख्तारनामा|power\s*of\s*attorney",
            "mutation_record": r"दाखिल\s*खारिज|mutation|intkal",
        }
        for dtype, pattern in doc_type_patterns.items():
            if re.search(pattern, ocr_text, re.IGNORECASE):
                entities.document_type = dtype
                break

        # Owner name (खातेदार)
        owner_patterns = [
            r'(?:खातेदार\s*(?:का\s*)?नाम|स्वामी|विक्रेता|क्रेता)\s*[:\-]?\s*\|?\s*(.+?)(?:\n|$)',
        ]
        owners = []
        for pattern in owner_patterns:
            for match in re.finditer(pattern, ocr_text, re.IGNORECASE):
                name_raw = match.group(1).strip().strip('|').strip()
                if name_raw and len(name_raw) > 2:
                    father_match = re.search(r'पुत्र(?:ी)?\s*(?:श्री\s*)?(.+?)$', name_raw)
                    father_name = father_match.group(1).strip() if father_match else None
                    owner_name = re.sub(r'\s*पुत्र.*$', '', name_raw).strip()
                    owners.append(OwnerInfo(
                        name_hindi=owner_name, name=owner_name,
                        father_name=father_name, relationship="owner",
                    ))
        if owners:
            entities.owners = owners

        # Village
        village_match = re.search(r'(?:ग्राम|village)\s*[:\-]?\s*(.+?)(?:\n|$)', ocr_text, re.IGNORECASE)
        village = village_match.group(1).strip() if village_match else None

        # Tehsil
        tehsil_match = re.search(r'(?:तहसील|tehsil)\s*[:\-]?\s*(.+?)(?:\n|$)', ocr_text, re.IGNORECASE)
        tehsil = tehsil_match.group(1).strip() if tehsil_match else None

        # District
        district = None
        district_match = re.search(r'(?:जनपद|district|जिला)\s*[:\-]?\s*(.+?)(?:\n|$)', ocr_text, re.IGNORECASE)
        if district_match:
            district = district_match.group(1).strip()
        else:
            for pat in [r"बुलंदशहर", r"गाज़ियाबाद", r"नोएडा", r"दिल्ली", r"मेरठ", r"हापुड़"]:
                m = re.search(pat, ocr_text, re.IGNORECASE)
                if m:
                    district = m.group()
                    break

        # State
        state = None
        if re.search(r'उत्तर\s*प्रदेश|uttar\s*pradesh', ocr_text, re.IGNORECASE):
            state = "Uttar Pradesh"
        elif re.search(r'दिल्ली|delhi', ocr_text, re.IGNORECASE):
            state = "Delhi"

        if district or village or tehsil or state:
            entities.property_address = PropertyAddress(
                district=district, village_hindi=village,
                village=village, tehsil=tehsil, state=state,
            )

        # Area (रकबा)
        area_match = re.search(r'(?:रकबा|area|क्षेत्रफल)\s*[:\-]?\s*([\d\.\-]+)', ocr_text, re.IGNORECASE)
        if area_match:
            entities.plot_area = area_match.group(1).strip()
            if re.search(r'बीघा|bigha', ocr_text, re.IGNORECASE):
                entities.plot_area_unit = "bigha"

        # Land type
        land_match = re.search(r'(?:भूमि\s*का\s*प्रकार|land\s*type)\s*[:\-]?\s*(.+?)(?:\n|$)', ocr_text, re.IGNORECASE)
        if land_match:
            entities.additional_details["land_type"] = land_match.group(1).strip()

        # Fasli year
        fasli_match = re.search(r'(?:फसली\s*वर्ष|fasli)\s*[:\-]?\s*([\d\-/]+)', ocr_text, re.IGNORECASE)
        if fasli_match:
            entities.additional_details["fasli_year"] = fasli_match.group(1).strip()

        entities.additional_details["extraction_method"] = "regex_fallback"
        return self._post_process(entities)

