import time
from typing import Dict, Any
from fastapi import APIRouter, Query, HTTPException
from config import settings
from services.trends import sync_live_trend_signals_to_supabase, search_and_analyze_skill
from services.http_client import get_shared_client
from schemas.trends import SkillSearchRequest, SkillSearchResponse

router = APIRouter()

# In-memory TTL cache for live trends responses (keyed by locale)
_trends_cache: Dict[str, Dict[str, Any]] = {}
_trends_cache_time: float = 0.0
_TRENDS_CACHE_TTL = 60.0  # 60 seconds TTL


def invalidate_trends_cache():
    """Invalidates the in-memory trends cache when a fresh sync completes."""
    global _trends_cache, _trends_cache_time
    _trends_cache.clear()
    _trends_cache_time = 0.0


# Multilingual Category Mappings
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

# Multilingual Status Mappings
STATUS_TRANSLATIONS = {
    "emerging": {
        "en": "Emerging",
        "ms": "Meningkat (Permintaan Tinggi)",
        "zh": "高增长 (新兴需求)",
    },
    "declining": {
        "en": "Declining",
        "ms": "Menurun (Berisiko Automasi)",
        "zh": "面临淘汰 (自动化风险)",
    },
    "stable": {
        "en": "Stable",
        "ms": "Stabil",
        "zh": "平稳需求",
    },
}



@router.get("/trends")
async def get_live_trends(locale: str = "en"):
    """
    Retrieves the latest labor market trend signals stored in Supabase,
    including emerging skills, automation risk velocity scores, and source citations.
    Returns localized skill names, categories, statuses, and citations for Next.js.
    """
    loc = (locale or "en").lower().strip()
    now = time.time()
    global _trends_cache, _trends_cache_time

    # Return cached response instantly (< 1ms) if within TTL
    if loc in _trends_cache and (now - _trends_cache_time < _TRENDS_CACHE_TTL):
        return _trends_cache[loc]

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return {"trends": [], "lastSynced": None, "totalCount": 0, "locale": loc}

    base_url = settings.SUPABASE_URL.rstrip("/")
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8]  # remove /rest/v1

    endpoint = f"{base_url}/rest/v1/trend_signals?select=skillName,category,status,velocityVs,sources,updatedAt&order=velocityVs.desc"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }

    try:
        client = get_shared_client(timeout=5.0)
        resp = await client.get(endpoint, headers=headers)
        if resp.status_code == 200:
            rows = resp.json()

            # Find the true latest timestamp across all records and sources
            latest_timestamp = None
            if rows:
                candidate_timestamps = []
                for r in rows:
                    if r.get("updatedAt"):
                        candidate_timestamps.append(str(r["updatedAt"]))
                    sources = r.get("sources")
                    if isinstance(sources, list):
                        for s in sources:
                            if isinstance(s, dict):
                                for date_key in ("capturedAt", "publishedAt", "date", "timestamp"):
                                    if s.get(date_key):
                                        candidate_timestamps.append(str(s[date_key]))
                if candidate_timestamps:
                    try:
                        from datetime import datetime
                        def parse_iso(ts_str: str) -> datetime:
                            clean_ts = ts_str.replace("Z", "+00:00")
                            try:
                                return datetime.fromisoformat(clean_ts)
                            except Exception:
                                return datetime.min
                        latest_timestamp = max(candidate_timestamps, key=parse_iso)
                    except Exception:
                        latest_timestamp = sorted(candidate_timestamps, reverse=True)[0]
                else:
                    latest_timestamp = rows[0].get("updatedAt")

            localized_signals = []
            for r in rows:
                raw_skill = r.get("skillName", "")
                raw_cat = r.get("category", "Technology")
                raw_status = r.get("status", "stable")
                sources = r.get("sources", [])
                first_source = sources[0] if (isinstance(sources, list) and len(sources) > 0 and isinstance(sources[0], dict)) else {}

                # Localize skill name
                norm_skill = raw_skill.lower().strip()
                if loc == "zh":
                    loc_skill = first_source.get("skillName_zh") or raw_skill
                    loc_cat = first_source.get("category_zh") or CATEGORY_TRANSLATIONS.get(raw_cat, {}).get("zh") or raw_cat
                    loc_citation = first_source.get("citation_zh") or first_source.get("citation", "")
                elif loc == "ms":
                    loc_skill = first_source.get("skillName_ms") or raw_skill
                    loc_cat = first_source.get("category_ms") or CATEGORY_TRANSLATIONS.get(raw_cat, {}).get("ms") or raw_cat
                    loc_citation = first_source.get("citation_ms") or first_source.get("citation", "")
                else:
                    loc_skill = raw_skill
                    loc_cat = raw_cat
                    loc_citation = first_source.get("citation", "")

                loc_status = STATUS_TRANSLATIONS.get(raw_status, {}).get(loc) or raw_status

                localized_signals.append({
                    **r,
                    "skillNameLocalized": loc_skill,
                    "categoryLocalized": loc_cat,
                    "statusLocalized": loc_status,
                    "citationLocalized": loc_citation,
                })

            result = {
                "locale": loc,
                "totalCount": len(localized_signals),
                "lastSynced": latest_timestamp,
                "emergingCount": len([s for s in localized_signals if s.get("status") == "emerging"]),
                "decliningCount": len([s for s in localized_signals if s.get("status") == "declining"]),
                "signals": localized_signals,
            }
            # Cache successfully resolved payload
            _trends_cache[loc] = result
            _trends_cache_time = now
            return result
    except Exception as e:
        return {"error": str(e), "signals": [], "lastSynced": None, "locale": loc}

    return {"signals": [], "lastSynced": None, "totalCount": 0, "locale": loc}


