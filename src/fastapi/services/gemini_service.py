import base64
import json
import uuid
import httpx
from typing import Optional, Dict, Any, List
from fastapi import HTTPException
from config import settings
from schemas.profile import ProfileIntakePayload, UserSkillItem, EmploymentStatus, SkillProficiency


import logging
import re

logger = logging.getLogger("gemini_service")

# Active Gemini models in priority order:
# 1. gemini-flash-lite-latest: Fast, high throughput, currently not overloaded
# 2. gemini-flash-latest: Standard production model
# 3. gemini-3.8-flash: Recommended next-gen flash model
# 4. gemini-2.5-flash-lite / gemini-2.5-flash: Fallback legacy models
GEMINI_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
    "gemini-3.8-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
]
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


_active_key_index = 0
_depleted_key_indices = set()  # Track keys with exhausted billing (HTTP 402)
_last_used_key_identifier: Optional[str] = f"GEMINI_API_KEY_{_active_key_index + 1}"


def get_last_used_key() -> Optional[str]:
    """Returns the identifier of the most recently successful Gemini API Key."""
    return _last_used_key_identifier


async def call_gemini_with_fallback(
    contents: List[Dict[str, Any]],
    timeout: float = 35.0,
    system_instruction: Optional[str] = None,
    max_output_tokens: int = 6000,
) -> Dict[str, Any]:
    """
    Robust Gemini API caller implementing:
    1. Circular active key indexing (starts with the last known working key).
    2. Multi-model rotation across supported active models.
    3. Intelligent skipping of billing-depleted keys (402).
    4. Immediate rotation on 429/403 rate limits.
    5. Strict JSON parsing with flexible max output tokens.
    """
    global _active_key_index, _last_used_key_identifier
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

        # Skip known billing-depleted keys (e.g. 402) to avoid wasting latency
        if key_index in _depleted_key_indices and len(_depleted_key_indices) < total_keys:
            continue

        api_key = settings.GEMINI_API_KEYS[key_index]

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
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
                                    _last_used_key_identifier = f"GEMINI_API_KEY_{key_index + 1}"
                                    return json.loads(raw_text.strip())
                            raise ValueError("Empty or malformed candidate in Gemini response.")

                        last_error = f"API Key #{key_index + 1} ({model}) returned HTTP {response.status_code}: {response.text[:150]}"

                        if response.status_code == 402:
                            # Billing depleted for this project, record to avoid hammering it
                            _depleted_key_indices.add(key_index)
                            break
                        elif response.status_code in (400, 401, 403):
                            # Key invalid or unauthorized, skip to next key
                            break
                        elif response.status_code in (404, 429, 500, 502, 503, 504):
                            # Model not available, model rate limited, or transient 503 spike: try next model
                            continue
                        else:
                            continue

                    except Exception as e:
                        last_error = f"{type(e).__name__} on Key #{key_index + 1} ({model}): {str(e)}"
                        continue
        except Exception as e:
            last_error = f"{type(e).__name__} on Key #{key_index + 1}: {str(e)}"
            continue

    raise HTTPException(
        status_code=502,
        detail=f"All Gemini API keys in pool failed or exhausted. Last error: {last_error}",
    )


# Function aliases for backward and cross-service compatibility
call_gemini_json = call_gemini_with_fallback
call_gemini_with_rotation = call_gemini_with_fallback


