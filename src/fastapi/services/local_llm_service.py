import json
import logging
import uuid
from typing import Optional, Dict, Any, List
from openai import AsyncOpenAI
from config import settings
from schemas.profile import ProfileIntakePayload, UserSkillItem, EmploymentStatus, SkillProficiency

logger = logging.getLogger("local_llm_service")

# Shared client instance
_openai_client = None

LOCAL_SYSTEM_INSTRUCTION = """
You are an expert HR Workforce Taxonomy and Reskilling Intelligence Specialist for SkillVerse AI (aligned with ESCO and O*NET taxonomies).

YOUR MANDATORY GOALS:
1. FAIRNESS & PII PROTECTION (SDG 5 & SDG 10):
   - You must NOT extract or output any Personal Identifiable Information (PII).
   - Ignore all names, identity numbers, phone numbers, personal emails, age, gender, and addresses.
   - Only extract occupational, technical, and skill competencies.

2. MULTILINGUAL ENTITY NORMALIZATION:
   - The resume may contain English, Bahasa Melayu, Chinese, or Manglish.
   - Translate and normalize casual user phrases into canonical English ESCO concepts.
   - For every extracted skill, provide:
     * canonical English name ("name")
     * localized display labels in English ("en"), Bahasa Melayu ("ms"), and Chinese ("zh")
     * estimated proficiency ("beginner", "intermediate", "advanced") based on depth of experience

3. STRICT OUTPUT FORMAT:
   - Output ONLY a valid JSON object matching the requested schema. No conversational filler or markdown code fences outside the JSON.
"""

PROFILE_SCHEMA_PROMPT = """
JSON Structure Required:
{
  "employmentStatus": "employed_at_risk" | "fresh_grad_student" | "career_switcher" | "jobseeker",
  "currentJobTitle": string or null,
  "industry": string or null,
  "educationLevel": string or null,
  "yearsOfExperience": "0-1" | "1-3" | "3-5" | "5-10" | "10+" | null,
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
  "targetSectors": [
    "Artificial Intelligence & Machine Learning" |
    "Clean Energy & ESG" |
    "Cloud & Infrastructure" |
    "Cybersecurity & Zero Trust" |
    "Modern Finance & FinTech" |
    "Software Engineering" |
    "Smart Logistics & Supply Chain" |
    "Healthcare & BioTech" |
    "Industrial Automation"
  ],
  "workArrangement": "any" | "remote" | "hybrid" | "onsite"
}
"""


def get_local_client() -> Optional[AsyncOpenAI]:
    """Returns the cached AsyncOpenAI client targeting the local LLM engine (Ollama / vLLM)."""
    global _openai_client
    if not getattr(settings, "ENABLE_LOCAL_LLM", True):
        return None
    if _openai_client is None:
        base_url = getattr(settings, "LOCAL_LLM_BASE_URL", "http://127.0.0.1:11434/v1")
        api_key = getattr(settings, "LOCAL_LLM_API_KEY", "ollama")
        _openai_client = AsyncOpenAI(base_url=base_url, api_key=api_key, timeout=60.0)
    return _openai_client


async def call_local_llm_json(
    prompt: str,
    system_instruction: Optional[str] = None,
    timeout: float = 60.0,
) -> Optional[Dict[str, Any]]:
    """
    Executes a structured JSON prompt against the local LLM (Qwen 2.5 via Ollama/vLLM).
    Returns parsed JSON dict on success, or None on failure (enabling instant Gemini fallback).
    """
    client = get_local_client()
    if not client:
        logger.info("[local_llm] Local LLM disabled via ENABLE_LOCAL_LLM=false.")
        return None

    model_name = getattr(settings, "LOCAL_LLM_MODEL", "qwen2.5:7b")
    sys_prompt = system_instruction or LOCAL_SYSTEM_INSTRUCTION

    try:
        import time
        t0 = time.time()
        keep_alive_val = getattr(settings, "LOCAL_LLM_KEEP_ALIVE", "-1")
        extra_body = {}
        if keep_alive_val:
            extra_body["keep_alive"] = -1 if keep_alive_val == "-1" else keep_alive_val

        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            timeout=timeout,
            extra_body=extra_body if extra_body else None,
        )

        content = response.choices[0].message.content
        elapsed = time.time() - t0
        logger.info(f"[local_llm] Ollama responded in {elapsed:.2f}s ({len(content or '')} chars).")
        if not content:
            return None

        # Clean potential markdown wrapping if returned
        cleaned = content.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        return json.loads(cleaned.strip())

    except Exception as e:
        logger.warning(
            f"[local_llm] Local LLM ({model_name} @ {getattr(settings, 'LOCAL_LLM_BASE_URL', '')}) "
            f"failed or timed out: {type(e).__name__}: {e}. Switching to Gemini fallback."
        )
        return None


