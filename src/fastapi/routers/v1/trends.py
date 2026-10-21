import httpx
from fastapi import APIRouter
from config import settings
from services.trend_sync_service import sync_live_trend_signals_to_supabase

router = APIRouter()


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

# Common Baseline Skill Translations
COMMON_SKILL_TRANSLATIONS = {
    "manual data entry": {"ms": "Kemasukan data manual", "zh": "手动数据录入"},
    "manual tier-1 support triaging": {"ms": "Pengasingan sokongan tahap-1 manual", "zh": "手动一线客服分流"},
    "routine document filing": {"ms": "Pemfailan dokumen rutin", "zh": "常规文档归档与整理"},
    "basic switchboard routing": {"ms": "Penghalaan papan suis asas", "zh": "基础总机电话转接"},
    "generic copywriting": {"ms": "Penulisan salinan generik", "zh": "通用文案撰写"},
    "simple bookkeeping reconciliation": {"ms": "Penyesuaian simpan kira mudah", "zh": "基础账目核对与对账"},
    "telemarketing outbound calling": {"ms": "Panggilan keluar pemasaran tele", "zh": "电话推销外呼"},
    "ai agents": {"ms": "Ejen AI Autonomi", "zh": "自主 AI 智能体系统"},
    "ai agentic systems": {"ms": "Sistem Ejen AI Berautonomi", "zh": "自主 AI 智能体系统架构"},
    "llm orchestration": {"ms": "Orkestrasi Model Bahasa Besar (LLM)", "zh": "大语言模型编排架构"},
    "vector database engineering": {"ms": "Kejuruteraan Pangkalan Data Vektor", "zh": "向量数据库工程"},
    "retrieval augmented generation (rag)": {"ms": "Penjanaan Terimbuh Dapatan (RAG)", "zh": "检索增强生成 (RAG)"},
    "prompt engineering": {"ms": "Kejuruteraan Prompt", "zh": "提示词工程与调优"},
    "esg carbon accounting": {"ms": "Perakaunan Karbon ESG", "zh": "ESG 碳足迹审计与核算"},
}


@router.get("/trends")
async def get_live_trends(locale: str = "en"):
    """
    Retrieves the latest labor market trend signals stored in Supabase,
    including emerging skills, automation risk velocity scores, and source citations.
    Returns localized skill names, categories, statuses, and citations for Next.js.
    """
    loc = (locale or "en").lower().strip()
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
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(endpoint, headers=headers)
            if resp.status_code == 200:
                rows = resp.json()
                latest_timestamp = rows[0].get("updatedAt") if rows else None

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
                        loc_skill = first_source.get("skillName_zh") or COMMON_SKILL_TRANSLATIONS.get(norm_skill, {}).get("zh") or raw_skill
                        loc_cat = first_source.get("category_zh") or CATEGORY_TRANSLATIONS.get(raw_cat, {}).get("zh") or raw_cat
                        loc_citation = first_source.get("citation_zh") or first_source.get("citation", "")
                    elif loc == "ms":
                        loc_skill = first_source.get("skillName_ms") or COMMON_SKILL_TRANSLATIONS.get(norm_skill, {}).get("ms") or raw_skill
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

                return {
                    "locale": loc,
                    "totalCount": len(localized_signals),
                    "lastSynced": latest_timestamp,
                    "emergingCount": len([s for s in localized_signals if s.get("status") == "emerging"]),
                    "decliningCount": len([s for s in localized_signals if s.get("status") == "declining"]),
                    "signals": localized_signals,
                }
    except Exception as e:
        return {"error": str(e), "signals": [], "lastSynced": None, "locale": loc}

    return {"signals": [], "lastSynced": None, "totalCount": 0, "locale": loc}


@router.post("/sync-trends")
async def trigger_live_trend_sync():
    """
    Actively triggers a live synchronization pipeline:
    1. Ingests fresh real-time research abstracts from ArXiv (cs.AI).
    2. Ingests live tech job postings from RemoteOK.
    3. Uses Gemini 1.5 Flash batch extraction to compute skill velocities.
    4. Upserts fresh trend signals and explicit capture timestamps into Supabase.
    Can be invoked manually or scheduled via Supabase pg_cron.
    """
    result = await sync_live_trend_signals_to_supabase()
    return result
