"""
Bhoomi Suraksha — AI Narration Service
Uses Google Gemini to generate a detailed, conversational narration about a property document.
Uses Gemini 2.5 Flash TTS for high-quality AI voice generation.
"""

import io
import logging
import wave

from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger(__name__)

NARRATION_PROMPT = """You are a friendly Indian property document expert. A user has uploaded a property document and our AI has extracted the following information. Generate a detailed, easy-to-understand narration explaining this document.

RULES:
1. Speak in simple Hinglish (mix of Hindi and English) — as if explaining to a common person
2. Cover ALL key details: document type, owners, property location, area, khasra/khatauni info, registration details, mutations, court orders, mortgages
3. Be conversational and reassuring — "Aaiye dekhte hain aapke document mein kya kya information hai..."
4. Explain what each field means in simple terms
5. If there are multiple owners, mention each one
6. If there are mortgages or court orders, explain them simply
7. End with a brief summary
8. Keep it 300-600 words
9. Do NOT use markdown formatting — plain text only, as this will be read aloud by text-to-speech
10. Use natural pauses with commas and periods for better TTS flow

EXTRACTED ENTITIES:
{entities_json}

RAW OCR TEXT (for additional context):
{ocr_text_snippet}

Generate the narration now:"""


class NarrationService:
    """Generates AI-powered narration text about property documents using Gemini."""

    def __init__(self):
        self._client = None

    def _get_client(self) -> genai.Client:
        """Lazy-load Gemini client."""
        if self._client is None:
            if not settings.gemini_api_key:
                raise ValueError("GEMINI_API_KEY not set. Add it to your .env file.")
            self._client = genai.Client(api_key=settings.gemini_api_key)
            logger.info("Gemini client initialized for narration")
        return self._client

    async def generate_narration(self, entities: dict, ocr_text: str = "") -> str:
        """
        Generate a detailed narration about the property document.

        Args:
            entities: Extracted entities dict from entity extractor
            ocr_text: Raw OCR text for additional context

        Returns:
            Plain text narration suitable for text-to-speech
        """
        import json

        try:
            client = self._get_client()

            # Build the prompt
            entities_json = json.dumps(entities, indent=2, ensure_ascii=False, default=str)
            ocr_snippet = (ocr_text[:3000] + "...") if len(ocr_text) > 3000 else ocr_text

            prompt = NARRATION_PROMPT.replace("{entities_json}", entities_json)
            prompt = prompt.replace("{ocr_text_snippet}", ocr_snippet)

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,  # Slightly creative for natural narration
                    max_output_tokens=2048,
                ),
            )

            narration = response.text.strip()

            # Clean up any markdown that might slip through
            narration = narration.replace("**", "").replace("##", "").replace("# ", "")
            narration = narration.replace("```", "").replace("`", "")

            logger.info(f"Narration generated: {len(narration)} chars")
            return narration

        except Exception as e:
            logger.error(f"Narration generation failed: {e}")
            return self._fallback_narration(entities)

    @staticmethod
    def _fallback_narration(entities: dict) -> str:
        """Generate a basic narration when Gemini is unavailable."""
        parts = ["Yeh aapka property document hai."]

        doc_type = entities.get("document_type", "")
        if doc_type:
            parts.append(f"Document ka type hai: {doc_type}.")

        owners = entities.get("owners", [])
        if owners:
            names = [o.get("name") or o.get("name_hindi", "Unknown") for o in owners]
            parts.append(f"Is document mein owners hain: {', '.join(names)}.")

        address = entities.get("property_address", {})
        if address:
            location_parts = []
            if address.get("village"):
                location_parts.append(f"gaon {address['village']}")
            if address.get("tehsil"):
                location_parts.append(f"tehsil {address['tehsil']}")
            if address.get("district"):
                location_parts.append(f"jila {address['district']}")
            if address.get("state"):
                location_parts.append(address["state"])
            if location_parts:
                parts.append(f"Property ki location hai: {', '.join(location_parts)}.")

        khasra = entities.get("khasra_number") or entities.get("gata_number")
        if khasra:
            parts.append(f"Khasra ya gata number hai: {khasra}.")

        area = entities.get("plot_area") or entities.get("total_area")
        unit = entities.get("plot_area_unit") or entities.get("total_area_unit", "")
        if area:
            parts.append(f"Property ka area hai: {area} {unit}.")

        parts.append("Zyada details ke liye AI narration service configure karein.")
        return " ".join(parts)

    async def generate_audio(self, narration_text: str, voice: str = "Kore") -> bytes:
        """
        Generate high-quality AI speech audio from narration text using Gemini 2.5 Flash TTS.

        Args:
            narration_text: The narration text to convert to speech
            voice: Gemini TTS voice name (default: Kore — firm, clear voice)
                   Other options: Puck (upbeat), Charon (warm), Aoede, Leda, etc.

        Returns:
            WAV audio bytes ready to serve to the client
        """
        try:
            client = self._get_client()

            # Gemini TTS — generate audio from narration text
            # Prefix with style instruction for natural Hindi/Hinglish reading
            tts_prompt = (
                "Read the following text in a clear, warm, conversational tone. "
                "This is a Hinglish narration about a property document. "
                "Speak naturally with proper Hindi pronunciation for Hindi words "
                "and English pronunciation for English words. "
                "Use natural pauses at commas and periods.\n\n"
                f"{narration_text}"
            )

            response = client.models.generate_content(
                model="gemini-2.5-flash-preview-tts",
                contents=tts_prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name=voice,
                            )
                        )
                    ),
                ),
            )

            # Extract raw PCM audio data from response
            audio_data = response.candidates[0].content.parts[0].inline_data.data

            # Wrap PCM data in WAV format (24kHz, 16-bit, mono)
            wav_buffer = io.BytesIO()
            with wave.open(wav_buffer, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(24000)  # 24kHz
                wf.writeframes(audio_data)

            wav_bytes = wav_buffer.getvalue()
            logger.info(f"Gemini TTS audio generated: {len(wav_bytes)} bytes, voice={voice}")
            return wav_bytes

        except Exception as e:
            logger.error(f"Gemini TTS audio generation failed: {e}")
            raise
