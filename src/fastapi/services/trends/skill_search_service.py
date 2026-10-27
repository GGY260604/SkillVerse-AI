import asyncio
import math
import re
import time
import uuid
from typing import List, Dict, Any, Optional, Tuple, Set

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
    sanitize_title_ms,
    sanitize_skills_ms,
    is_chinese_text,
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

# Expanded Canonical Multilingual Category Taxonomy
CATEGORY_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    # Technology & Engineering
    "Artificial Intelligence": {"ms": "Kecerdasan Buatan (AI)", "zh": "人工智能 (AI)"},
    "Software Development": {"ms": "Pembangunan Perisian", "zh": "软件工程与开发"},
    "Cloud & DevOps": {"ms": "Awan & DevOps", "zh": "云原生与运维架构"},
    "Data Engineering": {"ms": "Kejuruteraan Data", "zh": "数据工程与流处理"},
    "Cybersecurity": {"ms": "Keselamatan Siber", "zh": "网络与信息安全"},
    "Information Technology": {"ms": "Teknologi Maklumat", "zh": "信息技术与数字化"},
    "Clean Tech & ESG": {"ms": "Teknologi Bersih & ESG", "zh": "绿色科技与 ESG"},
    "Engineering & Manufacturing": {"ms": "Kejuruteraan & Pembuatan", "zh": "工程技术与先进制造"},

    # Recreation, Sports & Wellness
    "Sports, Fitness & Recreation": {"ms": "Sukan, Kecergasan & Rekreasi", "zh": "体育运动、健身与休闲"},
    "Health, Wellness & Personal Care": {"ms": "Kesihatan, Kesejahteraan & Penjagaan Diri", "zh": "健康疗愈与个人护理"},

    # Arts, Media & Hospitality
    "Creative Arts & Design": {"ms": "Seni Kreatif & Reka Bentuk", "zh": "创意艺术与视觉设计"},
    "Culinary Arts & Hospitality": {"ms": "Seni Kulinari & Hospitaliti", "zh": "烹饪艺术、餐饮与酒店"},
    "Music, Audio & Performing Arts": {"ms": "Muzik, Audio & Seni Persembahan", "zh": "音乐音频与舞台表演"},
    "Film, Photography & Media": {"ms": "Filem, Fotografi & Media", "zh": "影视传媒、摄影与剪辑"},

    # Skilled Trades, Nature & Primary Industries
    "Skilled Trades & Vocational Crafts": {"ms": "Pertukangan Mahir & Kraf Vokasional", "zh": "专业工匠与实用技术工种"},
    "Agriculture, Nature & Horticulture": {"ms": "Pertanian, Alam Semula Jadi & Hortikultur", "zh": "现代农业、园艺与自然生态"},

    # Business, Strategy, Legal & Education
    "Education, Coaching & Training": {"ms": "Pendidikan, Bimbingan & Latihan", "zh": "教育教学、辅导与培训"},
    "Business, Strategy & Management": {"ms": "Perniagaan, Strategi & Pengurusan", "zh": "商业战略与综合管理"},
    "Finance & Accounting": {"ms": "Kewangan & Perakaunan", "zh": "财务、会计与金融"},
    "Digital Marketing": {"ms": "Pemasaran Digital", "zh": "数字化营销与增长"},
    "Marketing & Communications": {"ms": "Pemasaran & Komunikasi", "zh": "市场营销与品牌传播"},
    "Marketing & Content": {"ms": "Pemasaran & Kandungan", "zh": "营销策划与内容创作"},
    "Operations": {"ms": "Operasi & Rantaian Bekalan", "zh": "智能运营与供应链"},
    "Operations & Logistics": {"ms": "Operasi & Logistik", "zh": "智能运营与现代物流"},
    "Customer Support": {"ms": "Sokongan Pelanggan", "zh": "客户联络与支持"},
    "Customer Support & Client Relations": {"ms": "Sokongan Pelanggan & Perhubungan", "zh": "客户服务与客户关系"},
    "Clerical & Administrative": {"ms": "Perkeranian & Pentadbiran", "zh": "文职与日常行政"},
    "Legal, Compliance & Public Policy": {"ms": "Undang-undang, Pematuhan & Dasar Awam", "zh": "法律合规与公共政策"},
    "Healthcare & Medical Sciences": {"ms": "Penjagaan Kesihatan & Sains Perubatan", "zh": "医疗保健与生命科学"},
    "Specialized Practice & Applied Skills": {"ms": "Kemahiran Khusus & Praktikal", "zh": "应用实践与专业技能"},
}