async def normalize_profile_with_local_llm(
    sanitized_text: str,
) -> Optional[ProfileIntakePayload]:
    """
    Attempts to normalize competencies using the local LLM (Qwen).
    Returns strongly typed ProfileIntakePayload, or None if local model is offline.
    """
    if not sanitized_text or not sanitized_text.strip():
        return None

    # Cap text length to 8000 characters to keep Ollama inference snappy (< 15 seconds)
    processed_text = sanitized_text
    if len(processed_text) > 8000:
        logger.info(f"[local_llm] Resume text is {len(processed_text)} chars; trimming to 8000 chars for optimal local LLM latency.")
        processed_text = processed_text[:8000]

    prompt = (
        "Here is the sanitized resume text from a candidate (all PII has been scrubbed):\n\n"
        f"--- BEGIN SANITIZED TEXT ---\n{processed_text}\n--- END SANITIZED TEXT ---\n\n"
        "Normalize all competencies into canonical ESCO concepts and output JSON matching this schema:\n"
        f"{PROFILE_SCHEMA_PROMPT}"
    )

    data = await call_local_llm_json(prompt, system_instruction=LOCAL_SYSTEM_INSTRUCTION)
    if not data or not isinstance(data, dict):
        return None

    try:
        skills_raw = data.get("skills", [])
        normalized_skills: List[UserSkillItem] = []

        for item in skills_raw:
            if isinstance(item, dict) and "name" in item:
                prof_str = str(item.get("proficiency", "intermediate")).lower()
                prof_enum = SkillProficiency.INTERMEDIATE
                if prof_str in ["beginner", "intermediate", "advanced"]:
                    prof_enum = SkillProficiency(prof_str)

                normalized_skills.append(
                    UserSkillItem(
                        id=f"skill-{uuid.uuid4().hex[:8]}",
                        name=item.get("name", "Competency"),
                        escoUri=item.get("escoUri"),
                        proficiency=prof_enum,
                        isAiExtracted=True,
                        localized_labels=item.get("localized_labels"),
                    )
                )

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

        status_raw = str(data.get("employmentStatus", "employed_at_risk")).lower()
        valid_statuses = [e.value for e in EmploymentStatus]
        status_enum = EmploymentStatus.EMPLOYED_AT_RISK
        if status_raw in valid_statuses:
            status_enum = EmploymentStatus(status_raw)

        return ProfileIntakePayload(
            employmentStatus=status_enum,
            currentJobTitle=data.get("currentJobTitle"),
            industry=data.get("industry"),
            educationLevel=data.get("educationLevel"),
            yearsOfExperience=data.get("yearsOfExperience"),
            skills=normalized_skills,
            toolsAndSoftware=data.get("toolsAndSoftware", []),
            casualDescription=data.get("casualDescription") or sanitized_text[:200].strip(),
            languages=data.get("languages", ["English"]),
            careerGoal=data.get("careerGoal", "explore"),
            targetSectors=data.get("targetSectors", ["Artificial Intelligence & Machine Learning"]),
            targetJobTitle=data.get("targetJobTitle"),
            workArrangement=data.get("workArrangement", "any"),
            weeklyCommitmentHours="3-5",
            learningProviders=["free_open", "hrd_corp"],
            outputLanguage="en",
        )

    except Exception as e:
        logger.warning(f"Failed to parse local LLM response into ProfileIntakePayload: {e}")
        return None
