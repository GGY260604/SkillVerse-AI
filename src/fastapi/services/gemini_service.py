import base64
import json
import uuid
import httpx
from typing import Optional, Dict, Any, List
from fastapi import HTTPException
from config import settings
from schemas.profile import ProfileIntakePayload, UserSkillItem, EmploymentStatus, SkillProficiency


GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]
GEMINI_MODEL = GEMINI_MODELS[0]
API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

SYSTEM_INSTRUCTION = """
You are an expert HR Workforce Taxonomy and Reskilling Intelligence Specialist for SkillVerse AI (aligned with ESCO and O*NET taxonomies).

YOUR MANDATORY GOALS:
1. FAIRNESS & PII SCRUBBING (SDG 5 & SDG 10):
   - You MUST NOT extract or include any Personal Identifiable Information (PII) or demographic bias markers.
   - Strictly IGNORE and DISCARD: NRIC / MyKad / Passport numbers, full residential addresses, phone numbers, personal emails, age, date of birth, gender, marital status, race, and ethnicity.
   - Only extract occupational, technical, and skill competencies.

2. MULTILINGUAL ENTITY NORMALIZATION:
   - Resumes may be in English, Bahasa Melayu, Chinese, or code-mixed Manglish.
   - Translate and normalize casual user phrases (e.g. "pandai buat closing akaun", "负责整理库存和做excel表") into canonical English ESCO/O*NET taxonomy concepts.
   - For every extracted skill, provide:
     * canonical English name ("name")
     * localized display labels in English ("en"), Bahasa Melayu ("ms"), and Chinese ("zh")
     * estimated proficiency ("beginner", "intermediate", "advanced") based on context

3. OUTPUT FORMAT:
   - You MUST output ONLY a valid JSON object matching the requested schema. No conversational filler or markdown formatting outside the JSON.
"""

PROFILE_SCHEMA_PROMPT = """
JSON Structure Required:
{
  "employmentStatus": "employed_at_risk" | "fresh_grad_student" | "career_switcher" | "jobseeker",
  "currentJobTitle": string or null,
  "industry": string or null,
  "educationLevel": string or null,
  "yearsOfExperience": "<1 year" | "1-3 years" | "3-5 years" | "5+ years" | null,
  "skills": [
    {
      "name": "Canonical English ESCO Concept",
      "proficiency": "beginner" | "intermediate" | "advanced",
      "localized_labels": {
        "en": "English label",
        "ms": "Label Bahasa Melayu",
        "zh": "中文标签"
      }
    }
  ],
  "toolsAndSoftware": [string],
  "casualDescription": string,
  "languages": [string],
  "careerGoal": "upskill" | "reskill" | "explore",
  "targetSectors": [string],
  "workArrangement": "any"
}
"""


_active_key_index = 4

# To test the function with different model names, change the model names in the settings.GEMINI_API_KEYS list.
async def call_gemini_with_fallback(
    contents: List[Dict[str, Any]],
    timeout: float = 12.0,
    system_instruction: Optional[str] = None,
    max_output_tokens: int = 6000,
) -> Dict[str, Any]:
    """
    Robust Gemini API caller implementing:
    1. Circular active key indexing (starts with the last known working key).
    2. Multi-model rotation across modern 2026 model names.
    3. Immediate rotation on 402/429/403 errors.
    4. Strict JSON parsing with flexible max output tokens.
    """
    global _active_key_index
    if not settings.GEMINI_API_KEYS:
        raise HTTPException(
            status_code=500,
            detail="No Gemini API keys configured. Please add GEMINI_API_KEY_1 in your .env file.",
        )

    last_error = None
    total_keys = len(settings.GEMINI_API_KEYS)
    sys_text = system_instruction if system_instruction is not None else SYSTEM_INSTRUCTION

    for offset in range(total_keys):
        key_index = (_active_key_index + offset) % total_keys
        api_key = settings.GEMINI_API_KEYS[key_index]

        for model in GEMINI_MODELS:
            url = API_URL_TEMPLATE.format(model=model, key=api_key)
            payload = {
                "system_instruction": {
                    "parts": [{"text": sys_text}]
                },
                "contents": contents,
                "generationConfig": {
                    "response_mime_type": "application/json",
                    "temperature": 0.2,
                    "maxOutputTokens": max_output_tokens,
                },
            }

            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(url, json=payload)
                    if response.status_code == 200:
                        result = response.json()
                        candidates = result.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                raw_text = parts[0]["text"].strip()
                                if raw_text.startswith("```json"):
                                    raw_text = raw_text[7:]
                                if raw_text.startswith("```"):
                                    raw_text = raw_text[3:]
                                if raw_text.endswith("```"):
                                    raw_text = raw_text[:-3]
                                _active_key_index = key_index  # Remember this working key!
                                return json.loads(raw_text.strip())
                        raise ValueError("Empty or malformed candidate in Gemini response.")

                    last_error = f"API Key #{key_index + 1} ({model}) returned HTTP {response.status_code}: {response.text[:150]}"
                    if response.status_code == 404:
                        # Model not supported on this version, try next model
                        continue
                    else:
                        # Key has quota/rate issue (402, 429, 403), immediately try next key
                        break

            except Exception as e:
                last_error = f"{type(e).__name__}: {str(e)}"
                continue

    raise HTTPException(
        status_code=502,
        detail=f"All Gemini API keys in pool failed or exhausted. Last error: {last_error}",
    )