@router.post("/sync-trends")
async def trigger_live_trend_sync():
    """
    Actively triggers a live synchronization pipeline:
    1. Ingests fresh real-time research abstracts from ArXiv (cs.AI).
    2. Ingests live tech job postings from RemoteOK.
    3. Uses 3-Tier LLM Intelligence (Tier 1: Local Qwen 2.5 -> Tier 2: Gemini API -> Tier 3: Deterministic Fallback)
       to extract emerging vs. declining skill velocities and occupational roles.
    4. Upserts fresh trend signals and explicit capture timestamps into Supabase.
    Can be invoked manually or scheduled via Supabase pg_cron.
    """
    result = await sync_live_trend_signals_to_supabase()
    # Invalidate cache so fresh signals appear immediately
    invalidate_trends_cache()
    return result


@router.post("/trends/search", response_model=SkillSearchResponse)
async def search_skill_trend_post(payload: SkillSearchRequest):
    """
    Analyzes a user-searched skill or competency:
    1. First uses BAAI/bge-m3 dense semantic embeddings + lexical match to find the skill in trend_signals.
    2. If found, returns its velocity score, market trend, 7-period visualization curve, and 5 closest ESCO roles.
    3. If not found, prompts Gemini Flash to synthesize the skill trend in trilingual format and 5 suggested roles,
       persists the new skill into trend_signals, embeds and persists the new roles into esco_roles, and returns them.
    """
    try:
        response = await search_and_analyze_skill(
            query=payload.query,
            locale=payload.locale or "en",
        )
        if response.isNewSkillSynthesized:
            invalidate_trends_cache()
        return response
    except Exception as e:
        print(f"[trends_router] Error searching skill '{payload.query}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends/search", response_model=SkillSearchResponse)
async def search_skill_trend_get(
    query: str = Query(..., min_length=1, max_length=120, description="Skill name or keyword to analyze"),
    locale: str = Query(default="en", description="Target language locale (en, ms, zh)"),
):
    """
    GET variant for skill search and trend analysis.
    Useful for client URL-driven searches and quick browser lookups.
    """
    try:
        response = await search_and_analyze_skill(
            query=query,
            locale=locale or "en",
        )
        if response.isNewSkillSynthesized:
            invalidate_trends_cache()
        return response
    except Exception as e:
        print(f"[trends_router] Error searching skill '{query}': {e}")
        raise HTTPException(status_code=500, detail=str(e))