def normalize_canonical_category(raw_category: Optional[str], skill_name: str = "") -> str:
    """
    Guarantees that any category returned by the LLM, external feed, or user query
    is strictly mapped to a valid canonical category in CATEGORY_TRANSLATIONS.
    
    Multi-stage normalization pipeline:
    1. Exact or case-insensitive match against canonical categories.
    2. Primary keyword and token overlap matching (e.g. 'diving' or 'sports' -> 'Sports, Fitness & Recreation').
    3. Contextual heuristic inference using the skill name as secondary signal.
    4. Deterministic fallback to 'Specialized Practice & Applied Skills'.
    """
    raw = (raw_category or "").strip()
    lowered = raw.lower()

    # Stage 1: Check if skill_name has a definitive domain rule that overrides broad catch-alls
    # (e.g. legacy records where 'golf', 'archery', 'cooking', 'swimming' were lumped into 'Operations')
    CATCH_ALL_CATEGORIES = {"operations", "operations & logistics", "specialized practice & applied skills", "general", "other"}
    s_low = (skill_name or "").lower().strip()

    category_keyword_rules = [
        # Recreation & Sports
        (["sport", "fitness", "recreation", "archery", "golf", "dive", "diving", "scuba", "swim", "swimming", "gym", "climb", "climbing", "hike", "hiking", "skate", "surf", "ski", "athlete", "tennis", "football", "badminton", "run", "running", "martial art", "cycling", "boxing", "pilates", "athletics", "triathlon"], "Sports, Fitness & Recreation"),
        # Culinary & Hospitality
        (["culinary", "cook", "cooking", "chef", "baking", "bake", "pastry", "hospitality", "barista", "sommelier", "mixology", "restaurant", "food", "catering"], "Culinary Arts & Hospitality"),
        # Creative Arts & Design
        (["creative art", "design", "pottery", "ceramic", "paint", "drawing", "draw", "sculpt", "illustration", "calligraphy", "graphic", "craft", "fashion", "textile", "inpainting", "conservation"], "Creative Arts & Design"),
        # Health & Wellness
        (["wellness", "yoga", "meditat", "mindful", "massage", "therapy", "therapist", "skin", "spa", "cosmetic"], "Health, Wellness & Personal Care"),
        # Skilled Trades
        (["trade", "vocational", "woodwork", "carpenter", "carpent", "weld", "plumb", "electrician", "mechanic", "automotive", "mason", "joiner", "metalwork", "timber", "cooper", "coopering", "framing"], "Skilled Trades & Vocational Crafts"),
        # Music & Audio
        (["music", "audio", "sound", "guitar", "piano", "vocal", "sing", "dance", "performing", "theatre", "composer", "dj"], "Music, Audio & Performing Arts"),
        # Film & Media
        (["film", "photo", "photography", "video", "videography", "camera", "cinema", "drone", "podcast", "broadcast"], "Film, Photography & Media"),
        # Agriculture & Nature
        (["agriculture", "nature", "horticulture", "farm", "garden", "plant", "hydroponic", "permacultur", "crop", "botany", "landscape"], "Agriculture, Nature & Horticulture"),
        # Education & Training
        (["education", "teach", "tutor", "training", "pedagogy", "instruct", "coach", "mentor", "curriculum"], "Education, Coaching & Training"),
        # Finance & Accounting
        (["financ", "account", "banking", "audit", "tax", "investment", "fintech", "invoice", "bookkeep"], "Finance & Accounting"),
        # Digital Marketing
        (["digital marketing", "seo", "sem", "growth marketing", "social media", "content marketing"], "Digital Marketing"),
        (["marketing", "communicat", "pr", "public relations", "branding", "advertis"], "Marketing & Communications"),
        # Artificial Intelligence
        (["artificial intelligence", "ai", "machine learning", "deep learning", "neural", "llm", "prompt engineering", "computer vision", "nlp"], "Artificial Intelligence"),
        # Cloud & DevOps
        (["cloud", "devops", "kubernetes", "docker", "aws", "azure", "ci/cd", "infrastructure", "sre"], "Cloud & DevOps"),
        # Data Engineering
        (["data engineering", "data", "sql", "etl", "data warehouse", "data warehousing", "analytics", "pipeline", "big data"], "Data Engineering"),
        # Cybersecurity
        (["cybersecurity", "cyber", "security", "pentest", "penetrat", "hack", "soc", "infosec", "vulnerability"], "Cybersecurity"),
        # Software Development
        (["software development", "software", "develop", "web", "programming", "frontend", "backend", "fullstack", "code", "python", "javascript", "react", "golang", "rust"], "Software Development"),
        # Information Technology
        (["information technology", "it", "sysadmin", "network", "helpdesk"], "Information Technology"),
        # Clean Tech & ESG
        (["clean tech", "esg", "solar", "wind", "renewable", "sustainability", "carbon", "green energy"], "Clean Tech & ESG"),
        # Engineering & Manufacturing
        (["engineering", "manufacturing", "mechanical", "electrical", "robotics", "automation engineering", "industrial"], "Engineering & Manufacturing"),
        # Healthcare & Medical
        (["healthcare", "medic", "nursing", "clinical", "physiotherapy", "pharmacy"], "Healthcare & Medical Sciences"),
        # Legal & Public Policy
        (["legal", "compliance", "law", "public policy", "regulatory", "governance"], "Legal, Compliance & Public Policy"),
        # Customer Support
        (["customer support", "customer service", "client relations", "customer success", "sales", "support", "ticket triage"], "Customer Support & Client Relations"),
        # Clerical & Admin
        (["clerical", "administrative", "office admin", "receptionist", "data entry"], "Clerical & Administrative"),
        # Operations & Logistics
        (["logistics", "supply chain", "warehouse", "procurement", "inventory"], "Operations & Logistics"),
        (["operations", "operational"], "Operations"),
        # Business & Strategy
        (["business", "strategy", "management", "consulting", "executive", "entrepreneurship", "human resource", "hr"], "Business, Strategy & Management"),
    ]

    def _matches_rule(keywords: List[str], text: str) -> bool:
        for kw in keywords:
            if len(kw) <= 4:
                # Exact word-boundary check for short stems (e.g. 'ai', 'it', 'pr', 'hr', 'run', 'sing', 'draw')
                if re.search(r"\b" + re.escape(kw) + r"\b", text):
                    return True
            else:
                if kw in text:
                    return True
        return False

    # Check if skill_name strongly belongs to a domain when raw category is generic or a known catch-all
    if s_low:
        for keywords, target_canonical in category_keyword_rules:
            if target_canonical in ("Operations", "Specialized Practice & Applied Skills"):
                continue
            if _matches_rule(keywords, s_low):
                if not raw or lowered in CATCH_ALL_CATEGORIES or (lowered == "clean tech & esg" and s_low in ("diving", "scuba diving")):
                    return target_canonical

    # Stage 2: Exact or case-insensitive match against canonical categories
    if raw in CATEGORY_TRANSLATIONS:
        return raw
    for canonical in CATEGORY_TRANSLATIONS.keys():
        if lowered == canonical.lower():
            return canonical

    # Stage 3: Keyword token matching on raw_category
    for keywords, target_canonical in category_keyword_rules:
        if _matches_rule(keywords, lowered):
            return target_canonical

    # Stage 4: Fall back to analyzing skill_name
    if s_low:
        for keywords, target_canonical in category_keyword_rules:
            if _matches_rule(keywords, s_low):
                return target_canonical

        inferred = _infer_domain_category_fallback(skill_name)
        if inferred and inferred.get("category") in CATEGORY_TRANSLATIONS:
            return inferred["category"]

    # Stage 5: Universal Safe Default
    return "Specialized Practice & Applied Skills"


def register_category_translation(
    category: str,
    category_zh: Optional[str] = None,
    category_ms: Optional[str] = None,
) -> None:
    """
    Dynamically registers or updates trilingual category translations in runtime cache
    so any novel category synthesized by LLM or discovered from feeds is immediately localized.
    """
    if not category:
        return
    cat = category.strip()
    if not cat:
        return

    zh_val = (category_zh or "").strip()
    ms_val = (category_ms or "").strip()

    if cat not in CATEGORY_TRANSLATIONS:
        CATEGORY_TRANSLATIONS[cat] = {
            "ms": ms_val or cat,
            "zh": zh_val or cat,
        }
    else:
        existing = CATEGORY_TRANSLATIONS[cat]
        if ms_val and existing.get("ms") in [cat, "", None]:
            existing["ms"] = ms_val
        if zh_val and existing.get("zh") in [cat, "", None]:
            existing["zh"] = zh_val


