import math
import time
import httpx
from typing import List, Dict, Any, Tuple, Optional
from ..config import settings
from .embedding_service import generate_embedding
from ..schemas.analysis import (
    MacroScenario,
    MatchedRole,
    SdgAlignmentItem,
    AtRiskSkillItem,
    RadarAxisItem,
    AnalyzeProfileData,
)


# Fallback catalog strictly used if Supabase connection is completely offline
FALLBACK_ROLES_CATALOG: List[Dict[str, Any]] = []

# Baseline fallback declining skills if Supabase trend_signals is unreachable
FALLBACK_DECLINING_SKILLS = {
    "manual data entry": {
        "velocity": -0.45,
        "reason": "High risk of automation by AI OCR agents and intelligent document processing systems.",
    },
    "routine document filing": {
        "velocity": -0.38,
        "reason": "Replaced by cloud content management systems and auto-tagging workflows.",
    },
    "basic switchboard routing": {
        "velocity": -0.35,
        "reason": "Automated by conversational voice AI and natural language IVR systems.",
    },
    "generic copywriting": {
        "velocity": -0.40,
        "reason": "Large language models generating baseline marketing copy autonomously.",
    },
    "simple bookkeeping reconciliation": {
        "velocity": -0.32,
        "reason": "Direct bank feed APIs and automated cloud accounting platforms.",
    },
    "telemarketing outbound calling": {
        "velocity": -0.48,
        "reason": "Automated conversational agents and strict telemarketing consumer protections.",
    },
}

_cached_declining_skills: Dict[str, Dict[str, Any]] = {}
_last_declining_fetch_time: float = 0.0


async def fetch_declining_skills_from_supabase() -> Dict[str, Dict[str, Any]]:
    """
    Dynamically loads declining / automation-risk skills from the Supabase trend_signals table.
    Caches results in-memory for 5 minutes for sub-millisecond evaluation.
    """
    global _cached_declining_skills, _last_declining_fetch_time

    # Return cached data if less than 5 minutes old
    if _cached_declining_skills and (time.time() - _last_declining_fetch_time < 300):
        return _cached_declining_skills

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return FALLBACK_DECLINING_SKILLS

    base_url = settings.SUPABASE_URL.rstrip("/")
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8]

    endpoint = f"{base_url}/rest/v1/trend_signals?status=eq.declining&select=skillName,velocityVs,sources"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(endpoint, headers=headers)
            if resp.status_code == 200:
                rows = resp.json()
                if isinstance(rows, list) and len(rows) > 0:
                    loaded: Dict[str, Dict[str, Any]] = {}
                    for r in rows:
                        s_name = r.get("skillName", "").lower().strip()
                        sources = r.get("sources", [])
                        reason = sources[0].get("citation", "Automated by modern AI & digital platforms") if sources else "High automation risk"
                        loaded[s_name] = {
                            "velocity": float(r.get("velocityVs", -0.35)),
                            "reason": reason,
                        }
                    _cached_declining_skills = loaded
                    _last_declining_fetch_time = time.time()
                    return loaded
    except Exception:
        pass

    return FALLBACK_DECLINING_SKILLS


# Comprehensive cross-domain synonym and variation mapping
SYNONYM_MAP = {
    # Data & Analytics
    "excel": "spreadsheet data manipulation",
    "vlookup": "spreadsheet data manipulation",
    "pivot table": "spreadsheet data manipulation",
    "google sheets": "spreadsheet data manipulation",
    "tableau": "data visualization",
    "power bi": "business intelligence dashboards",
    "powerbi": "business intelligence dashboards",
    "sql": "apply statistical analysis techniques",
    "mysql": "manage database software",
    "postgres": "manage database software",
    "postgresql": "manage database software",
    "pandas": "data analysis",
    "jupyter": "python scripting",
    "python": "python scripting",
    "coding": "software development",
    "programming": "software development",
    
    # AI, Cloud & Infrastructure
    "prompting": "generative ai prompting",
    "prompt engineering": "generative ai prompting",
    "chatgpt": "generative ai prompting",
    "claude": "generative ai prompting",
    "llm": "machine learning",
    "aws": "cloud infrastructure",
    "azure": "cloud infrastructure",
    "gcp": "cloud infrastructure",
    "docker": "containerized deployment",
    "kubernetes": "cloud orchestration",
    "git": "version control systems",
    "devops": "continuous integration pipelines",
    
    # ESG, Clean Energy & Environment
    "esg": "esg compliance reporting",
    "sustainability": "environmental impact assessment",
    "carbon": "scope 1 2 3 carbon accounting",
    "carbon footprint": "scope 1 2 3 carbon accounting",
    "solar": "solar energy systems",
    "renewable": "renewable energy technologies",
    "waste": "waste management strategies",
    
    # Logistics, Supply Chain & Operations
    "inventory": "inventory analytics",
    "stock taking": "inventory analytics",
    "warehouse": "warehouse management systems (wms)",
    "wms": "warehouse management systems",
    "procurement": "strategic purchasing and procurement",
    "purchasing": "strategic purchasing and procurement",
    "shipping": "freight and logistics coordination",
    "freight": "freight and logistics coordination",
    
    # Business, Customer Care & Management
    "customer service": "customer relationship management",
    "customer support": "customer relationship management",
    "client relation": "customer relationship management",
    "complaint handling": "customer relationship management",
    "conflict resolution": "interpersonal communication and negotiation",
    "negotiation": "interpersonal communication and negotiation",
    "invoicing": "simple bookkeeping reconciliation",
    "bookkeeping": "simple bookkeeping reconciliation",
    "data entry": "manual data entry",
    "filing": "routine document filing",

    # UI/UX & Design
    "figma": "user interface design",
    "ui design": "user interface design",
    "ux design": "user experience design",
    "photoshop": "digital media creation",
    "canva": "digital media creation",
    "wireframing": "user interface design",
    
    # Agritech & Health
    "sensor": "agricultural sensor systems",
    "drone": "drone mapping data",
    "telehealth": "telemedicine platform management",
    "telemedicine": "telemedicine platform management",
    "clinic": "clinical workflow coordination",
    "patient": "patient service optimization",
    "audit": "data collection & auditing",
}


