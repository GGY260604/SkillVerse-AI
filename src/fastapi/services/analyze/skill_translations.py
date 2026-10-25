"""
Dynamic Trilingual Skill Localization & AI Translation Registry
Replaces static dictionary lookup with 100% dynamic, context-aware AI translations
extracted from profile normalization and role synthesis pipelines.
"""

import json
import logging
from typing import Optional, Dict, List, Any

logger = logging.getLogger("skill_translations")

# Dynamic in-memory cache for on-demand translations learned from AI pipelines and role catalogs.
# Maps lower-cased skill names (EN, ZH, MS) to {"en": "...", "ms": "...", "zh": "..."}
_DYNAMIC_CACHE: Dict[str, Dict[str, str]] = {}

# Common natural language query aliases (e.g. for Chinese/Malay search keywords)
_INITIAL_BOOTSTRAP_ENTRIES: List[Dict[str, str]] = [
    {"en": "AI Safety & Alignment Auditing", "ms": "Pengauditan Keselamatan & Penjajaran AI", "zh": "AI 安全与对齐审计"},
    {"en": "Algorithm Design", "ms": "Reka Bentuk Algoritma", "zh": "算法设计"},
    {"en": "Software Engineering", "ms": "Kejuruteraan Perisian", "zh": "软件工程"},
    {"en": "Frontend Development", "ms": "Pembangunan Frontend", "zh": "前端开发"},
    {"en": "Backend Development", "ms": "Pembangunan Backend", "zh": "后端开发"},
    {"en": "Full-Stack Development", "ms": "Pembangunan Tindanan Penuh", "zh": "全栈开发"},
    {"en": "Database Management", "ms": "Pengurusan Pangkalan Data", "zh": "数据库管理"},
    {"en": "Mobile Application Development", "ms": "Pembangunan Aplikasi Mudah Alih", "zh": "移动应用开发"},
    {"en": "Cloud Computing", "ms": "Pengkomputeran Awan", "zh": "云计算"},
    {"en": "Cybersecurity", "ms": "Keselamatan Siber", "zh": "网络安全"},
    {"en": "Artificial Intelligence", "ms": "Kecerdasan Buatan", "zh": "人工智能"},
    {"en": "Machine Learning", "ms": "Pembelajaran Mesin", "zh": "机器学习"},
]


def register_skill_translation(skill_name: str, zh: str, ms: str, en: Optional[str] = None) -> None:
    """Registers a newly learned or synthesized skill into the dynamic cache."""
    if not skill_name:
        return
    clean_en = (en or skill_name).strip()
    clean_zh = (zh or clean_en).strip()
    clean_ms = (ms or clean_en).strip()
    entry = {
        "en": clean_en,
        "zh": clean_zh,
        "ms": clean_ms,
    }
    _DYNAMIC_CACHE[clean_en.lower()] = entry
    _DYNAMIC_CACHE[clean_zh.lower()] = entry
    _DYNAMIC_CACHE[clean_ms.lower()] = entry


# Pre-seed initial foundational aliases
for item in _INITIAL_BOOTSTRAP_ENTRIES:
    register_skill_translation(item["en"], item["zh"], item["ms"])


def bulk_register_role_skills(role: Dict[str, Any]) -> None:
    """
    Extracts authentic AI-generated skill translations from a role payload
    and registers all competencies into the dynamic cache.
    """
    if not isinstance(role, dict):
        return

    skills_en = role.get("requiredSkills") or role.get("required_skills") or []
    loc = role.get("requiredSkillsLocalized") or role.get("required_skills_localized")

    if isinstance(loc, dict):
        en_list = loc.get("en", skills_en)
        ms_list = loc.get("ms", [])
        zh_list = loc.get("zh", [])
        for idx, s_en in enumerate(en_list):
            s_zh = zh_list[idx] if idx < len(zh_list) else s_en
            s_ms = ms_list[idx] if idx < len(ms_list) else s_en
            register_skill_translation(s_en, s_zh, s_ms)
    else:
        skills_ms = role.get("requiredSkills_ms") or role.get("required_skills_ms") or []
        skills_zh = role.get("requiredSkills_zh") or role.get("required_skills_zh") or []
        for idx, s_en in enumerate(skills_en):
            s_zh = skills_zh[idx] if idx < len(skills_zh) else s_en
            s_ms = skills_ms[idx] if idx < len(skills_ms) else s_en
            register_skill_translation(s_en, s_zh, s_ms)


def bulk_register_profile_skills(skills: List[Any]) -> None:
    """
    Registers authentic AI-extracted skills from candidate profiles into the dynamic cache.
    """
    if not isinstance(skills, list):
        return
    for s in skills:
        if isinstance(s, dict):
            s_name = s.get("name") or s.get("title") or ""
            labels = s.get("localized_labels") or {}
            if s_name and isinstance(labels, dict):
                register_skill_translation(
                    s_name,
                    labels.get("zh", s_name),
                    labels.get("ms", s_name),
                    labels.get("en", s_name),
                )
        elif hasattr(s, "name") and hasattr(s, "localized_labels"):
            labels = getattr(s, "localized_labels") or {}
            if isinstance(labels, dict):
                register_skill_translation(
                    s.name,
                    labels.get("zh", s.name),
                    labels.get("ms", s.name),
                    labels.get("en", s.name),
                )


