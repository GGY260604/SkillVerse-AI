import base64
import json
import uuid
import httpx
from typing import Optional, Dict, Any, List
from fastapi import HTTPException
from ..config import settings
from ..schemas.profile import ProfileIntakePayload, UserSkillItem, EmploymentStatus, SkillProficiency


GEMINI_MODEL = "gemini-1.5-flash"
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


async def call_gemini_with_fallback(contents: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Executes a Gemini 1.5 Flash request with automatic API key rotation
    across the configured key pool if rate limits (HTTP 429) or errors occur.
    """
    if not settings.GEMINI_API_KEYS:
        raise HTTPException(
            status_code=500,
            detail="No Gemini API keys configured. Please add GEMINI_API_KEY_1 in your .env file.",
        )

    last_error = None
    for key_index, api_key in enumerate(settings.GEMINI_API_KEYS):
        url = API_URL_TEMPLATE.format(model=GEMINI_MODEL, key=api_key)
        payload = {
            "system_instruction": {
                "parts": [{"text": SYSTEM_INSTRUCTION}]
            },
            "contents": contents,
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2,
                "maxOutputTokens": 3000,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    result = response.json()
                    candidates = result.get("candidates", []) #candidates - potential responses from the model
                    if candidates and "content" in candidates[0]: #content - the actual response from the model
                        parts = candidates[0]["content"].get("parts", []) #parts - the actual response from the model
                        if parts and "text" in parts[0]: #text - the actual response from the model
                            raw_text = parts[0]["text"]
                            return json.loads(raw_text)
                    raise ValueError("Empty or malformed candidate in Gemini response.")

                # If rate limited (429) or forbidden (403), cycle to the next API key in the pool
                if response.status_code in [429, 403]:
                    last_error = f"API Key #{key_index + 1} returned HTTP {response.status_code}: {response.text}"
                    continue

                # Other HTTP errors
                last_error = f"Gemini HTTP {response.status_code}: {response.text}"

        except Exception as e:
            last_error = str(e)
            continue

    raise HTTPException(
        status_code=502,
        detail=f"All Gemini API keys in pool failed or exhausted. Last error: {last_error}",
    )


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
