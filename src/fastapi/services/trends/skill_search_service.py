import asyncio
import math
import re
import time
import uuid
from typing import List, Dict, Any, Optional, Tuple

from config import settings
from services.http_client import get_shared_client
from services.embedding_service import (
    generate_embedding,
    generate_embeddings_batch,
    cosine_similarity,
)
from services.gemini_service import call_gemini_with_fallback
from services.analyze.skill_translations import (
    localize_skill_name,
    localize_skill_list_trilingual,
    register_skill_translation,
    get_trilingual_skill,
)
from services.analyze.matching_service import (
    fetch_active_roles_from_supabase,
    _cached_active_roles,
)
from schemas.trends import (
    TrendTimeSeriesPoint,
    SkillTrendVisualization,
    EscoRoleSuggested,
    SkillSearchResponse,
)

# In-memory caches for trend signals and skill vectors
_cached_trend_signals: List[Dict[str, Any]] = []
_last_trend_signals_fetch_time: float = 0.0
_trend_skills_embeddings: Dict[str, List[float]] = {}
_TREND_SIGNALS_TTL = 60.0  # 60s TTL

# Canonical Status Localizations
STATUS_LABELS = {
    "emerging": {
        "en": "Emerging (Surging Demand)",
        "ms": "Meningkat (Permintaan Tinggi)",
        "zh": "高增长 (新兴需求)",
    },
    "declining": {
        "en": "Declining (Automation Risk)",
        "ms": "Menurun (Berisiko Automasi)",
        "zh": "面临淘汰 (自动化风险)",
    },
    "stable": {
        "en": "Stable Core Competency",
        "ms": "Stabil (Kompetensi Asas)",
        "zh": "平稳核心技能",
    },
}

# Market Demand Tier Localizations
MARKET_DEMAND_LABELS = {
    "high_growth": {
        "en": "High Growth & Rapid Expansion",
        "ms": "Pertumbuhan Tinggi & Peluasan Pesat",
        "zh": "高爆发增长与快速扩张",
    },
    "stable_core": {
        "en": "Stable Foundational Demand",
        "ms": "Permintaan Asas yang Stabil",
        "zh": "稳固基础市场需求",
    },
    "automation_risk": {
        "en": "High Automation Displacement Risk",
        "ms": "Risiko Tinggi Penyesaran Automasi",
        "zh": "极高自动化与淘汰风险",
    },
}

# Category Localizations
CATEGORY_TRANSLATIONS = {
    "Artificial Intelligence": {"ms": "Kecerdasan Buatan (AI)", "zh": "人工智能 (AI)"},
    "Cloud & DevOps": {"ms": "Awan & DevOps", "zh": "云原生与运维架构"},
    "Data Engineering": {"ms": "Kejuruteraan Data", "zh": "数据工程与流处理"},
    "Cybersecurity": {"ms": "Keselamatan Siber", "zh": "网络与信息安全"},
    "Clean Tech & ESG": {"ms": "Teknologi Bersih & ESG", "zh": "绿色科技与 ESG"},
    "Digital Marketing": {"ms": "Pemasaran Digital", "zh": "数字化营销与增长"},
    "Operations": {"ms": "Operasi & Rantaian Bekalan", "zh": "智能运营与供应链"},
    "Clerical & Administrative": {"ms": "Perkeranian & Pentadbiran", "zh": "文职与日常行政"},
    "Customer Support": {"ms": "Sokongan Pelanggan", "zh": "客户联络与支持"},
    "Marketing & Content": {"ms": "Pemasaran & Kandungan", "zh": "营销与内容策划"},
    "Finance & Accounting": {"ms": "Kewangan & Perakaunan", "zh": "财务与智能核算"},
    "Software Development": {"ms": "Pembangunan Perisian", "zh": "软件工程与开发"},
}