def localize_category(
    cat: str,
    locale: str,
    src_meta: Optional[Dict[str, Any]] = None,
    skill_name: str = "",
) -> str:
    """
    Returns the localized category label for the specified locale ('en', 'ms', 'zh').
    Prioritizes metadata from the source citation before falling back to CATEGORY_TRANSLATIONS.
    Guarantees that cat is strictly mapped to canonical category first.
    """
    loc = (locale or "en").lower().strip()
    if not cat:
        return ""

    canonical = normalize_canonical_category(cat, skill_name=skill_name)
    if loc == "zh":
        if src_meta and src_meta.get("category_zh"):
            return str(src_meta["category_zh"])
        return CATEGORY_TRANSLATIONS.get(canonical, {}).get("zh") or canonical
    if loc == "ms":
        if src_meta and src_meta.get("category_ms"):
            return str(src_meta["category_ms"])
        return CATEGORY_TRANSLATIONS.get(canonical, {}).get("ms") or canonical
    return canonical


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
    category_ms: Optional[str] = None,
    category_zh: Optional[str] = None,
) -> Dict[str, str]:
    """
    Produces rich trilingual analytical commentary interpreting the skill trajectory
    and guiding learner reskilling decisions across any technical, creative, recreational,
    or vocational domain.
    """
    pct = f"{velocity_vs * 100:+.1f}%"
    cat_ms = category_ms or CATEGORY_TRANSLATIONS.get(category, {}).get("ms") or category
    cat_zh = category_zh or CATEGORY_TRANSLATIONS.get(category, {}).get("zh") or category

    if status == "emerging":
        en = (
            f"'{skill_name}' exhibits strong positive market expansion with a velocity score of {velocity_vs:+.2f} ({pct}). "
            f"Demand across the '{category}' sector is surging as specialized practitioners and modern applications expand. "
            f"Learners acquiring this competency gain competitive advantage and high-resilience career adaptability."
        )
        ms = (
            f"'{skill_name_ms}' mempamerkan pengembangan pasaran yang kukuh dengan skor halaju {velocity_vs:+.2f} ({pct}). "
            f"Permintaan merentas sektor '{cat_ms}' meningkat pesat seiring perkembangan amalan industri dan pakar khusus. "
            f"Pengguna yang menguasai kemahiran ini memperoleh kelebihan daya saing dan kebolehsuaian kerjaya yang tinggi."
        )
        zh = (
            f"“{skill_name_zh}”在当前就业与专业服务市场表现出强劲的增长势头，扩张速度达到 {velocity_vs:+.2f} ({pct})。"
            f"在“{cat_zh}”领域，该技能的专业需求与社会关注度呈显著上升态势。"
            f"掌握此项核心能力将为个人发展带来坚实的专业壁垒与高韧性职业竞争优势。"
        )
    elif status == "declining":
        en = (
            f"'{skill_name}' is experiencing structural contraction with a negative velocity of {velocity_vs:+.2f} ({pct}). "
            f"Routine workflows in this domain are facing shifting market dynamics and modern workflow automation. "
            f"Reskilling toward higher-order creative, strategic, or specialized practical skills is strongly advised."
        )
        ms = (
            f"'{skill_name_ms}' mengalami penguncupan struktur dengan skor halaju negatif {velocity_vs:+.2f} ({pct}). "
            f"Aliran kerja rutin dalam domain ini menghadapi perubahan dinamik pasaran dan automasi moden. "
            f"Peningkatan kemahiran ke arah aspek kreatif, strategik atau amalan khusus amat disyorkan."
        )
        zh = (
            f"“{skill_name_zh}”正面临结构性收缩，收缩速率为 {velocity_vs:+.2f} ({pct})。"
            f"随着行业作业模式的演进与数字化/自动化辅助的普及，该领域传统的常规流程正在被重塑。"
            f"强烈建议相关从业者或学习者拓展更高阶的创意、战略策划或综合服务能力。"
        )
    else:
        en = (
            f"'{skill_name}' demonstrates stable baseline demand with a velocity score of {velocity_vs:+.2f} ({pct}). "
            f"It serves as an essential foundational standard across '{category}' operations and professional practices. "
            f"Combining this skill with modern digital tools and cross-disciplinary techniques maximizes long-term career resilience."
        )
        ms = (
            f"'{skill_name_ms}' menunjukkan permintaan asas yang stabil dengan skor halaju {velocity_vs:+.2f} ({pct}). "
            f"Ia berfungsi sebagai piawaian asas yang penting dalam operasi dan amalan profesional '{cat_ms}'. "
            f"Menggabungkan kemahiran ini dengan alatan moden dan teknik antara disiplin akan memaksimumkan daya tahan kerjaya jangka panjang."
        )
        zh = (
            f"“{skill_name_zh}”呈现出稳定的基准市场需求，波动速度为 {velocity_vs:+.2f} ({pct})。"
            f"它是“{cat_zh}”专业领域不可或缺的常备基石型能力。"
            f"建议将该技能与现代协同工具及跨领域应用相结合，以保持长期的职业稳固性与实践价值。"
        )

    return {"en": en, "ms": ms, "zh": zh}


ON_DEMAND_SKILL_PROMPT = """
You are the Chief Occupational Taxonomist and Market Intelligence Engine for SkillVerse AI.
SkillVerse AI tracks and analyzes labor market and occupational trends across ALL skill domains:
including technology, business, skilled trades, culinary arts, creative design, media, sports, fitness, wellness, and recreation.

A user is searching for a skill, competency, recreation, or framework that is not yet indexed in our real-time database:
USER QUERY: "{query}"

MANDATORY TRANSLATION FIDELITY:
Provide genuine, professional, domain-accurate industry translations in Simplified Chinese (zh) and Bahasa Melayu (ms) for all skill names, categories, citations, and role titles (no literal or robotic translations).
All Bahasa Melayu text MUST strictly use Latin script (e.g. "Sukan, Kecergasan & Rekreasi"). NEVER include Chinese characters in ms fields.

TASK:
1. Canonicalize the searched skill in trilingual format (English, Bahasa Melayu, Simplified Chinese).
2. Determine its labor market trend and domain classification:
   - status: "emerging" (velocityVs +0.25 to +0.85), "declining" (-0.15 to -0.50), or "stable" (-0.10 to +0.20)
   - velocityVs: float score
   - currentWindowC: float (e.g. 26.0)
   - pastWindowC: float (e.g. 16.5)
   - category: MUST be exactly one of the canonical categories from this list:
     - "Sports, Fitness & Recreation" (e.g. scuba diving, rock climbing, sports coaching)
     - "Culinary Arts & Hospitality" (e.g. pastry baking, culinary arts, mixology, barista skills)
     - "Creative Arts & Design" (e.g. ceramic pottery, graphic design, illustration, fashion design)
     - "Health, Wellness & Personal Care" (e.g. yoga instruction, meditation, massage therapy, skincare)
     - "Skilled Trades & Vocational Crafts" (e.g. woodworking, carpentry, welding, automotive repair)
     - "Music, Audio & Performing Arts" (e.g. sound engineering, music production, stage performance)
     - "Film, Photography & Media" (e.g. videography, portrait photography, video editing, drone filming)
     - "Agriculture, Nature & Horticulture" (e.g. permaculture, urban farming, landscape gardening, hydroponics)
     - "Education, Coaching & Training" (e.g. curriculum design, language coaching, vocational training)
     - "Business, Strategy & Management" (e.g. agile leadership, business operations, project management)
     - "Finance & Accounting" (e.g. financial modeling, accounting, auditing, investment banking)
     - "Digital Marketing" (e.g. SEO, social media marketing, content marketing, growth hacking)
     - "Marketing & Communications" (e.g. public relations, brand strategy, corporate communications)
     - "Operations & Logistics" (e.g. supply chain, warehouse logistics, facility operations)
     - "Customer Support & Client Relations" (e.g. customer success, client support management)
     - "Clerical & Administrative" (e.g. office administration, data records, executive assistance)
     - "Legal, Compliance & Public Policy" (e.g. contract law, compliance, regulatory policy)
     - "Healthcare & Medical Sciences" (e.g. nursing, clinical diagnostics, physiotherapy)
     - "Engineering & Manufacturing" (e.g. mechanical engineering, electrical systems, industrial manufacturing)
     - "Clean Tech & ESG" (e.g. renewable energy, sustainability, environmental compliance)
     - "Artificial Intelligence" (e.g. machine learning, prompt engineering, LLMs, computer vision)
     - "Software Development" (e.g. full-stack development, mobile apps, systems programming)
     - "Cloud & DevOps" (e.g. cloud infrastructure, CI/CD, Kubernetes, site reliability)
     - "Data Engineering" (e.g. data pipelines, ETL, databases, big data analytics)
     - "Cybersecurity" (e.g. penetration testing, network defense, threat intelligence)
     - "Information Technology" (e.g. systems administration, network engineering, IT support)
     - "Specialized Practice & Applied Skills" (e.g. specialized applied craft or niche competency)
     CRITICAL CONSTRAINT: You MUST select one of the exact category strings listed above. Do NOT invent new category names.
   - category_ms: Authentic Bahasa Melayu category title (Latin script only)
   - category_zh: Authentic Simplified Chinese category title (简体中文)
   - citation: Trend driver explanation in English
   - citation_ms: Authentic Bahasa Melayu explanation (Latin script only)
   - citation_zh: Authentic Simplified Chinese explanation (简体中文)
3. Synthesize 5 Suggested Occupational Roles directly related to this skill conforming to ESCO taxonomy:
   - roleId: Clean canonical slug (e.g. "scuba-diving-instructor" or "ai-workflow-automation-engineer")
   - title: Professional English Title (Latin alphabet only)
   - title_ms: Authentic Bahasa Melayu Title (Latin alphabet only, NO Chinese or non-Latin characters)
   - title_zh: Authentic Simplified Chinese Title (简体中文)
   - industry: Matching industry or sector name (e.g. "Sports, Recreation & Adventure Tourism", "Culinary Arts & Food Service", "Responsible AI & Digital Transformation")
   - description: 1 concise sentence describing what this professional does
   - requiredSkills: 5 essential skills in English (MUST include the searched skill or direct variant)
   - requiredSkills_ms: Matching authentic Bahasa Melayu translations for each of the 5 skills (Latin alphabet only, NO Chinese)
   - requiredSkills_zh: Matching authentic Simplified Chinese translations for each of the 5 skills (简体中文)
   - sdgAlignment: Target code, e.g. "SDG 8.2" or "SDG 3.4" or "SDG 14.2"

OUTPUT FORMAT:
Return strictly valid JSON with this exact structure:
{{
  "skill": {{
    "skillName": "canonical lower case english skill name",
    "skillName_ms": "nama kemahiran dalam Bahasa Melayu",
    "skillName_zh": "中文技能名称",
    "category": "Domain Category Name",
    "category_ms": "Nama Kategori dalam Bahasa Melayu",
    "category_zh": "中文类别名称",
    "status": "emerging",
    "velocityVs": 0.45,
    "currentWindowC": 24.0,
    "pastWindowC": 16.5,
    "citation": "Surging adoption and market interest across relevant professional workflows.",
    "citation_ms": "Peningkatan minat pasaran dan penggunaan merentas aliran kerja profesional.",
    "citation_zh": "相关行业与专业服务领域对该技能的需求呈稳步上升态势。"
  }},
  "suggestedRoles": [
    {{
      "roleId": "canonical-slug-role-id",
      "title": "Role Title in English",
      "title_ms": "Tajuk Peranan dalam Bahasa Melayu",
      "title_zh": "职位名称 (Simplified Chinese)",
      "industry": "Industry or Sector Name",
      "description": "Clear description of the role.",
      "requiredSkills": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5"],
      "requiredSkills_ms": ["kemahiran 1", "kemahiran 2", "kemahiran 3", "kemahiran 4", "kemahiran 5"],
      "requiredSkills_zh": ["技能1", "技能2", "技能3", "技能4", "技能5"],
      "sdgAlignment": "SDG 8.2"
    }}
  ]
}}
"""