def heuristic_extract_profile(raw_text: str = "") -> ProfileIntakePayload:
    """
    Zero-failure heuristic parser that extracts competencies, tools, education,
    and work parameters directly from text when external LLM endpoints are exhausted or rate limited.
    """
    text_lower = raw_text.lower()

    # Recognized Competencies with multilingual localized labels
    KNOWN_COMPETENCIES = [
        ("Python", "Python Programming", {"en": "Python Programming", "ms": "Pengaturcaraan Python", "zh": "Python 编程"}),
        ("JavaScript", "JavaScript Development", {"en": "JavaScript Development", "ms": "Pembangunan JavaScript", "zh": "JavaScript 开发"}),
        ("TypeScript", "TypeScript Development", {"en": "TypeScript Development", "ms": "Pembangunan TypeScript", "zh": "TypeScript 开发"}),
        ("React", "React.js Framework", {"en": "React.js", "ms": "Rangka Kerja React.js", "zh": "React 前端框架"}),
        ("Next.js", "Next.js Full-Stack Framework", {"en": "Next.js", "ms": "Rangka Kerja Next.js", "zh": "Next.js 全栈框架"}),
        ("Node.js", "Node.js Backend Development", {"en": "Node.js", "ms": "Pembangunan Node.js", "zh": "Node.js 后端开发"}),
        ("SQL", "Database SQL Queries", {"en": "Database SQL", "ms": "Pangkalan Data SQL", "zh": "SQL 数据库"}),
        ("PostgreSQL", "PostgreSQL Administration", {"en": "PostgreSQL", "ms": "Pentadbiran PostgreSQL", "zh": "PostgreSQL 数据库"}),
        ("MongoDB", "MongoDB NoSQL Database", {"en": "MongoDB", "ms": "Pangkalan Data MongoDB", "zh": "MongoDB 文档数据库"}),
        ("Docker", "Containerization (Docker)", {"en": "Docker Containerization", "ms": "Pengkontenaan Docker", "zh": "Docker 容器化"}),
        ("Kubernetes", "Container Orchestration", {"en": "Kubernetes Orchestration", "ms": "Orkestrasi Kubernetes", "zh": "Kubernetes 编排"}),
        ("AWS", "Amazon Web Services (AWS)", {"en": "AWS Cloud Infrastructure", "ms": "Infrastruktur Awan AWS", "zh": "AWS 云基础设施"}),
        ("Azure", "Microsoft Azure Cloud", {"en": "Microsoft Azure", "ms": "Awan Microsoft Azure", "zh": "Azure 云计算"}),
        ("Git", "Version Control (Git)", {"en": "Git Version Control", "ms": "Kawalan Versi Git", "zh": "Git 版本控制"}),
        ("Linux", "Linux System Administration", {"en": "Linux System Administration", "ms": "Pentadbiran Sistem Linux", "zh": "Linux 系统管理"}),
        ("FastAPI", "FastAPI Microservices", {"en": "FastAPI Microservices", "ms": "Perkhidmatan Mikro FastAPI", "zh": "FastAPI 微服务"}),
        ("Django", "Django Web Framework", {"en": "Django Framework", "ms": "Rangka Kerja Django", "zh": "Django Web 开发"}),
        ("Machine Learning", "Machine Learning & AI", {"en": "Machine Learning", "ms": "Pembelajaran Mesin", "zh": "机器学习"}),
        ("Deep Learning", "Deep Learning & Neural Networks", {"en": "Deep Learning", "ms": "Pembelajaran Mendalam", "zh": "深度学习"}),
        ("Data Analysis", "Data Analysis & Business Intelligence", {"en": "Data Analysis", "ms": "Analisis Data", "zh": "数据分析"}),
        ("Figma", "UI/UX Interface Design", {"en": "UI/UX Design", "ms": "Reka Bentuk UI/UX", "zh": "UI/UX 界面设计"}),
        ("Agile", "Agile & Scrum Project Management", {"en": "Agile Methodology", "ms": "Metodologi Agile", "zh": "敏捷开发方法"}),
        ("Cybersecurity", "Information & Network Security", {"en": "Cybersecurity", "ms": "Keselamatan Siber", "zh": "网络安全"}),
        ("DevOps", "DevOps & CI/CD Pipelines", {"en": "DevOps Practices", "ms": "Amalan DevOps", "zh": "DevOps 自动化运维"}),
        ("Communication", "Cross-Functional Communication", {"en": "Professional Communication", "ms": "Komunikasi Profesional", "zh": "专业沟通协作"}),
        ("Leadership", "Team Leadership & Coordination", {"en": "Team Leadership", "ms": "Kepimpinan Pasukan", "zh": "团队领导力"}),
        ("Problem Solving", "Analytical Problem Solving", {"en": "Problem Solving", "ms": "Penyelesaian Masalah", "zh": "分析与问题解决"}),
    ]

    matched_skills: List[UserSkillItem] = []
    tools_found: List[str] = []

    for keyword, canonical_name, labels in KNOWN_COMPETENCIES:
        pattern = r"\b" + re.escape(keyword.lower()) + r"\b"
        if re.search(pattern, text_lower):
            matched_skills.append(
                UserSkillItem(
                    id=f"skill-{uuid.uuid4().hex[:8]}",
                    name=canonical_name,
                    proficiency=SkillProficiency.INTERMEDIATE,
                    isAiExtracted=True,
                    localized_labels=labels,
                )
            )
            tools_found.append(keyword)

    if not matched_skills:
        matched_skills.append(
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

    # Years of Experience
    years_exp = "1-3 years"
    exp_match = re.search(r"(\d+)\+?\s*(?:years?|yrs?)", text_lower)
    if exp_match:
        y = int(exp_match.group(1))
        if y < 1:
            years_exp = "<1 year"
        elif 1 <= y <= 3:
            years_exp = "1-3 years"
        elif 4 <= y <= 5:
            years_exp = "3-5 years"
        else:
            years_exp = "5+ years"

    # Education Level
    edu = "bachelor"
    if "master" in text_lower or "phd" in text_lower or "doctor" in text_lower:
        edu = "master_phd"
    elif "bachelor" in text_lower or "degree" in text_lower:
        edu = "bachelor"
    elif "diploma" in text_lower:
        edu = "diploma"
    elif "high school" in text_lower or "spm" in text_lower:
        edu = "high_school"

    # Job Title extraction
    job_title = None
    lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
    if lines:
        for line in lines[:5]:
            if len(line) < 45 and not any(char.isdigit() for char in line) and "@" not in line and "http" not in line:
                job_title = line
                break
    if not job_title and tools_found:
        job_title = f"{tools_found[0]} Developer"

    # Languages
    languages = ["English"]
    if "malay" in text_lower or "bahasa" in text_lower:
        languages.append("Bahasa Melayu")
    if "chinese" in text_lower or "mandarin" in text_lower or "中文" in raw_text or "华语" in raw_text:
        languages.append("Chinese")

    return ProfileIntakePayload(
        employmentStatus=EmploymentStatus.EMPLOYED_AT_RISK,
        currentJobTitle=job_title or "Technical Professional",
        industry="Software & Digital Technology",
        educationLevel=edu,
        yearsOfExperience=years_exp,
        skills=matched_skills[:8],
        toolsAndSoftware=tools_found[:6],
        casualDescription=raw_text[:200].strip() if raw_text else "Profile standardized from resume document.",
        languages=languages,
        careerGoal="explore",
        targetSectors=["Artificial Intelligence & Machine Learning", "Cloud & Infrastructure"],
        targetJobTitle=job_title or "Senior Systems Specialist",
        workArrangement="any",
        weeklyCommitmentHours="3-5",
        learningProviders=["free_open", "hrd_corp"],
        outputLanguage="en",
    )


async def normalize_profile_with_gemini(
    raw_text: Optional[str] = None,
    image_bytes: Optional[bytes] = None,
    mime_type: Optional[str] = None,
) -> tuple[ProfileIntakePayload, str, Optional[str]]:
    """
    Normalizes raw extracted text or image CV into a standardized ProfileIntakePayload
    using Gemini with PII stripping and ESCO alignment.
    Returns: (payload, extraction_method, used_key)
    where extraction_method is 'gemini' or 'local', and used_key is e.g. 'GEMINI_API_KEY_5' or None.
    """
    parts: List[Dict[str, Any]] = []

    if image_bytes and mime_type:
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

    try:
        json_data = await call_gemini_with_fallback(contents, timeout=40.0)

        # Transform returned JSON into strongly-typed ProfileIntakePayload
        skills_raw = json_data.get("skills", [])
        normalized_skills: List[UserSkillItem] = []

        for item in skills_raw:
            if isinstance(item, dict) and "name" in item:
                skill_id = f"skill-{uuid.uuid4().hex[:8]}"
                prof_str = str(item.get("proficiency", "intermediate")).lower()
                prof_enum = SkillProficiency.INTERMEDIATE
                if prof_str in ["beginner", "intermediate", "advanced"]:
                    prof_enum = SkillProficiency(prof_str)

                normalized_skills.append(
                    UserSkillItem(
                        id=skill_id,
                        name=item.get("name", "General Competency"),
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

        status_raw = str(json_data.get("employmentStatus", "employed_at_risk")).lower()
        valid_statuses = [e.value for e in EmploymentStatus]
        status_enum = EmploymentStatus.EMPLOYED_AT_RISK
        if status_raw in valid_statuses:
            status_enum = EmploymentStatus(status_raw)

        payload = ProfileIntakePayload(
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
        return (payload, "gemini", _last_used_key_identifier)
    except Exception as gemini_err:
        logger.warning(
            f"Gemini API normalization failed ({gemini_err}). Invoking robust heuristic extraction fallback..."
        )
        fallback_payload = heuristic_extract_profile(raw_text or "")
        return (fallback_payload, "local", None)
