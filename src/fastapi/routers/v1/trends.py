import httpx
from fastapi import APIRouter
from ...config import settings
from ...services.trend_sync_service import sync_live_trend_signals_to_supabase

router = APIRouter()


@router.get("/trends")
async def get_live_trends():
    """
    Retrieves the latest labor market trend signals stored in Supabase,
    including emerging skills, automation risk velocity scores, and source citations.
    Powers the Home Page 'Live Market Pulse' and 'Live Trend Sync Badge'.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return {"trends": [], "lastSynced": None, "totalCount": 0}

    base_url = settings.SUPABASE_URL.rstrip("/")
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8] # remove /rest/v1

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
                return {
                    "totalCount": len(rows),
                    "lastSynced": latest_timestamp,
                    "emergingCount": len([r for r in rows if r.get("status") == "emerging"]),
                    "decliningCount": len([r for r in rows if r.get("status") == "declining"]),
                    "signals": rows,
                }
    except Exception as e:
        return {"error": str(e), "signals": [], "lastSynced": None}

    return {"signals": [], "lastSynced": None, "totalCount": 0}


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