def _infer_domain_category_fallback(query: str) -> Dict[str, str]:
    """
    Infers an appropriate category and trilingual translations for deterministic fallback
    based on lexical patterns across recreation, arts, culinary, sports, trades, and tech.
    """
    q = query.lower()

    # Sports, Fitness & Recreation
    if any(k in q for k in ["dive", "diving", "scuba", "swim", "fitness", "sport", "gym", "climb", "hike", "skate", "surf", "ski", "athlete", "tennis", "football", "badminton", "cycling", "run"]):
        return {
            "category": "Sports, Fitness & Recreation",
            "category_ms": "Sukan, Kecergasan & Rekreasi",
            "category_zh": "体育运动、健身与休闲",
            "industry": "Sports, Recreation & Adventure Tourism",
            "sdg": "SDG 3.4",
        }
    # Culinary Arts & Hospitality
    if any(k in q for k in ["bake", "baking", "cook", "chef", "culinary", "pastry", "barista", "coffee", "wine", "sommelier", "mixology", "restaurant", "food", "catering", "dining"]):
        return {
            "category": "Culinary Arts & Hospitality",
            "category_ms": "Seni Kulinari & Hospitaliti",
            "category_zh": "烹饪艺术、餐饮与酒店",
            "industry": "Culinary Arts & Food Hospitality",
            "sdg": "SDG 8.9",
        }
    # Creative Arts & Design
    if any(k in q for k in ["pottery", "ceramic", "paint", "draw", "sculpt", "art", "design", "graphic", "illustration", "calligraphy", "craft", "fashion", "textile", "jewel"]):
        return {
            "category": "Creative Arts & Design",
            "category_ms": "Seni Kreatif & Reka Bentuk",
            "category_zh": "创意艺术与视觉设计",
            "industry": "Creative Arts, Cultural & Visual Design",
            "sdg": "SDG 8.3",
        }
    # Health, Wellness & Personal Care
    if any(k in q for k in ["yoga", "meditat", "mindful", "wellness", "massage", "therapy", "therapist", "skin", "spa", "cosmetic", "hair", "salon", "pilates"]):
        return {
            "category": "Health, Wellness & Personal Care",
            "category_ms": "Kesihatan, Kesejahteraan & Penjagaan Diri",
            "category_zh": "健康疗愈与个人护理",
            "industry": "Health, Wellness & Personal Services",
            "sdg": "SDG 3.4",
        }
    # Skilled Trades & Vocational Crafts
    if any(k in q for k in ["wood", "carpenter", "carpent", "weld", "plumb", "electrician", "mechanic", "repair", "automotive", "mason", "joiner", "metal"]):
        return {
            "category": "Skilled Trades & Vocational Crafts",
            "category_ms": "Pertukangan Mahir & Kraf Vokasional",
            "category_zh": "专业工匠与实用技术工种",
            "industry": "Skilled Crafts & Technical Services",
            "sdg": "SDG 8.2",
        }
    # Music & Performing Arts
    if any(k in q for k in ["music", "audio", "sound", "guitar", "piano", "drum", "vocal", "sing", "dance", "theatre", "acting", "composer", "dj"]):
        return {
            "category": "Music, Audio & Performing Arts",
            "category_ms": "Muzik, Audio & Seni Persembahan",
            "category_zh": "音乐音频与舞台表演",
            "industry": "Music Production & Performing Arts",
            "sdg": "SDG 8.3",
        }
    # Film, Photography & Media
    if any(k in q for k in ["photo", "video", "film", "camera", "cinema", "drone", "podcast", "broadcast", "edit"]):
        return {
            "category": "Film, Photography & Media",
            "category_ms": "Filem, Fotografi & Media",
            "category_zh": "影视传媒、摄影与剪辑",
            "industry": "Film, Media & Content Production",
            "sdg": "SDG 8.3",
        }
    # Agriculture & Nature
    if any(k in q for k in ["farm", "garden", "plant", "horticultur", "agricultur", "hydroponic", "permacultur", "crop", "botany", "landscape"]):
        return {
            "category": "Agriculture, Nature & Horticulture",
            "category_ms": "Pertanian, Alam Semula Jadi & Hortikultur",
            "category_zh": "现代农业、园艺与自然生态",
            "industry": "Sustainable Agriculture & Horticulture",
            "sdg": "SDG 2.4",
        }
    # Education & Training
    if any(k in q for k in ["teach", "tutor", "educat", "train", "pedagogy", "instruct", "coach", "mentor", "curriculum"]):
        return {
            "category": "Education, Coaching & Training",
            "category_ms": "Pendidikan, Bimbingan & Latihan",
            "category_zh": "教育教学、辅导与培训",
            "industry": "Education, Learning & Development",
            "sdg": "SDG 4.4",
        }
    # Clean Tech & ESG
    if any(k in q for k in ["solar", "wind", "renewable", "esg", "carbon", "sustainab", "green energy", "climate"]):
        return {
            "category": "Clean Tech & ESG",
            "category_ms": "Teknologi Bersih & ESG",
            "category_zh": "绿色科技与 ESG",
            "industry": "Clean Energy & Environmental Sustainability",
            "sdg": "SDG 7.2",
        }
    # AI & Data
    if any(k in q for k in ["ai", "prompt", "llm", "machine learning", "neural", "deep learning", "gpt", "rag", "agent"]):
        return {
            "category": "Artificial Intelligence",
            "category_ms": "Kecerdasan Buatan (AI)",
            "category_zh": "人工智能 (AI)",
            "industry": "Responsible AI & Digital Transformation",
            "sdg": "SDG 8.2",
        }
    # Software & Cloud
    if any(k in q for k in ["devops", "cloud", "docker", "kubernetes", "aws", "azure", "linux", "infra"]):
        return {
            "category": "Cloud & DevOps",
            "category_ms": "Awan & DevOps",
            "category_zh": "云原生与运维架构",
            "industry": "Cloud Infrastructure & Platforms",
            "sdg": "SDG 8.2",
        }
    if any(k in q for k in ["data", "sql", "etl", "warehouse", "analytics", "pipeline"]):
        return {
            "category": "Data Engineering",
            "category_ms": "Kejuruteraan Data",
            "category_zh": "数据工程与流处理",
            "industry": "Data Systems & Applied Analytics",
            "sdg": "SDG 8.2",
        }
    if any(k in q for k in ["security", "cyber", "pentest", "soc", "crypto", "vulnerability"]):
        return {
            "category": "Cybersecurity",
            "category_ms": "Keselamatan Siber",
            "category_zh": "网络与信息安全",
            "industry": "Cyber Defense & Enterprise Security",
            "sdg": "SDG 8.2",
        }
    if any(k in q for k in ["code", "software", "api", "react", "python", "javascript", "golang", "rust", "frontend", "backend"]):
        return {
            "category": "Software Development",
            "category_ms": "Pembangunan Perisian",
            "category_zh": "软件工程与开发",
            "industry": "Software Engineering & Digital Solutions",
            "sdg": "SDG 8.2",
        }

    # Universal Default
    return {
        "category": "Specialized Practice & Applied Skills",
        "category_ms": "Kemahiran Khusus & Praktikal",
        "category_zh": "应用实践与专业技能",
        "industry": "Professional Services & Applied Competencies",
        "sdg": "SDG 8.2",
    }