# Function aliases for backward and cross-service compatibility
call_gemini_json = call_gemini_with_fallback
call_gemini_with_rotation = call_gemini_with_fallback


async def normalize_profile_with_gemini(
    raw_text: Optional[str] = None,
    image_bytes: Optional[bytes] = None,
    mime_type: Optional[str] = None,
) -> ProfileIntakePayload:
    """
    Normalizes raw extracted text or image CV into a standardized ProfileIntakePayload
    using Gemini 1.5 Flash with PII stripping and ESCO alignment.
    """
    parts: List[Dict[str, Any]] = []

    if image_bytes and mime_type:
        # Multimodal Vision OCR ingestion
        encoded_img = base64.b64encode(image_bytes).decode("utf-8")
        parts.append({
            "inline_data": {
                "mime_type": mime_type,
                "data": encoded_img,
            }
        })
        parts.append({
            "text": (
                "Please perform OCR on this scanned resume/CV image, redact all PII, "
                "normalize all skills into canonical ESCO taxonomy concepts, "
                "and populate the JSON schema according to these instructions:\n"
                f"{PROFILE_SCHEMA_PROMPT}"
            )
        })
    elif raw_text:
        parts.append({
            "text": (
                "Here is the raw text extracted from a user's resume/CV:\n\n"
                f"--- BEGIN RAW TEXT ---\n{raw_text}\n--- END RAW TEXT ---\n\n"
                "Please redact all PII, normalize all skills into canonical ESCO taxonomy concepts, "
                "and populate the JSON schema according to these instructions:\n"
                f"{PROFILE_SCHEMA_PROMPT}"
            )
        })
    else:
        raise HTTPException(status_code=400, detail="Either raw_text or image_bytes must be provided.")

    contents = [{"parts": parts}]
    json_data = await call_gemini_with_fallback(contents)

    # Transform returned JSON into strongly-typed ProfileIntakePayload
    skills_raw = json_data.get("skills", [])
    normalized_skills: List[UserSkillItem] = []

    for item in skills_raw:
        if isinstance(item, dict) and "name" in item:
            skill_id = f"skill-{uuid.uuid4().hex[:8]}"
            prof_str = str(item.get("proficiency", "intermediate")).lower() #intermediate - the default proficiency if not found
            prof_enum = SkillProficiency.INTERMEDIATE
            if prof_str in ["beginner", "intermediate", "advanced"]:
                prof_enum = SkillProficiency(prof_str)

            normalized_skills.append(
                UserSkillItem(
                    id=skill_id,
                    name=item.get("name", "General Competency"),
                    escoUri=item.get("escoUri"), #ESCOUri - the URI of the skill in the ESCO taxonomy
                    proficiency=prof_enum,
                    isAiExtracted=True,
                    localized_labels=item.get("localized_labels"),
                )
            )

    # Ensure at least one skill is present as per mandatory requirement
    if not normalized_skills:
        normalized_skills.append(
            UserSkillItem(
                id=f"skill-{uuid.uuid4().hex[:8]}",
                name="Professional Communication",
                proficiency=SkillProficiency.INTERMEDIATE,
                isAiExtracted=True,
                localized_labels={
                    "en": "Professional Communication",
                    "ms": "Komunikasi Profesional",
                    "zh": "专业沟通能力",
                },
            )
        )

    # Map status
    status_raw = str(json_data.get("employmentStatus", "employed_at_risk")).lower()
    valid_statuses = [e.value for e in EmploymentStatus]
    status_enum = EmploymentStatus.EMPLOYED_AT_RISK
    if status_raw in valid_statuses:
        status_enum = EmploymentStatus(status_raw)

    return ProfileIntakePayload(
        employmentStatus=status_enum,
        currentJobTitle=json_data.get("currentJobTitle"),
        industry=json_data.get("industry"),
        educationLevel=json_data.get("educationLevel"),
        yearsOfExperience=json_data.get("yearsOfExperience"),
        skills=normalized_skills,
        toolsAndSoftware=json_data.get("toolsAndSoftware", []),
        casualDescription=json_data.get("casualDescription"),
        languages=json_data.get("languages", ["English"]),
        careerGoal=json_data.get("careerGoal", "explore"),
        targetSectors=json_data.get("targetSectors", []),
        targetJobTitle=json_data.get("targetJobTitle"),
        workArrangement=json_data.get("workArrangement", "any"),
        weeklyCommitmentHours="3-5",
        learningProviders=["free_open", "hrd_corp"],
        outputLanguage="en",
    )