def compute_string_similarity(s1: str, s2: str) -> float:
    """Computes token Jaccard similarity between two skill strings."""
    tokens1 = set(s1.lower().split()) 
    tokens2 = set(s2.lower().split())
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2) 
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)


def check_soft_match(user_skill_name: str, required_skill_name: str) -> bool:
    """
    Evaluates whether a user's skill matches a required role skill
    using direct inclusion, synonym dictionary mapping, or token similarity >= 0.60.
    """
    u_norm = user_skill_name.lower().strip()
    r_norm = required_skill_name.lower().strip()

    # Exact match
    if u_norm == r_norm:
        return True

    # Substring inclusion
    if u_norm in r_norm or r_norm in u_norm:
        return True

    # Check synonym mapping
    mapped_u = SYNONYM_MAP.get(u_norm, u_norm)
    mapped_r = SYNONYM_MAP.get(r_norm, r_norm)
    if mapped_u == mapped_r or mapped_u in mapped_r or mapped_r in mapped_u:
        return True

    # Token-level soft similarity threshold
    similarity = compute_string_similarity(u_norm, r_norm)
    return similarity >= 0.60



async def query_supabase_pgvector(
    user_vector: List[float],
    match_threshold: float = 0.15,
) -> Optional[List[Dict[str, Any]]]:
    """
    Queries Supabase pgvector using the match_roles RPC function to find
    the nearest occupational roles via cosine similarity.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None

    base_url = settings.SUPABASE_URL.rstrip("/")
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8]

    endpoint = f"{base_url}/rest/v1/rpc/match_roles"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "query_embedding": user_vector,
        "match_threshold": match_threshold,
        "match_count": 5,
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.post(endpoint, json=payload, headers=headers)
            if response.status_code == 200:
                rows = response.json()
                if isinstance(rows, list) and len(rows) > 0:
                    return rows
    except Exception:
        # Supabase migration not yet run or network offline -> seamlessly fallback
        pass

    return None


async def fetch_active_roles_from_supabase() -> List[Dict[str, Any]]:
    """
    Fetches the active catalog of real ESCO occupational roles dynamically from Supabase.
    Falls back to FALLBACK_ROLES_CATALOG if offline.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return FALLBACK_ROLES_CATALOG

    base_url = settings.SUPABASE_URL.rstrip("/")
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8]

    endpoint = f"{base_url}/rest/v1/esco_roles"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(endpoint, headers=headers)
            if resp.status_code == 200:
                rows = resp.json()
                if isinstance(rows, list) and len(rows) > 0:
                    formatted = []
                    for r in rows:
                        formatted.append({
                            "roleId": r["role_id"],
                            "title": r["title"],
                            "titleLocalized": {
                                "en": r["title"],
                                "ms": r.get("title_ms", r["title"]),
                                "zh": r.get("title_zh", r["title"]),
                            },
                            "industry": r["industry"],
                            "requiredSkills": r.get("required_skills", []),
                            "sdgAlignments": r.get("sdg_alignments", []),
                            "scenarioMultipliers": r.get("scenario_multipliers", {
                                "moderate": 1.0, "accelerated_ai": 1.0, "green_economy": 1.0
                            }),
                            "radarRequirement": r.get("radar_requirements", {
                                "AI & Digital Tools": 75,
                                "Data Literacy & Analytics": 75,
                                "Domain Operations": 80,
                                "Human Communication": 75,
                                "ESG & Sustainability": 70,
                            }),
                        })
                    return formatted
    except Exception:
        pass

    return FALLBACK_ROLES_CATALOG