async def synthesize_skill_and_roles_on_demand(query: str) -> Dict[str, Any]:
    """
    Synthesizes a novel skill entity, its market trend, and 5 related ESCO roles.
    Uses 3-Tier LLM Architecture:
      - Tier 1: Local Qwen 2.5 (via Ollama/vLLM)
      - Tier 2: Gemini Flash API Fallback
      - Tier 3: Zero-Failure Deterministic Fallback Floor
    """
    prompt = ON_DEMAND_SKILL_PROMPT.format(query=query)
    sys_instruction = "You are the Market Intelligence & ESCO Taxonomy Engine. Return strictly valid JSON."

    # Tier 1: Local Qwen 2.5 via Ollama
    try:
        from services.local_llm_service import call_local_llm_json
        print(f"[skill_search] Tier 1: Synthesizing novel skill '{query}' and roles via Local Qwen 2.5...")
        qwen_res = await call_local_llm_json(
            prompt=prompt,
            system_instruction=sys_instruction,
            timeout=55.0,
        )
        if qwen_res and isinstance(qwen_res, dict) and qwen_res.get("skill"):
            s_obj = qwen_res["skill"]
            canon_cat = normalize_canonical_category(s_obj.get("category"), skill_name=query)
            s_obj["category"] = canon_cat
            s_obj["category_ms"] = CATEGORY_TRANSLATIONS[canon_cat]["ms"]
            s_obj["category_zh"] = CATEGORY_TRANSLATIONS[canon_cat]["zh"]
            print(f"[skill_search] Tier 1 Success: Qwen 2.5 synthesized skill (category '{canon_cat}') and {len(qwen_res.get('suggestedRoles', []))} roles.")
            qwen_res["tierUsed"] = "qwen"
            return qwen_res
    except Exception as qwen_err:
        print(f"[skill_search] Tier 1 Qwen failed: {qwen_err}. Switching to Tier 2 Gemini fallback...")

    # Tier 2: Gemini Flash Fallback
    try:
        print(f"[skill_search] Tier 2: Invoking Gemini Flash fallback for novel skill '{query}'...")
        contents = [{"parts": [{"text": prompt}]}]
        data = await call_gemini_with_fallback(
            contents=contents,
            system_instruction=sys_instruction,
            max_output_tokens=5500,
        )
        if data and isinstance(data, dict) and data.get("skill"):
            s_obj = data["skill"]
            canon_cat = normalize_canonical_category(s_obj.get("category"), skill_name=query)
            s_obj["category"] = canon_cat
            s_obj["category_ms"] = CATEGORY_TRANSLATIONS[canon_cat]["ms"]
            s_obj["category_zh"] = CATEGORY_TRANSLATIONS[canon_cat]["zh"]
            print(f"[skill_search] Tier 2 Success: Gemini synthesized skill (category '{canon_cat}') and {len(data.get('suggestedRoles', []))} roles.")
            data["tierUsed"] = "gemini"
            return data
    except Exception as e:
        print(f"[skill_search] Tier 2 Gemini failed: {e}. Falling back to Tier 3 deterministic fallback...")

    # Tier 3: Zero-Failure Deterministic Fallback Floor
    canonical_name = query.strip().lower()
    clean_title = query.strip().title()
    clean_slug = re.sub(r"[^a-z0-9]+", "-", canonical_name).strip("-") or "skill"

    meta = _infer_domain_category_fallback(query)
    clean_cat = meta["category"]
    clean_cat_ms = meta["category_ms"]
    clean_cat_zh = meta["category_zh"]
    clean_ind = meta["industry"]
    clean_sdg = meta["sdg"]

    return {
        "tierUsed": "deterministic",
        "skill": {
            "skillName": canonical_name,
            "skillName_ms": canonical_name,
            "skillName_zh": query.strip(),
            "category": clean_cat,
            "category_ms": clean_cat_ms,
            "category_zh": clean_cat_zh,
            "status": "emerging",
            "velocityVs": 0.38,
            "currentWindowC": 18.0,
            "pastWindowC": 13.0,
            "sourceName": "Global Labor & Skills Intelligence",
            "sourceUrl": "https://esco.ec.europa.eu",
            "citation": f"Growing professional adoption and market interest for {clean_title} within {clean_cat}.",
            "citation_ms": f"Peningkatan minat pasaran dan amalan profesional bagi {clean_title} dalam {clean_cat_ms}.",
            "citation_zh": f"在{clean_cat_zh}领域，{clean_title} 相关实践与市场关注度保持稳步上升。",
        },
        "suggestedRoles": [
            {
                "roleId": f"{clean_slug}-specialist",
                "title": f"{clean_title} Specialist",
                "title_ms": f"Pakar {clean_title}",
                "title_zh": f"{clean_title} 专业实践师",
                "industry": clean_ind,
                "description": f"Applies specialized techniques and operational best practices in {clean_title} to deliver professional outcomes.",
                "requiredSkills": [clean_title, f"{clean_title} Core Techniques", "Safety & Compliance Standards", "Operational Best Practices", "Client Experience & Communication"],
                "requiredSkills_ms": [clean_title, f"Teknik Asas {clean_title}", "Piawaian Keselamatan & Pematuhan", "Amalan Terbaik Operasi", "Pengalaman Pelanggan & Komunikasi"],
                "requiredSkills_zh": [clean_title, f"{clean_title}核心技术与规范", "安全规程与行业合规", "标准化流程与最佳实践", "客户服务与沟通协作"],
                "sdgAlignment": clean_sdg,
                "sdgTitle": "Productivity and specialized skills growth",
                "radarRequirements": {
                    "Technical Aptitude": 80,
                    "Domain Operations": 85,
                    "Automation Resilience": 80,
                    "Learning Agility": 85,
                    "Strategic Leadership": 70,
                },
            }
        ],
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

    cat = normalize_canonical_category(skill_data.get("category"), skill_name=skill_data.get("skillName", ""))
    cat_ms = CATEGORY_TRANSLATIONS[cat]["ms"]
    cat_zh = CATEGORY_TRANSLATIONS[cat]["zh"]

    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    payload = [{
        "id": str(uuid.uuid4()),
        "skillName": skill_data["skillName"].strip().lower(),
        "category": cat,
        "status": skill_data.get("status", "emerging"),
        "velocityVs": float(skill_data.get("velocityVs", 0.35)),
        "currentWindowC": float(skill_data.get("currentWindowC", 15.0)),
        "pastWindowC": float(skill_data.get("pastWindowC", 10.0)),
        "sources": [
            {
                "sourceName": skill_data.get("sourceName", "Global Labor & Skills Intelligence"),
                "url": skill_data.get("sourceUrl", "https://esco.ec.europa.eu"),
                "citation": skill_data.get("citation", ""),
                "citation_ms": skill_data.get("citation_ms", ""),
                "citation_zh": skill_data.get("citation_zh", ""),
                "skillName_ms": skill_data.get("skillName_ms", skill_data["skillName"]),
                "skillName_zh": skill_data.get("skillName_zh", skill_data["skillName"]),
                "category_ms": cat_ms,
                "category_zh": cat_zh,
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


def normalize_role_title(t: str) -> str:
    """Normalizes role title for case-insensitive, punctuation-resilient matching."""
    if not t:
        return ""
    cleaned = re.sub(r"[^\w\s]", " ", t.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def slugify_role_title(t: str) -> str:
    """Derives a clean, canonical slug from a role title."""
    if not t:
        return ""
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")


async def persist_new_roles_to_supabase(
    roles: List[Dict[str, Any]],
    skill_embedding: Optional[List[float]] = None,
) -> List[EscoRoleSuggested]:
    """
    Checks Supabase esco_roles and active catalog for existing roles,
    ensures strict deduplication across IDs, slugs, and trilingual titles,
    computes 1024-dim BGE-M3 dense embeddings only for genuinely new roles,
    and batch-persists them into Supabase.
    Returns standardized EscoRoleSuggested items.
    """
    if not roles:
        return []

    base_url = settings.SUPABASE_URL.rstrip("/") if settings.SUPABASE_URL else ""
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8]

    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY or "",
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY or ''}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    client = get_shared_client(timeout=15.0)

    # 1. Fetch active roles catalog from in-memory / Supabase (cached for 300s)
    active_catalog = await fetch_active_roles_from_supabase()

    catalog_by_id: Dict[str, Dict[str, Any]] = {}
    catalog_by_slug: Dict[str, Dict[str, Any]] = {}
    catalog_by_title_en: Dict[str, Dict[str, Any]] = {}
    catalog_by_title_ms: Dict[str, Dict[str, Any]] = {}
    catalog_by_title_zh: Dict[str, Dict[str, Any]] = {}

    for r in active_catalog:
        rid = (r.get("roleId") or r.get("role_id") or "").strip()
        title_en = (r.get("title") or "").strip()
        title_loc = r.get("titleLocalized", {})
        title_ms = (title_loc.get("ms") or r.get("title_ms") or "").strip()
        title_zh = (title_loc.get("zh") or r.get("title_zh") or "").strip()

        if rid:
            catalog_by_id[rid.lower()] = r
        if title_en:
            slug = slugify_role_title(title_en)
            if slug:
                catalog_by_slug[slug] = r
            norm_en = normalize_role_title(title_en)
            if norm_en:
                catalog_by_title_en[norm_en] = r
        if title_ms:
            norm_ms = normalize_role_title(title_ms)
            if norm_ms:
                catalog_by_title_ms[norm_ms] = r
        if title_zh:
            norm_zh = normalize_role_title(title_zh)
            if norm_zh:
                catalog_by_title_zh[norm_zh] = r

    # 2. Defense-in-depth: query Supabase directly for candidate IDs / slugs / titles
    candidate_ids: Set[str] = set()
    candidate_titles: Set[str] = set()
    candidate_titles_ms: Set[str] = set()
    candidate_titles_zh: Set[str] = set()
    for r in roles:
        t = (r.get("title") or "").strip()
        t_ms = (r.get("title_ms") or "").strip()
        t_zh = (r.get("title_zh") or "").strip()
        if t:
            candidate_titles.add(t)
            slug = slugify_role_title(t)
            if slug:
                candidate_ids.add(slug)
        if t_ms:
            candidate_titles_ms.add(t_ms)
        if t_zh:
            candidate_titles_zh.add(t_zh)
        raw_rid = (r.get("roleId") or "").strip()
        if raw_rid:
            candidate_ids.add(raw_rid)

    if base_url and settings.SUPABASE_SERVICE_ROLE_KEY and (candidate_ids or candidate_titles or candidate_titles_ms or candidate_titles_zh):
        try:
            filters = []
            if candidate_ids:
                ids_param = ",".join(list(candidate_ids)[:20])
                filters.append(f"role_id=in.({ids_param})")
            if candidate_titles:
                titles_param = ",".join([f'"{t}"' for t in list(candidate_titles)[:20]])
                filters.append(f"title=in.({titles_param})")
            if candidate_titles_ms:
                titles_ms_param = ",".join([f'"{t}"' for t in list(candidate_titles_ms)[:20]])
                filters.append(f"title_ms=in.({titles_ms_param})")
            if candidate_titles_zh:
                titles_zh_param = ",".join([f'"{t}"' for t in list(candidate_titles_zh)[:20]])
                filters.append(f"title_zh=in.({titles_zh_param})")

            if filters:
                check_endpoint = (
                    f"{base_url}/rest/v1/esco_roles"
                    f"?or=({','.join(filters)})"
                    "&select=role_id,title,title_ms,title_zh,industry,required_skills,required_skills_localized,sdg_alignments,scenario_multipliers,radar_requirements"
                )
                check_resp = await client.get(check_endpoint, headers=headers)
                if check_resp.status_code == 200:
                    for row in check_resp.json():
                        row_rid = (row.get("role_id") or "").strip()
                        row_title = (row.get("title") or "").strip()
                        row_ms = (row.get("title_ms") or row_title).strip()
                        row_zh = (row.get("title_zh") or row_title).strip()
                        row_skills_en = row.get("required_skills", [])
                        row_skills_loc = row.get("required_skills_localized")
                        if not row_skills_loc:
                            if row.get("required_skills_ms") and row.get("required_skills_zh"):
                                row_skills_loc = {
                                    "en": row_skills_en,
                                    "ms": row.get("required_skills_ms"),
                                    "zh": row.get("required_skills_zh"),
                                }
                            else:
                                row_skills_loc = localize_skill_list_trilingual(row_skills_en)

                        row_entry = {
                            "roleId": row_rid,
                            "title": row_title,
                            "titleLocalized": {"en": row_title, "ms": row_ms, "zh": row_zh},
                            "industry": row.get("industry", "Responsible AI & Digital Transformation"),
                            "requiredSkills": row_skills_en,
                            "requiredSkillsLocalized": row_skills_loc,
                            "sdgAlignments": row.get("sdg_alignments", []),
                            "scenarioMultipliers": row.get("scenario_multipliers", {"moderate": 1.0, "accelerated_ai": 1.15, "green_economy": 1.10}),
                            "radarRequirement": row.get("radar_requirements", {
                                "Technical Aptitude": 85, "Domain Operations": 75, "Automation Resilience": 85, "Learning Agility": 85, "Strategic Leadership": 70
                            }),
                        }
                        if row_rid:
                            catalog_by_id[row_rid.lower()] = row_entry
                        if row_title:
                            s = slugify_role_title(row_title)
                            if s:
                                catalog_by_slug[s] = row_entry
                            catalog_by_title_en[normalize_role_title(row_title)] = row_entry
                        if row_ms:
                            catalog_by_title_ms[normalize_role_title(row_ms)] = row_entry
                        if row_zh:
                            catalog_by_title_zh[normalize_role_title(row_zh)] = row_entry
        except Exception as e:
            print(f"[skill_search] Warning: PostgREST check for existing roles encountered: {e}")

    # 3. Classify candidate roles: deduplicate in-batch and against existing catalog
    seen_in_batch_ids: Set[str] = set()
    seen_in_batch_titles: Set[str] = set()

    roles_to_insert: List[Dict[str, Any]] = []
    result_roles: List[EscoRoleSuggested] = []

    for r in roles:
        title_en = (r.get("title") or "").strip()
        if not title_en:
            continue

        norm_title = normalize_role_title(title_en)
        derived_slug = slugify_role_title(title_en)
        raw_rid = (r.get("roleId") or "").strip()
        canonical_rid = derived_slug or raw_rid or f"role-{uuid.uuid4().hex[:8]}"

        # Deduplicate within candidate batch
        if norm_title in seen_in_batch_titles or canonical_rid.lower() in seen_in_batch_ids:
            continue
        seen_in_batch_titles.add(norm_title)
        seen_in_batch_ids.add(canonical_rid.lower())

        # Match against existing catalog
        existing_match = (
            (catalog_by_id.get(raw_rid.lower()) if raw_rid else None)
            or (catalog_by_id.get(canonical_rid.lower()) if canonical_rid else None)
            or (catalog_by_slug.get(derived_slug) if derived_slug else None)
            or catalog_by_title_en.get(norm_title)
            or (catalog_by_title_ms.get(normalize_role_title(r.get("title_ms", ""))) if r.get("title_ms") else None)
            or (catalog_by_title_zh.get(normalize_role_title(r.get("title_zh", ""))) if r.get("title_zh") else None)
        )

        if existing_match:
            # Existing role found in catalog - adopt canonical record without duplicate insert
            ex_id = existing_match.get("roleId") or existing_match.get("role_id") or canonical_rid
            ex_title = existing_match.get("title", title_en)
            ex_loc_title = existing_match.get("titleLocalized") or {
                "en": ex_title,
                "ms": r.get("title_ms") or ex_title,
                "zh": r.get("title_zh") or ex_title,
            }
            ex_skills = existing_match.get("requiredSkills") or existing_match.get("required_skills", [])
            ex_loc_skills = existing_match.get("requiredSkillsLocalized") or existing_match.get("required_skills_localized")
            if not ex_loc_skills:
                if existing_match.get("required_skills_ms") and existing_match.get("required_skills_zh"):
                    ex_loc_skills = {
                        "en": ex_skills,
                        "ms": existing_match.get("required_skills_ms"),
                        "zh": existing_match.get("required_skills_zh"),
                    }
                else:
                    ex_loc_skills = localize_skill_list_trilingual(ex_skills)
            ex_radar = existing_match.get("radarRequirement") or existing_match.get("radar_requirements") or r.get("radarRequirements", {})
            ex_sdg = existing_match.get("sdgAlignments") or existing_match.get("sdg_alignments") or []
            ex_mult = existing_match.get("scenarioMultipliers") or existing_match.get("scenario_multipliers") or {"moderate": 1.0, "accelerated_ai": 1.15, "green_economy": 1.10}

            result_roles.append(
                EscoRoleSuggested(
                    roleId=ex_id,
                    title=ex_title,
                    titleLocalized=ex_loc_title,
                    industry=existing_match.get("industry", r.get("industry", "Responsible AI & Digital Transformation")),
                    similarityScore=0.88,
                    requiredSkills=ex_skills,
                    requiredSkillsLocalized=ex_loc_skills,
                    sdgAlignments=ex_sdg,
                    radarRequirements=ex_radar,
                    scenarioMultipliers=ex_mult,
                    isNewlyCreated=False,
                )
            )
        else:
            # Genuinely new role -> stage for embedding computation and DB insertion
            roles_to_insert.append({
                "raw_dict": r,
                "canonical_rid": canonical_rid,
                "title_en": title_en,
            })

    # 4. Process genuinely new roles (generate embeddings and persist to Supabase)
    if roles_to_insert:
        roles_to_embed = []
        for item in roles_to_insert:
            r = item["raw_dict"]
            title = item["title_en"]
            skills_en = r.get("requiredSkills", [])
            desc = r.get("description", "")
            embed_text = f"Role: {title}. Description: {desc}. Competencies: {', '.join(skills_en)}."
            roles_to_embed.append(embed_text)

        role_vectors = await generate_embeddings_batch(roles_to_embed)

        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        new_db_payloads = []

        for i, item in enumerate(roles_to_insert):
            r = item["raw_dict"]
            rid = item["canonical_rid"]
            title_en = item["title_en"]
            title_ms = sanitize_title_ms(r.get("title_ms"), title_en)
            title_zh = r.get("title_zh") or title_en
            industry = r.get("industry", "Responsible AI & Digital Transformation")
            skills_en = r.get("requiredSkills", [])
            skills_ms = sanitize_skills_ms(r.get("requiredSkills_ms"), skills_en)
            skills_zh = r.get("requiredSkills_zh") or [localize_skill_name(s, "zh") for s in skills_en]

            # Register role and skill translations into dynamic dictionary
            register_skill_translation(f"role:{title_en.lower()}", title_zh, title_ms, title_en)
            for s_idx, s_name in enumerate(skills_en):
                zh_trans = skills_zh[s_idx] if s_idx < len(skills_zh) else s_name
                ms_trans = skills_ms[s_idx] if s_idx < len(skills_ms) else s_name
                register_skill_translation(s_name, zh_trans, ms_trans)

            vec = role_vectors[i] if i < len(role_vectors) else None
            sim = 0.85
            if vec and skill_embedding:
                sim = round(max(0.1, min(0.99, cosine_similarity(skill_embedding, vec))), 4)

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
                    isNewlyCreated=True,
                )
            )

        # Batch insert new roles into Supabase
        if new_db_payloads and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                endpoint = f"{base_url}/rest/v1/esco_roles?on_conflict=role_id"
                resp = await client.post(endpoint, json=new_db_payloads, headers=headers)
                if resp.status_code in [200, 201, 204]:
                    print(f"[skill_search] Successfully inserted {len(new_db_payloads)} new roles into Supabase esco_roles.")
                    # Invalidate active roles cache so subsequent queries reflect new roles
                    try:
                        import services.analyze.matching_service as ms_mod
                        ms_mod._last_active_roles_fetch_time = 0.0
                    except Exception:
                        pass
            except Exception as e:
                print(f"[skill_search] Warning: Failed to batch insert new roles: {e}")

    return result_roles



# In-memory cache for closest ESCO roles per skill name
_skill_roles_cache: Dict[str, List[EscoRoleSuggested]] = {}


async def match_closest_esco_roles_via_bge(
    skill_embedding: List[float],
    skill_name: str,
) -> List[EscoRoleSuggested]:
    """
    Finds the 5 closest ESCO occupational roles related to the searched skill using:
    1. Supabase match_roles pgvector stored procedure (HNSW Cosine Similarity).
    2. Fallback to active in-memory / Supabase role catalog with exact skill overlap boosting.
    Cached in-memory per skill name for sub-millisecond retrieval.
    """
    clean_k = skill_name.lower().strip()
    if clean_k in _skill_roles_cache:
        return _skill_roles_cache[clean_k]

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
                        loc_skills = r.get("required_skills_localized")
                        if not loc_skills:
                            if r.get("required_skills_ms") and r.get("required_skills_zh"):
                                loc_skills = {
                                    "en": skills_en,
                                    "ms": r.get("required_skills_ms"),
                                    "zh": r.get("required_skills_zh"),
                                }
                            else:
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
                    _skill_roles_cache[clean_k] = results
                    return results
        except Exception as e:
            print(f"[skill_search] Warning: Supabase match_roles RPC call bypassed ({e}). Using active catalog fallback.")

    # Step B: Fallback to active catalog in memory / Supabase
    active_roles = await fetch_active_roles_from_supabase()
    norm_skill = skill_name.lower().strip()

    scored_roles = []
    for r in active_roles:
        skills = [s.lower().strip() for s in r.get("requiredSkills", [])]
        loc = r.get("requiredSkillsLocalized") or r.get("required_skills_localized") or {}
        if isinstance(loc, dict):
            skills.extend([s.lower().strip() for s in loc.get("ms", [])])
            skills.extend([s.lower().strip() for s in loc.get("zh", [])])
        if r.get("required_skills_ms"):
            skills.extend([s.lower().strip() for s in r.get("required_skills_ms", [])])
        if r.get("required_skills_zh"):
            skills.extend([s.lower().strip() for s in r.get("required_skills_zh", [])])

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
        loc_skills = r.get("requiredSkillsLocalized") or r.get("required_skills_localized")
        if not loc_skills:
            if r.get("required_skills_ms") and r.get("required_skills_zh"):
                loc_skills = {
                    "en": skills_en,
                    "ms": r.get("required_skills_ms"),
                    "zh": r.get("required_skills_zh"),
                }
            else:
                loc_skills = localize_skill_list_trilingual(skills_en)
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

    _skill_roles_cache[clean_k] = results
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

    # 1. Fetch active trend signals from Supabase (sub-millisecond in-memory cache)
    signals = await fetch_trend_signals_from_supabase()

    # 2. Fast-Path: Lexical exact match prioritizing the frontend active language (0.05ms)
    lexical_match = find_lexical_skill_match(clean_query, signals, locale=loc)
    query_vector = None
    is_found = False
    matched_signal: Optional[Dict[str, Any]] = None

    if lexical_match:
        matched_signal = lexical_match
        is_found = True
    else:
        # Pass B: BGE Semantic cosine similarity match (only if lexical match misses)
        query_vector = await generate_embedding(clean_query)
        if signals:
            await ensure_trend_skills_embedded(signals)

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

        if best_semantic_signal and best_sim >= 0.70:
            matched_signal = best_semantic_signal
            is_found = True

    # 4. Handle Case 1: Skill is Found in Database
    if is_found and matched_signal:
        canonical_name = matched_signal.get("skillName", clean_query)
        raw_cat = matched_signal.get("category", "")
        cat = normalize_canonical_category(raw_cat, skill_name=canonical_name)
        status = matched_signal.get("status", "stable")
        velocity_vs = float(matched_signal.get("velocityVs", 0.0))
        current_c = float(matched_signal.get("currentWindowC", 10.0))
        past_c = float(matched_signal.get("pastWindowC", 10.0))
        sources = matched_signal.get("sources", [])
        src0 = sources[0] if (isinstance(sources, list) and sources and isinstance(sources[0], dict)) else {}

        name_ms = src0.get("skillName_ms") or localize_skill_name(canonical_name, "ms")
        name_zh = src0.get("skillName_zh") or localize_skill_name(canonical_name, "zh")
        cat_ms = src0.get("category_ms") or CATEGORY_TRANSLATIONS[cat]["ms"]
        cat_zh = src0.get("category_zh") or CATEGORY_TRANSLATIONS[cat]["zh"]

        # Match top 5 closest roles (sub-millisecond in-memory cache hit)
        clean_k = canonical_name.lower().strip()
        if clean_k in _skill_roles_cache:
            matched_roles = _skill_roles_cache[clean_k]
        else:
            if query_vector is None:
                query_vector = await generate_embedding(canonical_name)
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
            category_ms=cat_ms,
            category_zh=cat_zh,
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
            tierUsed="database",
        )

    # 5. Handle Case 2: Skill is NOT Found -> 3-Tier Dynamic Synthesis
    print(f"[skill_search] Skill '{clean_query}' not found in database. Synthesizing on-demand via 3-Tier Intelligence (Qwen 2.5 -> Gemini Flash -> Deterministic)...")
    synthesized = await synthesize_skill_and_roles_on_demand(clean_query)
    skill_synth = synthesized.get("skill", {})
    roles_synth = synthesized.get("suggestedRoles", [])

    canonical_name = skill_synth.get("skillName") or clean_query.lower()
    name_ms = skill_synth.get("skillName_ms") or canonical_name
    name_zh = skill_synth.get("skillName_zh") or clean_query
    cat = normalize_canonical_category(skill_synth.get("category"), skill_name=canonical_name)
    cat_ms = CATEGORY_TRANSLATIONS[cat]["ms"]
    cat_zh = CATEGORY_TRANSLATIONS[cat]["zh"]
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

    if query_vector is None:
        query_vector = await generate_embedding(clean_query)

    # Persist and return the 5 suggested roles in trilingual ESCO format
    persisted_roles = await persist_new_roles_to_supabase(
        roles=roles_synth,
        skill_embedding=query_vector,
    )

    # If synthesis returned fewer than 5 unique roles, supplement with closest existing roles
    if len(persisted_roles) < 5:
        supplemental = await match_closest_esco_roles_via_bge(
            skill_embedding=query_vector,
            skill_name=canonical_name,
        )
        existing_ids = {r.roleId.lower() for r in persisted_roles}
        existing_titles = {normalize_role_title(r.title) for r in persisted_roles}
        for s_role in supplemental:
            s_norm = normalize_role_title(s_role.title)
            s_id = s_role.roleId.lower()
            if s_id not in existing_ids and s_norm not in existing_titles:
                persisted_roles.append(s_role)
                existing_ids.add(s_id)
                existing_titles.add(s_norm)
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
        category_ms=cat_ms,
        category_zh=cat_zh,
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
        tierUsed=synthesized.get("tierUsed", "deterministic"),
    )