def get_trilingual_skill(raw_skill: Optional[str]) -> Dict[str, str]:
    """
    Returns complete trilingual translations: {"en": "...", "ms": "...", "zh": "..."}.
    Retrieves dynamically cached AI translations, falling back cleanly to canonical skill name.
    """
    if not raw_skill:
        return {"en": "", "ms": "", "zh": ""}

    cleaned = raw_skill.strip()
    lowered = cleaned.lower()

    if lowered in _DYNAMIC_CACHE:
        return dict(_DYNAMIC_CACHE[lowered])

    # Clean fallback: Return canonical skill name across all languages without static distortion
    return {"en": cleaned, "ms": cleaned, "zh": cleaned}


def localize_skill_list_trilingual(
    skills: List[str],
    role_localized: Optional[Dict[str, List[str]]] = None,
) -> Dict[str, List[str]]:
    """
    Transforms a list of skill competencies into trilingual arrays using:
    1. Direct indexing from the role's AI-generated `role_localized` trilingual arrays if provided.
    2. Dynamic AI translation cache (_DYNAMIC_CACHE).
    3. Clean fallback to canonical skill name.
    """
    en_list: List[str] = []
    ms_list: List[str] = []
    zh_list: List[str] = []

    role_en = (
        [s.strip().lower() for s in role_localized.get("en", [])]
        if (role_localized and isinstance(role_localized, dict) and "en" in role_localized)
        else []
    )
    role_ms = role_localized.get("ms", []) if (role_localized and isinstance(role_localized, dict)) else []
    role_zh = role_localized.get("zh", []) if (role_localized and isinstance(role_localized, dict)) else []

    for s in skills:
        cleaned = (s or "").strip()
        if not cleaned:
            continue
        lowered = cleaned.lower()

        # 1. Match directly from role's authentic AI-generated trilingual arrays
        if role_en and lowered in role_en:
            idx = role_en.index(lowered)
            en_val = role_localized["en"][idx] if idx < len(role_localized["en"]) else cleaned
            ms_val = role_ms[idx] if idx < len(role_ms) else en_val
            zh_val = role_zh[idx] if idx < len(role_zh) else en_val
            en_list.append(en_val)
            ms_list.append(ms_val)
            zh_list.append(zh_val)
            continue

        # 2. Match from Dynamic AI Translation Cache
        if lowered in _DYNAMIC_CACHE:
            cached = _DYNAMIC_CACHE[lowered]
            en_list.append(cached.get("en") or cleaned)
            ms_list.append(cached.get("ms") or cleaned)
            zh_list.append(cached.get("zh") or cleaned)
            continue

        # 3. Clean fallback: Canonical name without hallucinated static text
        en_list.append(cleaned)
        ms_list.append(cleaned)
        zh_list.append(cleaned)

    return {"en": en_list, "ms": ms_list, "zh": zh_list}


def localize_skill_name(raw_skill: Optional[str], locale: str = "en") -> str:
    """
    Translates a competency into Simplified Chinese or Bahasa Melayu via dynamic AI registry.
    """
    if not raw_skill:
        return ""
    loc = (locale or "en").lower()
    trilingual = get_trilingual_skill(raw_skill)
    return trilingual.get(loc, trilingual.get("en", raw_skill))


async def warm_skills_cache_batch(skills: List[str], locale: Optional[str] = None) -> None:
    """
    Zero-shot dynamic AI batch translation:
    Batches unknown skills not yet in the dynamic cache and translates them
    concisely into Simplified Chinese (zh) and Bahasa Melayu (ms) via Local Qwen 2.5
    (or Gemini fallback), storing the results in _DYNAMIC_CACHE.
    """
    unknown_skills = []
    for s in skills:
        if not s or not s.strip():
            continue
        cleaned = s.strip()
        lowered = cleaned.lower()
        if lowered not in _DYNAMIC_CACHE:
            unknown_skills.append(cleaned)

    if not unknown_skills:
        return

    # Call local LLM (Qwen) first, then Gemini fallback
    try:
        from services.local_llm_service import call_local_llm_json

        prompt = (
            f"You are a professional HR occupational taxonomy translator.\n"
            f"Translate the following skill competencies into concise, natural Simplified Chinese (zh) and Bahasa Melayu (ms) without extra verbose words:\n"
            f"Skills: {json.dumps(unknown_skills[:15], ensure_ascii=False)}\n\n"
            f"Return a strict JSON object mapping each skill name:\n"
            f"{{\n"
            f'  "Skill Name": {{"zh": "中文专业技能名称", "ms": "Nama kemahiran profesional BM"}}\n'
            f"}}\n"
            f"Return ONLY valid JSON."
        )

        res = await call_local_llm_json(
            prompt=prompt,
            system_instruction="You are a professional HR multilingual translator. Output strictly valid JSON without conversational text.",
            timeout=10.0,
        )

        if not res or not isinstance(res, dict):
            # Gemini fallback if enabled
            from config import settings
            if getattr(settings, "ENABLE_GEMINI_API", False):
                from services.gemini_service import call_gemini_with_fallback
                contents = [{"parts": [{"text": prompt}]}]
                res = await call_gemini_with_fallback(
                    contents=contents,
                    timeout=5.0,
                    max_output_tokens=1000,
                )

        if isinstance(res, dict):
            for skill_name, trans in res.items():
                if isinstance(trans, dict):
                    zh_trans = trans.get("zh", skill_name)
                    ms_trans = trans.get("ms", skill_name)
                    register_skill_translation(skill_name, zh_trans, ms_trans)
    except Exception as e:
        logger.warning(f"[skill_translations] Dynamic AI translation warm failed: {e}")
