from typing import Optional, Dict, Any, List
from config import settings
from services.http_client import get_shared_client

USER_ISOLATED_TABLES = {"users", "roadmaps", "roadmap_phases", "shared_roadmaps"}


async def read_table_for_user(table: str, user_id: Optional[str], params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return []

    table_name = table.strip().lower()

    if table_name in USER_ISOLATED_TABLES and not user_id:
        return []

    base_url = settings.SUPABASE_URL.rstrip("/")
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8]

    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }

    client = get_shared_client(timeout=10.0)

    if table_name == "users":
        endpoint = f"{base_url}/rest/v1/users?id=eq.{user_id}"
        resp = await client.get(endpoint, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            records = data if isinstance(data, list) else [data]
            for r in records:
                r.pop("email", None)
                r.pop("name", None)
            return records
        return []

    if table_name == "roadmaps":
        endpoint = f"{base_url}/rest/v1/roadmaps?user_id=eq.{user_id}&order=created_at.desc"
        resp = await client.get(endpoint, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            return data if isinstance(data, list) else []
        return []

    if table_name == "roadmap_phases":
        roadmaps_endpoint = f"{base_url}/rest/v1/roadmaps?user_id=eq.{user_id}&select=id"
        rm_resp = await client.get(roadmaps_endpoint, headers=headers)
        if rm_resp.status_code != 200:
            return []
        rm_data = rm_resp.json()
        if not rm_data or not isinstance(rm_data, list):
            return []
        allowed_ids = [r["id"] for r in rm_data if "id" in r]
        if not allowed_ids:
            return []
        ids_str = ",".join(allowed_ids)
        endpoint = f"{base_url}/rest/v1/roadmap_phases?roadmap_id=in.({ids_str})&order=phase_index.asc"
        resp = await client.get(endpoint, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            return data if isinstance(data, list) else []
        return []

    if table_name == "shared_roadmaps":
        endpoint = f"{base_url}/rest/v1/shared_roadmaps?or=(owner_id.eq.{user_id},target_user_id.eq.{user_id})&order=created_at.desc"
        resp = await client.get(endpoint, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            return data if isinstance(data, list) else []
        return []

    if table_name in {"esco_roles", "sdg_targets", "trend_signals"}:
        limit = params.get("limit", 20) if params else 20
        endpoint = f"{base_url}/rest/v1/{table_name}?limit={limit}"
        resp = await client.get(endpoint, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            return data if isinstance(data, list) else []
        return []

    return []


async def fetch_user_database_summary(user_id: Optional[str]) -> str:
    if not user_id:
        return ""

    profile_records = await read_table_for_user("users", user_id)
    roadmaps_records = await read_table_for_user("roadmaps", user_id)
    phases_records = await read_table_for_user("roadmap_phases", user_id)
    shared_records = await read_table_for_user("shared_roadmaps", user_id)

    sections = []

    if profile_records and len(profile_records) > 0:
        p = profile_records[0]
        profile_summary = (
            f"User Profile: "
            f"Job Title: {p.get('currentJobTitle')}, Industry: {p.get('industry')}, "
            f"Career Goal: {p.get('careerGoal')}, Target Job: {p.get('targetJobTitle')}, "
            f"Skills: {p.get('skills')}, Level: {p.get('level')}, EXP: {p.get('exp')}"
        )
        sections.append(profile_summary)

    if roadmaps_records and len(roadmaps_records) > 0:
        rm_lines = []
        for r in roadmaps_records[:3]:
            rm_lines.append(
                f"- Roadmap ID: {r.get('id')}, Target: {r.get('targetRoleTitle')}, "
                f"Status: {r.get('status')}, Match: {r.get('matchScore')}%, "
                f"Strengths: {r.get('matchedStrengths')}, Skills Gap: {r.get('skillsGap')}"
            )
        sections.append("User Roadmaps:\n" + "\n".join(rm_lines))

    if phases_records and len(phases_records) > 0:
        phase_lines = []
        for ph in phases_records[:5]:
            phase_lines.append(
                f"- Phase {ph.get('phaseIndex')}: {ph.get('phaseTitle')} "
                f"(Completed: {ph.get('isCompleted')}, Weeks: {ph.get('durationWeeks')})"
            )
        sections.append("Roadmap Learning Phases:\n" + "\n".join(phase_lines))

    if shared_records and len(shared_records) > 0:
        shared_lines = []
        for sh in shared_records[:3]:
            shared_lines.append(
                f"- Shared Roadmap ID: {sh.get('id')}, Title: {sh.get('title')}, "
                f"Access: {sh.get('accessLevel')}, Public: {sh.get('isPublic')}"
            )
        sections.append("User Shared Roadmaps:\n" + "\n".join(shared_lines))

    return "\n\n".join(sections)
