import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import httpx
from config import settings


def _is_valid_uuid(val: Optional[str]) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError):
        return False


async def persist_assessment_to_supabase(
    assessment_id: str,
    session_id: str,
    user_id: Optional[str],
    active_scenario: str,
    radar_data: List[Dict[str, Any]],
    top_roles: List[Dict[str, Any]],
    selected_role_roadmap: Optional[Dict[str, Any]],
    profile_id: Optional[str] = None,
    certificates_earned: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Persists or updates an assessment row in Supabase assessments table.
    Ensures UUID validation, non-null updatedAt timestamps, and upsert conflict resolution.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None

    base_url = settings.SUPABASE_URL.rstrip("/")
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8]

    endpoint = f"{base_url}/rest/v1/assessments?on_conflict=id"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }

    # Ensure valid UUID for primary key
    clean_id = assessment_id if _is_valid_uuid(assessment_id) else str(uuid.uuid4())
    clean_user_id = user_id if _is_valid_uuid(user_id) else None
    clean_profile_id = profile_id if _is_valid_uuid(profile_id) else None

    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "id": clean_id,
        "session_id": session_id or f"sess-{clean_id[:8]}",
        "userId": clean_user_id,
        "profileId": clean_profile_id,
        "activeScenario": active_scenario or "moderate",
        "radarData": radar_data or [],
        "topRoles": top_roles or [],
        "selectedRoleRoadmap": selected_role_roadmap or {},
        "certificatesEarned": certificates_earned,
        "updatedAt": now_iso,
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(endpoint, json=record, headers=headers)
            if resp.status_code in [200, 201]:
                rows = resp.json()
                if isinstance(rows, list) and len(rows) > 0:
                    return rows[0]
                return record
            else:
                # Log non-200 response for debugging
                pass
    except Exception:
        pass

    return None