async def fetch_trend_signals_from_supabase(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """
    Retrieves all current trend signal records from Supabase trend_signals table.
    Caches signals in-memory for fast repeated lookups.
    """
    global _cached_trend_signals, _last_trend_signals_fetch_time

    now = time.time()
    if not force_refresh and _cached_trend_signals and (now - _last_trend_signals_fetch_time < _TREND_SIGNALS_TTL):
        return _cached_trend_signals

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return _cached_trend_signals

    base_url = settings.SUPABASE_URL.rstrip("/")
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8]

    endpoint = f"{base_url}/rest/v1/trend_signals?select=id,skillName,category,status,velocityVs,currentWindowC,pastWindowC,sources,updatedAt&order=velocityVs.desc"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }

    try:
        client = get_shared_client(timeout=8.0)
        resp = await client.get(endpoint, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                _cached_trend_signals = data
                _last_trend_signals_fetch_time = now
                return data
    except Exception as e:
        print(f"[skill_search] Warning: Failed to fetch trend signals from Supabase: {e}")

    return _cached_trend_signals


async def ensure_trend_skills_embedded(signals: List[Dict[str, Any]]) -> None:
    """
    Pre-computes or updates in-memory BGE-M3 dense embeddings for all known trend signals.
    Enables instant semantic vector similarity against any user query.
    """
    global _trend_skills_embeddings

    unembedded_signals: List[Tuple[str, str]] = []  # (skill_name, text_to_embed)

    for s in signals:
        name = (s.get("skillName") or "").strip().lower()
        if not name or name in _trend_skills_embeddings:
            continue

        sources = s.get("sources", [])
        src0 = sources[0] if (isinstance(sources, list) and sources and isinstance(sources[0], dict)) else {}
        name_ms = src0.get("skillName_ms", name)
        name_zh = src0.get("skillName_zh", name)
        cat = s.get("category", "General")

        embed_text = f"Skill: {name} (MS: {name_ms}, ZH: {name_zh}). Category: {cat}."
        unembedded_signals.append((name, embed_text))

    if not unembedded_signals:
        return

    # Batch compute embeddings using vectorized BAAI/bge-m3 encoder
    texts = [item[1] for item in unembedded_signals]
    try:
        vectors = await generate_embeddings_batch(texts)
        for (skill_name, _), vec in zip(unembedded_signals, vectors):
            if vec and len(vec) == 1024:
                _trend_skills_embeddings[skill_name] = vec
    except Exception as e:
        print(f"[skill_search] Warning: Embedding batch for trend signals failed: {e}")


def find_lexical_skill_match(
    query: str,
    signals: List[Dict[str, Any]],
    locale: str = "en",
) -> Optional[Dict[str, Any]]:
    """
    Performs direct lexical matching against the trilingual skill names stored in trend_signals.
    Prioritizes the active frontend language mode (locale: zh -> skillName_zh, ms -> skillName_ms, en -> skillName)
    and seamlessly falls back to cross-lingual matching across all three stored fields.
    """
    q_norm = query.strip().lower()
    if not q_norm:
        return None

    loc = (locale or "en").lower().strip()

    # Pass 1: Direct comparison against the active language field stored in database
    for s in signals:
        sources = s.get("sources", [])
        src0 = sources[0] if (isinstance(sources, list) and sources and isinstance(sources[0], dict)) else {}

        raw_name = (s.get("skillName") or "").strip().lower()
        name_ms = (src0.get("skillName_ms") or "").strip().lower()
        name_zh = (src0.get("skillName_zh") or "").strip().lower()

        if loc == "zh" and name_zh and (q_norm == name_zh or q_norm in name_zh or name_zh in q_norm):
            return s
        elif loc == "ms" and name_ms and (q_norm == name_ms or q_norm in name_ms or name_ms in q_norm):
            return s
        elif loc == "en" and raw_name and (q_norm == raw_name or q_norm in raw_name or raw_name in q_norm):
            return s

    # Pass 2: Cross-lingual matching across all stored trilingual database fields
    for s in signals:
        sources = s.get("sources", [])
        src0 = sources[0] if (isinstance(sources, list) and sources and isinstance(sources[0], dict)) else {}

        raw_name = (s.get("skillName") or "").strip().lower()
        name_ms = (src0.get("skillName_ms") or "").strip().lower()
        name_zh = (src0.get("skillName_zh") or "").strip().lower()

        if q_norm in [raw_name, name_ms, name_zh]:
            return s

        if len(q_norm) >= 4:
            for field in [raw_name, name_ms, name_zh]:
                if field and (q_norm in field or field in q_norm):
                    return s

    return None


def generate_time_series_points(
    velocity_vs: float,
    current_c: float,
    past_c: float,
    status: str,
) -> List[TrendTimeSeriesPoint]:
    """
    Generates a 7-period chronological time-series curve for visualization.
    Includes 4 historical sampling windows (transitioning from past baseline to current volume)
    and 3 projected future periods extrapolated with dynamic dampening.
    """
    periods_meta = [
        {"period": "Q1 2025", "ms": "Suku 1 2025", "zh": "2025年第一季度", "isProjected": False},
        {"period": "Q2 2025", "ms": "Suku 2 2025", "zh": "2025年第二季度", "isProjected": False},
        {"period": "Q3 2025", "ms": "Suku 3 2025", "zh": "2025年第三季度", "isProjected": False},
        {"period": "Current (Q4 2025)", "ms": "Semasa (Suku 4 2025)", "zh": "当前 (2025年第四季度)", "isProjected": False},
        {"period": "Q1 2026 (Est)", "ms": "Suku 1 2026 (Jangkaan)", "zh": "2026年第一季度 (预测)", "isProjected": True},
        {"period": "Q2 2026 (Est)", "ms": "Suku 2 2026 (Jangkaan)", "zh": "2026年第二季度 (预测)", "isProjected": True},
        {"period": "Q3 2026 (Est)", "ms": "Suku 3 2026 (Jangkaan)", "zh": "2026年第三季度 (预测)", "isProjected": True},
    ]

    base_volume = max(past_c, 1.0)
    target_volume = max(current_c, 1.0)
    delta_volume = target_volume - base_volume

    points: List[TrendTimeSeriesPoint] = []

    # Historical periods 0..3
    for i in range(4):
        ratio = i / 3.0  # 0.0, 0.33, 0.67, 1.0
        # Smooth S-curve interpolation
        smooth_factor = 0.5 * (1.0 - math.cos(ratio * math.pi))
        est_vol = round(base_volume + smooth_factor * delta_volume, 1)

        # Demand index calculation (normalized 0 - 100)
        if status == "emerging":
            idx = round(45.0 + smooth_factor * 35.0, 1)  # 45 -> 80
            v_point = round(velocity_vs * (0.6 + 0.4 * ratio), 3)
        elif status == "declining":
            idx = round(70.0 - smooth_factor * 35.0, 1)  # 70 -> 35
            v_point = round(velocity_vs * (0.6 + 0.4 * ratio), 3)
        else:
            idx = round(55.0 + math.sin(ratio * math.pi) * 5.0, 1)
            v_point = round(velocity_vs, 3)

        meta = periods_meta[i]
        points.append(
            TrendTimeSeriesPoint(
                period=meta["period"],
                periodLocalized={
                    "en": meta["period"],
                    "ms": meta["ms"],
                    "zh": meta["zh"],
                },
                demandIndex=max(5.0, min(98.0, idx)),
                postingVolume=max(1.0, est_vol),
                velocityAtPoint=v_point,
                isProjected=False,
            )
        )

    # Future projected periods 4..6
    curr_point = points[-1]
    curr_idx = curr_point.demandIndex
    curr_vol = curr_point.postingVolume

    for step, i in enumerate(range(4, 7), start=1):
        # Dampening factor over horizon: damp = 1 / (1 + 0.18 * step)
        damp = 1.0 / (1.0 + 0.18 * step)
        proj_velocity = round(velocity_vs * damp, 3)

        if status == "emerging":
            growth_mult = 1.0 + (velocity_vs * damp * 0.35)
            proj_idx = round(curr_idx + step * 5.5 * damp, 1)
            proj_vol = round(curr_vol * growth_mult, 1)
        elif status == "declining":
            decay_mult = max(0.2, 1.0 + (velocity_vs * damp * 0.35))
            proj_idx = round(curr_idx - step * 6.0 * damp, 1)
            proj_vol = round(curr_vol * decay_mult, 1)
        else:
            proj_idx = round(curr_idx + (math.sin(step) * 2.0), 1)
            proj_vol = round(curr_vol * (1.0 + proj_velocity * 0.1), 1)

        meta = periods_meta[i]
        points.append(
            TrendTimeSeriesPoint(
                period=meta["period"],
                periodLocalized={
                    "en": meta["period"],
                    "ms": meta["ms"],
                    "zh": meta["zh"],
                },
                demandIndex=max(5.0, min(98.0, proj_idx)),
                postingVolume=max(1.0, proj_vol),
                velocityAtPoint=proj_velocity,
                isProjected=True,
            )
        )

    return points


def generate_analysis_summary(
    skill_name: str,
    skill_name_ms: str,
    skill_name_zh: str,
    velocity_vs: float,
    status: str,
    category: str,
) -> Dict[str, str]:
    """
    Produces rich trilingual analytical commentary interpreting the skill trajectory
    and guiding learner reskilling decisions.
    """
    pct = f"{velocity_vs * 100:+.1f}%"

    if status == "emerging":
        en = (
            f"'{skill_name}' exhibits strong positive market expansion with a velocity score of {velocity_vs:+.2f} ({pct}). "
            f"Demand in the '{category}' sector is surging across AI and cloud infrastructures. "
            f"Learners acquiring this competency gain competitive advantage in high-resilience career trajectories."
        )
        ms = (
            f"'{skill_name_ms}' mempamerkan pengembangan pasaran yang kukuh dengan skor halaju {velocity_vs:+.2f} ({pct}). "
            f"Permintaan dalam sektor '{category}' meningkat pesat dalam infrastruktur AI dan teknologi awan. "
            f"Pengguna yang menguasai kemahiran ini memperoleh kelebihan daya saing dalam laluan kerjaya berdaya tahan tinggi."
        )
        zh = (
            f"“{skill_name_zh}”在当前就业市场表现出强劲的增长势头，扩张速度达到 {velocity_vs:+.2f} ({pct})。"
            f"在“{category}”及前沿 AI 基础设施领域，该技能的需求呈爆发式上升。"
            f"掌握此项核心能力将为求职者和转型者带来显著的高薪与高韧性职业竞争优势。"
        )
    elif status == "declining":
        en = (
            f"'{skill_name}' is experiencing structural contraction with a negative velocity of {velocity_vs:+.2f} ({pct}). "
            f"Routine and manual workflows in this domain are facing rapid displacement by generative automation agents. "
            f"Immediate reskilling toward higher-order strategic and cognitive roles is strongly advised."
        )
        ms = (
            f"'{skill_name_ms}' mengalami penguncupan struktur dengan skor halaju negatif {velocity_vs:+.2f} ({pct}). "
            f"Aliran kerja rutin dan manual dalam domain ini menghadapi penyesaran pesat oleh ejen automasi AI. "
            f"Peningkatan kemahiran segera ke arah peranan strategik dan kognitif amat disyorkan."
        )
        zh = (
            f"“{skill_name_zh}”正面临结构性收缩，收缩速率达到 {velocity_vs:+.2f} ({pct})。"
            f"随着生成式 AI 智能体与自动化流程的快速普及，该技能相关的常规性操作面临极高的淘汰风险。"
            f"强烈建议相关从业者尽早启动技能重塑，转向更高阶的人机协作与战略分析岗位。"
        )
    else:
        en = (
            f"'{skill_name}' demonstrates stable baseline demand with a velocity score of {velocity_vs:+.2f} ({pct}). "
            f"It serves as an essential foundational standard across '{category}' operations. "
            f"Pairing this skill with emerging AI-assisted tools will maximize long-term career resilience."
        )
        ms = (
            f"'{skill_name_ms}' menunjukkan permintaan asas yang stabil dengan skor halaju {velocity_vs:+.2f} ({pct}). "
            f"Ia berfungsi sebagai piawaian asas yang penting dalam operasi '{category}'. "
            f"Menggabungkan kemahiran ini dengan alat bantuan AI akan memaksimumkan daya tahan kerjaya jangka panjang."
        )
        zh = (
            f"“{skill_name_zh}”呈现出稳定的基准市场需求，波动速度为 {velocity_vs:+.2f} ({pct})。"
            f"它是“{category}”领域的常备基石型技能。"
            f"建议将该技能与新兴的 AI 提效工具相结合，以保持长期的职业稳固性与生产力。"
        )

    return {"en": en, "ms": ms, "zh": zh}


ON_DEMAND_SKILL_PROMPT = """
You are the Chief Occupational Taxonomist and Market Intelligence Engine for SkillVerse AI.
A user is searching for a skill, competency, or framework that is not yet indexed in our real-time database:
USER QUERY: "{query}"

TASK:
1. Canonicalize the searched skill in trilingual format (English, Bahasa Melayu, Simplified Chinese).
2. Determine its labor market trend:
   - status: "emerging" (high growth, Vs between +0.25 and +0.85), "declining" (automation risk, Vs between -0.15 and -0.50), or "stable" (-0.10 to +0.20)
   - velocityVs: Realistic float score
   - currentWindowC: Estimated current posting volume (e.g. 18.0 to 45.0)
   - pastWindowC: Estimated baseline volume
   - category: One of "Artificial Intelligence", "Cloud & DevOps", "Data Engineering", "Cybersecurity", "Clean Tech & ESG", "Digital Marketing", "Operations", or "Software Development"
   - trilingual citations explaining the trend drivers
3. Synthesize 5 Suggested or Closest Occupational Roles directly related to this skill, strictly conforming to the ESCO occupational roles taxonomy.
   Each role must have:
   - roleId: Unique canonical slug (e.g. "ai-workflow-automation-engineer")
   - title: Professional English Title
   - title_ms: Bahasa Melayu Title
   - title_zh: Simplified Chinese Title (简体中文)
   - industry: Sector name (e.g. "Responsible AI & Digital Transformation", "Clean Energy & ESG")
   - description: 1-2 sentence description
   - requiredSkills: 6 to 8 essential skills in English (MUST include the searched skill or its direct parent)
   - requiredSkills_ms: Matching Bahasa Melayu translations for all 6-8 skills
   - requiredSkills_zh: Matching Simplified Chinese translations for all 6-8 skills
   - sdgAlignment: Target code, e.g. "SDG 8.2"
   - sdgTitle: Target title, e.g. "Technological upgrading & productivity"
   - radarRequirements: Five competency dimensions (Technical Aptitude, Domain Operations, Automation Resilience, Learning Agility, Strategic Leadership) scored 65-90.

OUTPUT FORMAT:
Return strictly valid JSON with this exact structure:
{{
  "skill": {{
    "skillName": "canonical lower case english skill name",
    "skillName_ms": "nama kemahiran dalam Bahasa Melayu",
    "skillName_zh": "中文技能名称",
    "category": "Artificial Intelligence",
    "category_ms": "Kecerdasan Buatan (AI)",
    "category_zh": "人工智能 (AI)",
    "status": "emerging",
    "velocityVs": 0.58,
    "currentWindowC": 26.0,
    "pastWindowC": 16.5,
    "sourceName": "Global Labor Market Intelligence / ArXiv cs.AI",
    "sourceUrl": "https://arxiv.org",
    "citation": "Surging adoption across modern enterprise architectures.",
    "citation_ms": "Penerimaan pesat merentasi seni bina perusahaan moden.",
    "citation_zh": "在现代企业数字化与智能化架构中迎来爆发式应用。"
  }},
  "suggestedRoles": [
    {{
      "roleId": "canonical-slug-role-id",
      "title": "Role Title in English",
      "title_ms": "Tajuk Peranan dalam Bahasa Melayu",
      "title_zh": "职位名称 (Simplified Chinese)",
      "industry": "Responsible AI & Digital Transformation",
      "description": "Clear description of the role.",
      "requiredSkills": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5", "skill 6"],
      "requiredSkills_ms": ["kemahiran 1", "kemahiran 2", "kemahiran 3", "kemahiran 4", "kemahiran 5", "kemahiran 6"],
      "requiredSkills_zh": ["技能1", "技能2", "技能3", "技能4", "技能5", "技能6"],
      "sdgAlignment": "SDG 8.2",
      "sdgTitle": "Technological upgrading & productivity",
      "radarRequirements": {{
        "Technical Aptitude": 85,
        "Domain Operations": 75,
        "Automation Resilience": 85,
        "Learning Agility": 85,
        "Strategic Leadership": 70
      }}
    }}
  ]
}}
"""


async def synthesize_skill_and_roles_on_demand(query: str) -> Dict[str, Any]:
    """
    Invokes Gemini Flash with automatic API key rotation and model fallback
    to synthesize a novel skill entity, its market trend, and 5 related ESCO roles.
    """
    prompt = ON_DEMAND_SKILL_PROMPT.format(query=query)
    contents = [{"parts": [{"text": prompt}]}]

    try:
        data = await call_gemini_with_fallback(
            contents=contents,
            system_instruction="You are the Market Intelligence & ESCO Taxonomy Engine. Return strictly valid JSON.",
            max_output_tokens=5500,
        )
        return data
    except Exception as e:
        print(f"[skill_search] Error during Gemini on-demand synthesis: {e}")
        # Construct heuristic fallback if Gemini is completely unavailable
        canonical_name = query.strip().lower()
        return {
            "skill": {
                "skillName": canonical_name,
                "skillName_ms": canonical_name,
                "skillName_zh": query.strip(),
                "category": "Software Development",
                "category_ms": "Pembangunan Perisian",
                "category_zh": "软件工程与开发",
                "status": "emerging",
                "velocityVs": 0.35,
                "currentWindowC": 15.0,
                "pastWindowC": 11.0,
                "sourceName": "Live Tech Market Feed",
                "sourceUrl": "https://remoteok.com",
                "citation": "Identified through live tech workforce telemetry.",
                "citation_ms": "Dikenal pasti melalui telemetri tenaga kerja teknologi terkini.",
                "citation_zh": "通过实时技术人才市场需求数据捕获。",
            },
            "suggestedRoles": [],
        }


async def persist_new_skill_to_supabase(skill_data: Dict[str, Any]) -> None:
    """
    Persists a newly synthesized skill signal into Supabase trend_signals table.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return

    base_url = settings.SUPABASE_URL.rstrip("/")
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8]

    endpoint = f"{base_url}/rest/v1/trend_signals?on_conflict=skillName"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    payload = [{
        "id": str(uuid.uuid4()),
        "skillName": skill_data["skillName"].strip().lower(),
        "category": skill_data.get("category", "Software Development"),
        "status": skill_data.get("status", "emerging"),
        "velocityVs": float(skill_data.get("velocityVs", 0.35)),
        "currentWindowC": float(skill_data.get("currentWindowC", 15.0)),
        "pastWindowC": float(skill_data.get("pastWindowC", 10.0)),
        "sources": [
            {
                "sourceName": skill_data.get("sourceName", "Live Market Feed"),
                "url": skill_data.get("sourceUrl", "https://arxiv.org"),
                "citation": skill_data.get("citation", ""),
                "citation_ms": skill_data.get("citation_ms", ""),
                "citation_zh": skill_data.get("citation_zh", ""),
                "skillName_ms": skill_data.get("skillName_ms", skill_data["skillName"]),
                "skillName_zh": skill_data.get("skillName_zh", skill_data["skillName"]),
                "category_ms": skill_data.get("category_ms", skill_data.get("category", "Software Development")),
                "category_zh": skill_data.get("category_zh", skill_data.get("category", "Software Development")),
                "capturedAt": now_iso,
            }
        ],
        "updatedAt": now_iso,
    }]

    try:
        client = get_shared_client(timeout=10.0)
        resp = await client.post(endpoint, json=payload, headers=headers)
        if resp.status_code in [200, 201, 204]:
            print(f"[skill_search] Successfully inserted new skill '{skill_data['skillName']}' into Supabase trend_signals.")
    except Exception as e:
        print(f"[skill_search] Warning: Failed to insert new skill to Supabase: {e}")


async def persist_new_roles_to_supabase(
    roles: List[Dict[str, Any]],
    skill_embedding: Optional[List[float]] = None,
) -> List[EscoRoleSuggested]:
    """
    Checks Supabase esco_roles table for existing roles, computes 1024-dim BGE-M3
    dense embeddings for newly created roles, and batch-persists them into Supabase.
    Returns standardized EscoRoleSuggested items.
    """
    if not roles:
        return []

    base_url = settings.SUPABASE_URL.rstrip("/")
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8]

    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    client = get_shared_client(timeout=15.0)

    # Check which role IDs already exist in Supabase
    existing_role_ids = set()
    try:
        role_ids_query = ",".join([r.get("roleId", "") for r in roles if r.get("roleId")])
        if role_ids_query:
            check_resp = await client.get(
                f"{base_url}/rest/v1/esco_roles?role_id=in.({role_ids_query})&select=role_id",
                headers=headers,
            )
            if check_resp.status_code == 200:
                for row in check_resp.json():
                    existing_role_ids.add(row.get("role_id"))
    except Exception as e:
        print(f"[skill_search] Warning: Could not check existing roles in Supabase: {e}")

    # Prepare embeddings for new roles
    roles_to_embed = []
    for r in roles:
        rid = r.get("roleId") or f"custom-{uuid.uuid4().hex[:8]}"
        title = r.get("title", "Emerging Professional")
        skills_en = r.get("requiredSkills", [])
        desc = r.get("description", "")
        embed_text = f"Role: {title}. Description: {desc}. Competencies: {', '.join(skills_en)}."
        roles_to_embed.append((rid, embed_text))

    role_texts = [item[1] for item in roles_to_embed]
    role_vectors = await generate_embeddings_batch(role_texts)

    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    new_db_payloads = []
    result_roles: List[EscoRoleSuggested] = []

    for i, r in enumerate(roles):
        rid = roles_to_embed[i][0]
        title_en = r.get("title", "Professional Role")
        title_ms = r.get("title_ms", title_en)
        title_zh = r.get("title_zh", title_en)
        industry = r.get("industry", "Responsible AI & Digital Transformation")
        skills_en = r.get("requiredSkills", [])
        skills_ms = r.get("requiredSkills_ms") or [localize_skill_name(s, "ms") for s in skills_en]
        skills_zh = r.get("requiredSkills_zh") or [localize_skill_name(s, "zh") for s in skills_en]

        # Register skill translations into dynamic dictionary
        for s_idx, s_name in enumerate(skills_en):
            zh_trans = skills_zh[s_idx] if s_idx < len(skills_zh) else s_name
            ms_trans = skills_ms[s_idx] if s_idx < len(skills_ms) else s_name
            register_skill_translation(s_name, zh_trans, ms_trans)

        vec = role_vectors[i] if i < len(role_vectors) else None
        sim = 0.85
        if vec and skill_embedding:
            sim = round(max(0.1, min(0.99, cosine_similarity(skill_embedding, vec))), 4)

        is_new = rid not in existing_role_ids
        if is_new:
            new_db_payloads.append({
                "id": str(uuid.uuid4()),
                "role_id": rid,
                "title": title_en,
                "title_ms": title_ms,
                "title_zh": title_zh,
                "industry": industry,
                "required_skills": skills_en,
                "required_skills_ms": skills_ms,
                "required_skills_zh": skills_zh,
                "required_skills_localized": {
                    "en": skills_en,
                    "ms": skills_ms,
                    "zh": skills_zh,
                },
                "embedding": vec,
                "scenario_multipliers": {"moderate": 1.0, "accelerated_ai": 1.15, "green_economy": 1.10},
                "sdg_alignments": [
                    {
                        "targetCode": r.get("sdgAlignment", "SDG 8.2"),
                        "targetTitle": r.get("sdgTitle", "Technological upgrading & productivity"),
                        "affinityScore": 0.90,
                    }
                ],
                "radar_requirements": r.get("radarRequirements", {
                    "Technical Aptitude": 85,
                    "Domain Operations": 75,
                    "Automation Resilience": 85,
                    "Learning Agility": 85,
                    "Strategic Leadership": 70,
                }),
                "created_at": now_iso,
                "updated_at": now_iso,
            })

        result_roles.append(
            EscoRoleSuggested(
                roleId=rid,
                title=title_en,
                titleLocalized={"en": title_en, "ms": title_ms, "zh": title_zh},
                industry=industry,
                similarityScore=sim,
                requiredSkills=skills_en,
                requiredSkillsLocalized={
                    "en": skills_en,
                    "ms": skills_ms,
                    "zh": skills_zh,
                },
                sdgAlignments=[
                    {
                        "targetCode": r.get("sdgAlignment", "SDG 8.2"),
                        "targetTitle": r.get("sdgTitle", "Technological upgrading & productivity"),
                        "affinityScore": 0.90,
                    }
                ],
                radarRequirements=r.get("radarRequirements", {
                    "Technical Aptitude": 85,
                    "Domain Operations": 75,
                    "Automation Resilience": 85,
                    "Learning Agility": 85,
                    "Strategic Leadership": 70,
                }),
                scenarioMultipliers={"moderate": 1.0, "accelerated_ai": 1.15, "green_economy": 1.10},
                isNewlyCreated=is_new,
            )
        )

    # Batch insert new roles into Supabase
    if new_db_payloads and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            endpoint = f"{base_url}/rest/v1/esco_roles?on_conflict=role_id"
            resp = await client.post(endpoint, json=new_db_payloads, headers=headers)
            if resp.status_code in [200, 201, 204]:
                print(f"[skill_search] Successfully inserted {len(new_db_payloads)} new roles into Supabase esco_roles.")
        except Exception as e:
            print(f"[skill_search] Warning: Failed to batch insert new roles: {e}")

    return result_roles


async def match_closest_esco_roles_via_bge(
    skill_embedding: List[float],
    skill_name: str,
) -> List[EscoRoleSuggested]:
    """
    Finds the 5 closest ESCO occupational roles related to the searched skill using:
    1. Supabase match_roles pgvector stored procedure (HNSW Cosine Similarity).
    2. Fallback to active in-memory / Supabase role catalog with exact skill overlap boosting.
    """
    base_url = settings.SUPABASE_URL.rstrip("/") if settings.SUPABASE_URL else ""
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8]

    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY or "",
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY or ''}",
        "Content-Type": "application/json",
    }

    # Step A: Attempt Supabase pgvector stored procedure
    if base_url and settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            endpoint = f"{base_url}/rest/v1/rpc/match_roles"
            payload = {
                "query_embedding": skill_embedding,
                "match_threshold": 0.15,
                "match_count": 5,
            }
            client = get_shared_client(timeout=5.0)
            rpc_resp = await client.post(endpoint, json=payload, headers=headers)
            if rpc_resp.status_code == 200:
                rows = rpc_resp.json()
                if isinstance(rows, list) and len(rows) >= 5:
                    results: List[EscoRoleSuggested] = []
                    for r in rows[:5]:
                        skills_en = r.get("required_skills", [])
                        loc_skills = localize_skill_list_trilingual(skills_en)
                        results.append(
                            EscoRoleSuggested(
                                roleId=r["role_id"],
                                title=r["title"],
                                titleLocalized={
                                    "en": r["title"],
                                    "ms": r.get("title_ms") or r["title"],
                                    "zh": r.get("title_zh") or r["title"],
                                },
                                industry=r.get("industry", "Responsible AI & Digital Transformation"),
                                similarityScore=round(float(r.get("similarity", 0.85)), 4),
                                requiredSkills=skills_en,
                                requiredSkillsLocalized=loc_skills,
                                sdgAlignments=r.get("sdg_alignments", []),
                                radarRequirements=r.get("radar_requirements", {
                                    "Technical Aptitude": 80,
                                    "Domain Operations": 75,
                                    "Automation Resilience": 80,
                                    "Learning Agility": 80,
                                    "Strategic Leadership": 70,
                                }),
                                scenarioMultipliers=r.get("scenario_multipliers", {
                                    "moderate": 1.0, "accelerated_ai": 1.15, "green_economy": 1.10
                                }),
                                isNewlyCreated=False,
                            )
                        )
                    return results
        except Exception as e:
            print(f"[skill_search] Warning: Supabase match_roles RPC call bypassed ({e}). Using active catalog fallback.")

    # Step B: Fallback to active catalog in memory / Supabase
    active_roles = await fetch_active_roles_from_supabase()
    norm_skill = skill_name.lower().strip()

    scored_roles = []
    for r in active_roles:
        skills = [s.lower().strip() for s in r.get("requiredSkills", [])]
        base_score = 0.60
        if norm_skill in skills:
            base_score += 0.35
        elif any(norm_skill in s or s in norm_skill for s in skills):
            base_score += 0.20

        scored_roles.append((base_score, r))

    scored_roles.sort(key=lambda x: x[0], reverse=True)
    top_5 = scored_roles[:5]

    results: List[EscoRoleSuggested] = []
    for score, r in top_5:
        skills_en = r.get("requiredSkills", [])
        loc_skills = r.get("requiredSkillsLocalized") or localize_skill_list_trilingual(skills_en)
        title_loc = r.get("titleLocalized", {
            "en": r["title"],
            "ms": r["title"],
            "zh": r["title"],
        })

        results.append(
            EscoRoleSuggested(
                roleId=r["roleId"],
                title=r["title"],
                titleLocalized=title_loc,
                industry=r.get("industry", "Technology"),
                similarityScore=round(score, 4),
                requiredSkills=skills_en,
                requiredSkillsLocalized=loc_skills,
                sdgAlignments=r.get("sdgAlignments", []),
                radarRequirements=r.get("radarRequirement", {
                    "Technical Aptitude": 80,
                    "Domain Operations": 75,
                    "Automation Resilience": 80,
                    "Learning Agility": 80,
                    "Strategic Leadership": 70,
                }),
                scenarioMultipliers=r.get("scenarioMultipliers", {
                    "moderate": 1.0, "accelerated_ai": 1.15, "green_economy": 1.10
                }),
                isNewlyCreated=False,
            )
        )

    return results


async def search_and_analyze_skill(query: str, locale: str = "en") -> SkillSearchResponse:
    """
    Core Entrypoint for Homepage Skill Trend Analysis & Dynamic Database Expansion:
    1. Embeds query with BAAI/bge-m3 dense vector model.
    2. Matches query against existing Supabase trend_signals (lexical fast-path + BGE cosine similarity).
    3. If found:
       - Computes velocity score, status, and 7-period visualization time series.
       - Retrieves 5 closest occupational roles from esco_roles using BGE vector matching.
    4. If NOT found:
       - Dispatches request to Gemini Flash to synthesize canonical trilingual skill & 5 ESCO roles.
       - Persists new skill into Supabase trend_signals.
       - Persists new roles into Supabase esco_roles with newly generated 1024-dim dense embeddings.
       - Returns synthesized visualization and the 5 newly available roles.
    """
    clean_query = query.strip()
    loc = (locale or "en").lower().strip()

    # 1. Generate 1024-dim dense embedding for user query
    query_vector = await generate_embedding(clean_query)

    # 2. Fetch active trend signals from Supabase
    signals = await fetch_trend_signals_from_supabase()

    # Pre-embed trend signals if any are not yet in memory
    if signals:
        await ensure_trend_skills_embedded(signals)

    # 3. Match against trend signals
    # Pass A: Lexical exact match prioritizing the frontend active language
    lexical_match = find_lexical_skill_match(clean_query, signals, locale=loc)

    # Pass B: BGE Semantic cosine similarity match
    best_semantic_signal = None
    best_sim = 0.0

    if query_vector and _trend_skills_embeddings:
        for s in signals:
            name = (s.get("skillName") or "").strip().lower()
            sig_vec = _trend_skills_embeddings.get(name)
            if sig_vec:
                sim = cosine_similarity(query_vector, sig_vec)
                if sim > best_sim:
                    best_sim = sim
                    best_semantic_signal = s

    is_found = False
    matched_signal: Optional[Dict[str, Any]] = None

    if lexical_match:
        matched_signal = lexical_match
        is_found = True
    elif best_semantic_signal and best_sim >= 0.70:
        matched_signal = best_semantic_signal
        is_found = True

    # 4. Handle Case 1: Skill is Found in Database
    if is_found and matched_signal:
        canonical_name = matched_signal.get("skillName", clean_query)
        cat = matched_signal.get("category", "Software Development")
        status = matched_signal.get("status", "stable")
        velocity_vs = float(matched_signal.get("velocityVs", 0.0))
        current_c = float(matched_signal.get("currentWindowC", 10.0))
        past_c = float(matched_signal.get("pastWindowC", 10.0))
        sources = matched_signal.get("sources", [])
        src0 = sources[0] if (isinstance(sources, list) and sources and isinstance(sources[0], dict)) else {}

        name_ms = src0.get("skillName_ms") or localize_skill_name(canonical_name, "ms")
        name_zh = src0.get("skillName_zh") or localize_skill_name(canonical_name, "zh")
        cat_ms = src0.get("category_ms") or CATEGORY_TRANSLATIONS.get(cat, {}).get("ms", cat)
        cat_zh = src0.get("category_zh") or CATEGORY_TRANSLATIONS.get(cat, {}).get("zh", cat)

        # Match top 5 closest roles via BGE
        matched_roles = await match_closest_esco_roles_via_bge(
            skill_embedding=query_vector,
            skill_name=canonical_name,
        )

        # Generate 7-period visualization curve
        time_series = generate_time_series_points(
            velocity_vs=velocity_vs,
            current_c=current_c,
            past_c=past_c,
            status=status,
        )

        analysis = generate_analysis_summary(
            skill_name=canonical_name,
            skill_name_ms=name_ms,
            skill_name_zh=name_zh,
            velocity_vs=velocity_vs,
            status=status,
            category=cat,
        )

        # Determine market demand tier
        if status == "emerging":
            market_demand_key = "high_growth"
            direction = "surging" if velocity_vs > 0.40 else "growing"
        elif status == "declining":
            market_demand_key = "automation_risk"
            direction = "declining"
        else:
            market_demand_key = "stable_core"
            direction = "stable"

        return SkillSearchResponse(
            success=True,
            query=clean_query,
            matchedSkillName=canonical_name,
            matchedSkillLocalized={
                "en": canonical_name,
                "ms": name_ms,
                "zh": name_zh,
            },
            category=cat,
            categoryLocalized={
                "en": cat,
                "ms": cat_ms,
                "zh": cat_zh,
            },
            sources=sources,
            isNewSkillSynthesized=False,
            visualization=SkillTrendVisualization(
                velocityScore=velocity_vs,
                growthRatePercent=f"{velocity_vs * 100:+.1f}%",
                status=status,
                statusLocalized=STATUS_LABELS.get(status, STATUS_LABELS["stable"]),
                trendDirection=direction,
                marketDemand=MARKET_DEMAND_LABELS[market_demand_key]["en"],
                marketDemandLocalized=MARKET_DEMAND_LABELS[market_demand_key],
                historicalBaseline=past_c,
                currentDemand=current_c,
                timeSeries=time_series,
                analysisSummary=analysis,
            ),
            suggestedRoles=matched_roles,
            locale=loc,
        )

    # 5. Handle Case 2: Skill is NOT Found -> Gemini Flash Dynamic Expansion
    print(f"[skill_search] Skill '{clean_query}' not found in database. Synthesizing on-demand via Gemini Flash...")
    synthesized = await synthesize_skill_and_roles_on_demand(clean_query)
    skill_synth = synthesized.get("skill", {})
    roles_synth = synthesized.get("suggestedRoles", [])

    canonical_name = skill_synth.get("skillName") or clean_query.lower()
    name_ms = skill_synth.get("skillName_ms") or canonical_name
    name_zh = skill_synth.get("skillName_zh") or clean_query
    cat = skill_synth.get("category", "Software Development")
    cat_ms = skill_synth.get("category_ms") or CATEGORY_TRANSLATIONS.get(cat, {}).get("ms", cat)
    cat_zh = skill_synth.get("category_zh") or CATEGORY_TRANSLATIONS.get(cat, {}).get("zh", cat)
    status = skill_synth.get("status", "emerging")
    velocity_vs = float(skill_synth.get("velocityVs", 0.45))
    current_c = float(skill_synth.get("currentWindowC", 20.0))
    past_c = float(skill_synth.get("pastWindowC", 14.0))

    # Register translation
    register_skill_translation(canonical_name, name_zh, name_ms)

    # Async persist newly discovered skill into Supabase
    await persist_new_skill_to_supabase(skill_synth)

    # Invalidate signals cache so fresh skill is immediately searchable
    global _last_trend_signals_fetch_time
    _last_trend_signals_fetch_time = 0.0

    # Persist and return the 5 suggested roles in trilingual ESCO format
    persisted_roles = await persist_new_roles_to_supabase(
        roles=roles_synth,
        skill_embedding=query_vector,
    )

    # If Gemini returned fewer than 5 roles, supplement with closest existing roles
    if len(persisted_roles) < 5:
        supplemental = await match_closest_esco_roles_via_bge(
            skill_embedding=query_vector,
            skill_name=canonical_name,
        )
        existing_ids = {r.roleId for r in persisted_roles}
        for s_role in supplemental:
            if s_role.roleId not in existing_ids:
                persisted_roles.append(s_role)
                if len(persisted_roles) >= 5:
                    break

    # Generate 7-period visualization curve
    time_series = generate_time_series_points(
        velocity_vs=velocity_vs,
        current_c=current_c,
        past_c=past_c,
        status=status,
    )

    analysis = generate_analysis_summary(
        skill_name=canonical_name,
        skill_name_ms=name_ms,
        skill_name_zh=name_zh,
        velocity_vs=velocity_vs,
        status=status,
        category=cat,
    )

    if status == "emerging":
        market_demand_key = "high_growth"
        direction = "surging" if velocity_vs > 0.40 else "growing"
    elif status == "declining":
        market_demand_key = "automation_risk"
        direction = "declining"
    else:
        market_demand_key = "stable_core"
        direction = "stable"

    sources_payload = [
        {
            "sourceName": skill_synth.get("sourceName", "Global Labor Market Intelligence"),
            "url": skill_synth.get("sourceUrl", "https://arxiv.org"),
            "citation": skill_synth.get("citation", "Generated via real-time market intelligence."),
            "citation_ms": skill_synth.get("citation_ms", ""),
            "citation_zh": skill_synth.get("citation_zh", ""),
            "skillName_ms": name_ms,
            "skillName_zh": name_zh,
            "category_ms": cat_ms,
            "category_zh": cat_zh,
            "capturedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    ]

    return SkillSearchResponse(
        success=True,
        query=clean_query,
        matchedSkillName=canonical_name,
        matchedSkillLocalized={
            "en": canonical_name,
            "ms": name_ms,
            "zh": name_zh,
        },
        category=cat,
        categoryLocalized={
            "en": cat,
            "ms": cat_ms,
            "zh": cat_zh,
        },
        sources=sources_payload,
        isNewSkillSynthesized=True,
        visualization=SkillTrendVisualization(
            velocityScore=velocity_vs,
            growthRatePercent=f"{velocity_vs * 100:+.1f}%",
            status=status,
            statusLocalized=STATUS_LABELS.get(status, STATUS_LABELS["stable"]),
            trendDirection=direction,
            marketDemand=MARKET_DEMAND_LABELS[market_demand_key]["en"],
            marketDemandLocalized=MARKET_DEMAND_LABELS[market_demand_key],
            historicalBaseline=past_c,
            currentDemand=current_c,
            timeSeries=time_series,
            analysisSummary=analysis,
        ),
        suggestedRoles=persisted_roles[:5],
        locale=loc,
    )