async def evaluate_roles(
    profile: AnalyzeProfileData,
    scenario: MacroScenario,
    locale: str,
) -> Tuple[List[MatchedRole], List[RadarAxisItem]]:
    """
    Computes deterministic role match scores, itemizes strengths/gaps/at-risk skills,
    applies scenario multipliers, and computes radar chart dimensions.
    Integrates live ML vector embeddings from RunPod/Gemini and Supabase pgvector.
    """
    user_skills_list = [s.name for s in profile.skills]
    # Add tools/software into user skill set for broader matching
    if profile.toolsAndSoftware:
        user_skills_list.extend(profile.toolsAndSoftware)

    # 1. Fetch live active ESCO roles dynamically from Supabase
    active_roles = await fetch_active_roles_from_supabase()

    # 2. Generate live 1024-dim ML semantic embedding for candidate profile
    profile_summary = (
        f"Candidate Profile: {profile.currentJobTitle or 'Professional'}. "
        f"Sector: {profile.industry or 'Cross-Industry'}. "
        f"Competencies: {', '.join(user_skills_list[:15])}."
    )
    user_vector = await generate_embedding(profile_summary)

    # 3. Attempt querying Supabase pgvector stored procedure
    pgvector_rows = await query_supabase_pgvector(user_vector)
    pgvector_similarity_map = {r["role_id"]: float(r.get("similarity", 0.0)) for r in pgvector_rows} if pgvector_rows else {}

    matched_roles: List[MatchedRole] = []

    # Check at-risk skills across user competencies dynamically from Supabase trend signals
    declining_catalog = await fetch_declining_skills_from_supabase()
    at_risk_items: List[AtRiskSkillItem] = []
    for skill_name in user_skills_list:
        s_lower = skill_name.lower().strip()
        for declining_key, info in declining_catalog.items():
            if declining_key in s_lower or s_lower in declining_key:
                at_risk_items.append(
                    AtRiskSkillItem(
                        skillName=skill_name,
                        velocityScore=info["velocity"],
                        riskReason=info["reason"],
                    )
                )
                break

    for role_def in active_roles:
        required_skills = role_def["requiredSkills"]
        matched_strengths: List[str] = []
        skills_gap: List[str] = []

        for req_skill in required_skills:
            matched = False
            for user_skill in user_skills_list:
                if check_soft_match(user_skill, req_skill):
                    matched = True
                    matched_strengths.append(req_skill)
                    break
            if not matched:
                skills_gap.append(req_skill)

        # Mathematical scoring: BaseMatch = 0.60 * Cosine + 0.40 * SoftOverlap
        soft_overlap_ratio = len(matched_strengths) / max(len(required_skills), 1)
        estimated_cosine = min(1.0, 0.40 + (0.60 * soft_overlap_ratio))

        # If Supabase pgvector returned real cosine similarity for this role, use it!
        cosine_val = pgvector_similarity_map.get(role_def["roleId"], estimated_cosine)
        base_match = (0.60 * cosine_val) + (0.40 * soft_overlap_ratio)

        # Apply macro scenario multiplier
        multiplier = role_def["scenarioMultipliers"].get(scenario, 1.0)
        final_score = round(min(1.0, max(0.15, base_match * multiplier)), 3)

        # Pick localized title
        loc_title = role_def["titleLocalized"].get(locale, role_def["title"])

        matched_roles.append(
            MatchedRole(
                roleId=role_def["roleId"],
                title=role_def["title"],
                titleLocalized=loc_title,
                industry=role_def["industry"],
                matchScore=final_score,
                scenarioMultiplierApplied=multiplier,
                sdgAlignments=[SdgAlignmentItem(**sdg) for sdg in role_def["sdgAlignments"]],
                matchedStrengths=matched_strengths,
                skillsGap=skills_gap,
                atRiskCompetencies=at_risk_items,
            )
        )

    # Sort roles descending by matchScore
    matched_roles.sort(key=lambda x: x.matchScore, reverse=True)

    # Compute Radar Chart data comparing user baseline against top matched role
    top_role_def = next(
        (r for r in active_roles if r["roleId"] == matched_roles[0].roleId),
        active_roles[0],
    )
    req_radar = top_role_def["radarRequirement"]
    top_match_score = matched_roles[0].matchScore

    radar_data: List[RadarAxisItem] = []
    for category, req_val in req_radar.items():
        # Baseline user level calibrated by match score and category context
        user_val = int(req_val * (0.35 + 0.55 * top_match_score))
        radar_data.append(
            RadarAxisItem(
                category=category,
                userLevel=min(100, max(20, user_val)),
                requiredLevel=req_val,
            )
        )

    return matched_roles, radar_data
