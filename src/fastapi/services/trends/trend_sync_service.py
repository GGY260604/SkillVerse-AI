import asyncio
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any
import httpx

from config import settings
from services.gemini_service import call_gemini_with_fallback
from services.embedding_service import generate_embedding, generate_embeddings_batch
from services.http_client import get_shared_client

# This API is used to get the latest AI research papers from ArXiv, which is a research papers website
ARXIV_API_URL = (
    "https://export.arxiv.org/api/query?"
    "search_query=cat:cs.AI&sortBy=lastUpdatedDate&sortOrder=descending&max_results=10"
)

# This API is used to get the latest remote job postings from RemoteOK, which is a remote job board
REMOTEOK_API_URL = "https://remoteok.com/api"

# Used for sync_live_trend_signals_to_supabase by pulling open feeds and send to the LLM to extract emerging vs declining skills, then updating the trend_signals table
async def fetch_live_arxiv_signals(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """
    Pulls real-time AI & Computer Science research papers from ArXiv cs.AI API.
    Extracts paper title, abstract summary, publication date, and canonical URL.
    """
    results = []
    try:
        resp = await client.get(ARXIV_API_URL, timeout=12.0)
        if resp.status_code == 200:
            root = ET.fromstring(resp.text) # root element of the XML tree
            ns = {"atom": "http://www.w3.org/2005/Atom"} # namespace for XML
            entries = root.findall("atom:entry", ns) # find all entries in the XML tree
            for entry in entries: # iterate over each entry
                title = (entry.findtext("atom:title", namespaces=ns) or "").strip().replace("\n", " ") # extract title from each entry
                summary = (entry.findtext("atom:summary", namespaces=ns) or "").strip().replace("\n", " ") # extract summary from each entry
                link = entry.findtext("atom:id", namespaces=ns) or "https://arxiv.org/abs/cs.AI" # extract URL from each entry
                published = entry.findtext("atom:published", namespaces=ns) or datetime.now(timezone.utc).isoformat()
                results.append({
                    "source": "ArXiv cs.AI",
                    "title": title,
                    "snippet": summary[:250],
                    "url": link,
                    "publishedAt": published,
                })
    except Exception as e:
        print(f"[!] Warning: ArXiv fetch failed ({e}). Continuing with other sources.")
    return results

# Used for sync_live_trend_signals_to_supabase by pulling open feeds and send to the LLM to extract emerging vs declining skills, then updating the trend_signals table
async def fetch_live_remoteok_signals(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """
    Pulls live remote job market postings from the RemoteOK public JSON API.
    Extracts role titles, skill tags, employer, posting date, and job URLs.
    """
    results = []
    headers = {"User-Agent": "SkillVerse-AI/1.0 (Hackathon Workforce Intelligence Platform)"}
    try:
        resp = await client.get(REMOTEOK_API_URL, headers=headers, timeout=12.0)
        if resp.status_code == 200:
            jobs = resp.json()
            real_jobs = [j for j in jobs if isinstance(j, dict) and "position" in j]
            for job in real_jobs[:15]:
                pos = job.get("position", "Software & AI Role")
                tags = job.get("tags", [])
                company = job.get("company", "Tech Company")
                url = job.get("url", "https://remoteok.com")
                date = job.get("date", datetime.now(timezone.utc).isoformat())
                results.append({
                    "source": "RemoteOK Job Feed",
                    "title": f"{pos} at {company}",
                    "snippet": f"Active tags: {', '.join(tags[:8])}",
                    "url": url,
                    "publishedAt": date,
                })
    except Exception as e:
        print(f"[!] Warning: RemoteOK fetch failed ({e}). Continuing.")
    return results


TREND_EXTRACTION_PROMPT = """
You are the Live Market Intelligence Engine for SkillVerse AI.
Analyze the following live unformatted data stream gathered from:
1. ArXiv Computer Science (cs.AI) research feed
2. RemoteOK real-time tech job market feed

LIVE DATA STREAM:
{stream_content}

TASK:
1. Identify 6 to 10 distinct, specific competencies, technical skills, or modern frameworks mentioned across these real-time signals.
2. Determine whether each skill is:
   - "emerging": High growth, cutting-edge, rising adoption (velocityVs between +0.30 and +0.85)
   - "declining": Routine clerical/manual tasks being automated or superseded (velocityVs between -0.20 and -0.50)
   - "stable": Baseline established competency (velocityVs between -0.10 and +0.20)
3. Assign each skill to a valid category: "Artificial Intelligence", "Cloud & DevOps", "Data Engineering", "Cybersecurity", "Clean Tech & ESG", "Digital Marketing", or "Operations".
4. Cite the exact source title and URL from the input stream.
5. Identify 1 to 2 Emerging Occupational Roles or New Job Titles appearing in these live listings/research (e.g., 'AI Agent Systems Architect', 'MLOps Infrastructure Specialist', 'Autonomous Workflow Engineer', 'Carbon Accounting Analyst').

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{{
  "trendSignals": [
    {{
      "skillName": "canonical skill name in lower case",
      "skillName_ms": "nama kemahiran dalam Bahasa Melayu",
      "skillName_zh": "中文技能名称",
      "category": "Category Name (e.g. Artificial Intelligence, Cloud & DevOps, Clean Tech & ESG)",
      "category_ms": "Nama Kategori dalam Bahasa Melayu",
      "category_zh": "中文类别名称",
      "status": "emerging" | "declining" | "stable",
      "velocityVs": 0.65,
      "sourceName": "ArXiv cs.AI" | "RemoteOK Job Feed",
      "sourceUrl": "https://...",
      "citation": "Brief sentence explaining the trend insight in English",
      "citation_ms": "Keterangan ringkas trend dalam Bahasa Melayu",
      "citation_zh": "趋势中文说明"
    }}
  ],
  "emergingRoles": [
    {{
      "roleId": "canonical-slug-role-id",
      "title": "Professional Role Title in English",
      "title_ms": "Tajuk Peranan dalam Bahasa Melayu",
      "title_zh": "中文职位名称 (Simplified Chinese)",
      "industry": "Responsible AI & Digital Transformation",
      "description": "Clear 1-2 sentence description of what this professional does.",
      "essentialSkills": ["skill 1 in English", "skill 2 in English", "skill 3 in English", "skill 4 in English", "skill 5 in English"],
      "essentialSkills_ms": ["kemahiran 1 dalam Bahasa Melayu", "kemahiran 2 dalam Bahasa Melayu", "kemahiran 3 dalam Bahasa Melayu", "kemahiran 4 dalam Bahasa Melayu", "kemahiran 5 dalam Bahasa Melayu"],
      "essentialSkills_zh": ["技能 1 中文名称", "技能 2 中文名称", "技能 3 中文名称", "技能 4 中文名称", "技能 5 中文名称"],
      "sdgAlignment": "SDG 8.2",
      "sdgTitle": "Technological upgrading & productivity"
    }}
  ]
}}
"""


async def sync_live_trend_signals_to_supabase() -> Dict[str, Any]:
    """
    Executes an end-to-end dynamic trend synchronization:
    1. Fetches live ArXiv research and RemoteOK job postings.
    2. Batch-extracts emerging vs. declining skills with Gemini 1.5 Flash.
    3. Persists updated signals and timestamps into Supabase `trend_signals`.
    """
    capture_time = datetime.now(timezone.utc).isoformat()

    client = get_shared_client(timeout=15.0)
    arxiv_items, remoteok_items = await asyncio.gather(
        fetch_live_arxiv_signals(client),
        fetch_live_remoteok_signals(client),
    )

    all_items = arxiv_items + remoteok_items
    if not all_items:
        return {
            "success": False,
            "message": "No live signals could be retrieved from open feeds.",
            "syncedCount": 0,
            "capturedAt": capture_time,
        }

    # Format live stream text for LLM parsing
    stream_lines = []
    for idx, item in enumerate(all_items, 1):
        stream_lines.append(
            f"[{idx}] Source: {item['source']} | Title: {item['title']} | "
            f"URL: {item['url']} | Published: {item['publishedAt']}\n"
            f"    Snippet: {item['snippet']}"
        )
    stream_content = "\n\n".join(stream_lines)

    prompt = TREND_EXTRACTION_PROMPT.format(stream_content=stream_content)
    contents = [{"parts": [{"text": prompt}]}]

    try:
        extracted = await call_gemini_with_fallback(
            contents,
            system_instruction="You are the Live Market Intelligence Engine for SkillVerse AI. Output strictly valid JSON matching the requested schema.",
            max_output_tokens=6000,
        )
        signals = extracted.get("trendSignals", [])
        emerging_roles = extracted.get("emergingRoles", [])
    except Exception as e:
        print(f"[!] Gemini trend extraction error: {e}")
        signals = []
        emerging_roles = []

    if not signals and not emerging_roles:
        return {
            "success": False,
            "message": "Failed to parse trend signals from live stream.",
            "syncedCount": 0,
            "syncedRolesCount": 0,
            "capturedAt": capture_time,
        }

    # Upsert signals into Supabase `trend_signals` table
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

    synced_count = 0
    roles_synced_count = 0
    client = get_shared_client(timeout=30.0)

    # Pre-fetch existing trend signals from Supabase to obtain real historical baseline (pastWindowC)
    existing_trends: Dict[str, float] = {}
    try:
        query_resp = await client.get(
            f"{base_url}/rest/v1/trend_signals?select=skillName,currentWindowC",
            headers={
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            },
            timeout=10.0,
        )
        if query_resp.status_code == 200:
            for row in query_resp.json():
                name = (row.get("skillName") or "").lower().strip()
                if name and row.get("currentWindowC") is not None:
                    existing_trends[name] = float(row["currentWindowC"])
    except Exception as e:
        print(f"[!] Warning: Could not pre-fetch historical trend signals: {e}")

    # Deduplicate and build batch payload array for all trend signals
    seen_skills = set()
    signal_payloads: List[Dict[str, Any]] = []

    for s in signals:
        skill_name = s.get("skillName", "").lower().strip()
        if not skill_name or skill_name in seen_skills:
            continue
        seen_skills.add(skill_name)

        # 1. Real Frequency Calculation (Ct): Count actual occurrences across live ArXiv and RemoteOK items
        mention_count = sum(
            1 for item in all_items
            if skill_name in item.get("title", "").lower() or skill_name in item.get("snippet", "").lower()
        )
        current_c = float(max(mention_count, 1))

        # 2. Historical Baseline (Ct-1): Use existing Supabase value if present, or derive initial baseline
        if skill_name in existing_trends:
            past_c = max(existing_trends[skill_name], 1.0)
            real_velocity = round((current_c - past_c) / past_c, 3)
        else:
            # Brand new skill: Derive initial baseline from Gemini's initial velocity estimation
            llm_v = float(s.get("velocityVs", 0.35))
            if llm_v > 0:
                past_c = max(1.0, round(current_c / (1.0 + llm_v), 1))
            else:
                past_c = max(1.0, round(current_c * (1.0 - llm_v), 1))
            real_velocity = round((current_c - past_c) / past_c, 3)

        # 3. Dynamic Status Classification according to mathematical specification (README 5.1)
        # Emerging: Vs > +0.25 | Declining: Vs < -0.15 | Stable: -0.15 <= Vs <= +0.25
        if real_velocity > 0.25:
            calc_status = "emerging"
        elif real_velocity < -0.15:
            calc_status = "declining"
        else:
            calc_status = "stable"

        signal_payloads.append({
            "id": str(uuid.uuid4()),
            "skillName": skill_name,
            "category": s.get("category", "Technology"),
            "status": calc_status,
            "velocityVs": real_velocity,
            "currentWindowC": current_c,
            "pastWindowC": past_c,
            "sources": [
                {
                    "sourceName": s.get("sourceName", "Live Open Labor Feed"),
                    "url": s.get("sourceUrl", "https://export.arxiv.org"),
                    "citation": s.get("citation", "Extracted from real-time market data feed."),
                    "citation_ms": s.get("citation_ms", ""),
                    "citation_zh": s.get("citation_zh", ""),
                    "skillName_ms": s.get("skillName_ms", skill_name),
                    "skillName_zh": s.get("skillName_zh", skill_name),
                    "category_ms": s.get("category_ms", s.get("category", "Technology")),
                    "category_zh": s.get("category_zh", s.get("category", "Technology")),
                    "capturedAt": capture_time,
                }
            ],
            "updatedAt": capture_time,
        })

    # Execute single batch upsert for all trend signals
    if signal_payloads:
        resp = await client.post(endpoint, json=signal_payloads, headers=headers)
        if resp.status_code in [200, 201, 204]:
            synced_count = len(signal_payloads)
        else:
            # Fallback to individual rows if batch was partially rejected
            print(f"[!] Batch upsert failed ({resp.status_code}), falling back to individual rows...")
            for payload in signal_payloads:
                ind_resp = await client.post(endpoint, json=payload, headers=headers)
                if ind_resp.status_code in [200, 201, 204]:
                    synced_count += 1

    # Dynamically batch upsert newly discovered occupational roles into `esco_roles`
    if emerging_roles:
        roles_endpoint = f"{base_url}/rest/v1/esco_roles?on_conflict=role_id"
        role_payloads: List[Dict[str, Any]] = []

        # Prepare role metadata and batch embeddings concurrently
        role_items_to_embed = []
        for role in emerging_roles:
            r_id = role.get("roleId") or f"emerging-{uuid.uuid4().hex[:8]}"
            title = role.get("title", "Emerging Professional Role")
            title_ms = role.get("title_ms") or title
            title_zh = role.get("title_zh") or title
            skills_en = role.get("essentialSkills", [])
            skills_ms = role.get("essentialSkills_ms") or []
            skills_zh = role.get("essentialSkills_zh") or []
            if not skills_ms or len(skills_ms) < len(skills_en):
                from services.analyze.skill_translations import localize_skill_name
                skills_ms = [localize_skill_name(s, "ms") for s in skills_en]
            if not skills_zh or len(skills_zh) < len(skills_en):
                from services.analyze.skill_translations import localize_skill_name
                skills_zh = [localize_skill_name(s, "zh") for s in skills_en]

            localized_skills = {
                "en": skills_en,
                "ms": skills_ms,
                "zh": skills_zh,
            }
            desc = role.get("description", "")
            industry = role.get("industry", "Responsible AI & Digital Transformation")
            embed_text = f"Role: {title}. Description: {desc}. Essential Skills: {', '.join(skills_en)}"

            role_items_to_embed.append({
                "role_id": r_id,
                "title": title,
                "title_ms": title_ms,
                "title_zh": title_zh,
                "industry": industry,
                "skills_en": skills_en,
                "skills_ms": skills_ms,
                "skills_zh": skills_zh,
                "localized_skills": localized_skills,
                "sdg_alignments": [{"code": role.get("sdgAlignment", "SDG 8.2"), "title": role.get("sdgTitle", "Technological upgrading & productivity")}],
                "embed_text": embed_text,
            })

        # Generate dense embeddings concurrently via vectorized batch inference
        role_texts = [item["embed_text"] for item in role_items_to_embed]
        role_vectors = await generate_embeddings_batch(role_texts)

        for item, vector in zip(role_items_to_embed, role_vectors):
            role_payloads.append({
                "id": str(uuid.uuid4()),
                "role_id": item["role_id"],
                "title": item["title"],
                "title_ms": item["title_ms"],
                "title_zh": item["title_zh"],
                "industry": item["industry"],
                "required_skills": item["skills_en"],
                "required_skills_ms": item["skills_ms"],
                "required_skills_zh": item["skills_zh"],
                "required_skills_localized": item["localized_skills"],
                "embedding": vector,
                "scenario_multipliers": {"conservative": 1.0, "moderate": 1.15, "disruptive": 1.30},
                "sdg_alignments": item["sdg_alignments"],
                "radar_requirements": {
                    "Technical Aptitude": 85,
                    "Domain Operations": 75,
                    "Automation Resilience": 85,
                    "Learning Agility": 85,
                    "Strategic Leadership": 70,
                },
                "created_at": capture_time,
                "updated_at": capture_time,
            })

        # Execute single batch upsert for roles
        r_resp = await client.post(roles_endpoint, json=role_payloads, headers=headers)
        if r_resp.status_code in [200, 201, 204]:
            roles_synced_count = len(role_payloads)
        else:
            for rp in role_payloads:
                ind_r_resp = await client.post(roles_endpoint, json=rp, headers=headers)
                if ind_r_resp.status_code in [200, 201, 204]:
                    roles_synced_count += 1

    return {
        "success": True,
        "message": f"Successfully synced {synced_count} live trend signals and {roles_synced_count} emerging occupational roles from ArXiv & RemoteOK feeds.",
        "syncedCount": synced_count,
        "syncedRolesCount": roles_synced_count,
        "sourcesProcessed": ["ArXiv cs.AI (Latest Research)", "RemoteOK (Live Global Remote Jobs)"],
        "capturedAt": capture_time,
        "sampleSignals": [s.get("skillName") for s in signals[:5]],
        "sampleRoles": [r.get("title") for r in emerging_roles],
    }
