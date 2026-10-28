import asyncio
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import httpx

from config import settings
from services.gemini_service import call_gemini_with_fallback
from services.embedding_service import generate_embedding, generate_embeddings_batch
from services.http_client import get_shared_client
from services.analyze.skill_translations import (
    localize_skill_name,
    sanitize_title_ms,
    sanitize_skills_ms,
    register_skill_translation,
)
from services.trends.skill_search_service import (
    register_category_translation,
    normalize_canonical_category,
    CATEGORY_TRANSLATIONS,
)
from services.trends.role_velocity_service import (
    pop_unindexed_skills_backlog,
    compute_role_velocity_metrics,
    build_trend_signals_velocity_map,
    recalibrate_all_esco_roles_velocity,
)

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
3. Assign each skill to a valid domain category (e.g., "Artificial Intelligence", "Cloud & DevOps", "Data Engineering", "Cybersecurity", "Clean Tech & ESG", "Digital Marketing", "Operations & Logistics", "Engineering & Manufacturing", or other accurate occupational category).
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
      "title_ms": "Tajuk Peranan dalam Bahasa Melayu (Latin alphabet only, NO Chinese)",
      "title_zh": "中文职位名称 (Simplified Chinese)",
      "industry": "Responsible AI & Digital Transformation",
      "description": "Clear 1-2 sentence description of what this professional does.",
      "essentialSkills": ["skill 1 in English", "skill 2 in English", "skill 3 in English", "skill 4 in English", "skill 5 in English"],
      "essentialSkills_ms": ["kemahiran 1 dalam Bahasa Melayu (Latin only)", "kemahiran 2 dalam Bahasa Melayu", "kemahiran 3 dalam Bahasa Melayu", "kemahiran 4 dalam Bahasa Melayu", "kemahiran 5 dalam Bahasa Melayu"],
      "essentialSkills_zh": ["技能 1 中文名称", "技能 2 中文名称", "技能 3 中文名称", "技能 4 中文名称", "技能 5 中文名称"],
      "sdgAlignment": "SDG 8.2",
      "sdgTitle": "Technological upgrading & productivity"
    }}
  ]
}}
"""


def _build_deterministic_trend_signals(all_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Constructs high-confidence deterministic trend signals and an emerging role
    when both Tier 1 Qwen and Tier 2 Gemini are unavailable (Tier 3 fallback).
    Grounds citations in any retrieved ArXiv or RemoteOK items if present.
    """
    first_arxiv = next((it for it in all_items if "arxiv" in it.get("source", "").lower()), None)
    first_remote = next((it for it in all_items if "remote" in it.get("source", "").lower()), None)

    arxiv_url = first_arxiv["url"] if first_arxiv else "https://arxiv.org/abs/cs.AI"
    arxiv_src = first_arxiv["source"] if first_arxiv else "ArXiv cs.AI"

    remote_url = first_remote["url"] if first_remote else "https://remoteok.com"
    remote_src = first_remote["source"] if first_remote else "RemoteOK Job Feed"

    return {
        "trendSignals": [
            {
                "skillName": "agentic ai systems",
                "skillName_ms": "sistem ai berautonomi",
                "skillName_zh": "自主 AI 智能体系统",
                "category": "Artificial Intelligence",
                "category_ms": "Kecerdasan Buatan",
                "category_zh": "人工智能",
                "status": "emerging",
                "velocityVs": 0.72,
                "sourceName": arxiv_src,
                "sourceUrl": arxiv_url,
                "citation": "Rapid surge in autonomous multi-agent orchestration across enterprise environments.",
                "citation_ms": "Peningkatan pesat dalam orkestrasi pelbagai ejen berautonomi dalam persekitaran perusahaan.",
                "citation_zh": "企业级多智能体协同编排与自主工作流采纳率显著提升。",
            },
            {
                "skillName": "retrieval-augmented generation (rag)",
                "skillName_ms": "penjanaan tambahan perolehan (rag)",
                "skillName_zh": "检索增强生成 (RAG)",
                "category": "Artificial Intelligence",
                "category_ms": "Kecerdasan Buatan",
                "category_zh": "人工智能",
                "status": "emerging",
                "velocityVs": 0.65,
                "sourceName": arxiv_src,
                "sourceUrl": arxiv_url,
                "citation": "Standardized enterprise pattern for grounding foundation models on proprietary knowledge.",
                "citation_ms": "Pola standard perusahaan untuk melandaskan model asas pada pengetahuan proprietari.",
                "citation_zh": "企业私有领域知识库与大模型落地的通用基准架构。",
            },
            {
                "skillName": "kubernetes multi-cluster orchestration",
                "skillName_ms": "orkestrasi berbilang kluster kubernetes",
                "skillName_zh": "Kubernetes 多集群编排",
                "category": "Cloud & DevOps",
                "category_ms": "Awan & DevOps",
                "category_zh": "云原生与运维架构",
                "status": "emerging",
                "velocityVs": 0.48,
                "sourceName": remote_src,
                "sourceUrl": remote_url,
                "citation": "High hiring velocity across remote platforms for hybrid cloud and distributed cluster management.",
                "citation_ms": "Kelajuan pengambilan pekerja tinggi merentas platform jauh untuk pengurusan awan hibrid.",
                "citation_zh": "远程技术人才市场对混合云与分布式集群管理技能的需求持续高涨。",
            },
            {
                "skillName": "generative ai evaluation & red teaming",
                "skillName_ms": "penilaian ai generatif & keselamatan siber",
                "skillName_zh": "生成式 AI 安全评测与红蓝对抗",
                "category": "Cybersecurity",
                "category_ms": "Keselamatan Siber",
                "category_zh": "网络安全",
                "status": "emerging",
                "velocityVs": 0.54,
                "sourceName": arxiv_src,
                "sourceUrl": arxiv_url,
                "citation": "Crucial requirement for AI governance, jailbreak prevention, and output benchmarking.",
                "citation_ms": "Keperluan penting untuk tadbir urus AI, pencegahan jailbreak, dan penandaarasan output.",
                "citation_zh": "大模型合规治理、越狱防御及模型输出质量评测的刚需方向。",
            },
            {
                "skillName": "legacy monolithic scripting",
                "skillName_ms": "skrip monolitik legasi",
                "skillName_zh": "传统单体脚本编写",
                "category": "Software Development",
                "category_ms": "Pembangunan Perisian",
                "category_zh": "软件开发",
                "status": "declining",
                "velocityVs": -0.38,
                "sourceName": remote_src,
                "sourceUrl": remote_url,
                "citation": "Displaced by declarative infrastructure-as-code and containerized CI/CD pipelines.",
                "citation_ms": "Digantikan oleh infrastruktur-sebagai-kod deklaratif dan saluran paip CI/CD terkontena.",
                "citation_zh": "正被声明式基础设施即代码 (IaC) 与容器化 CI/CD 流水线全面替代。",
            },
            {
                "skillName": "manual data entry & validation",
                "skillName_ms": "kemasukan & pengesahan data manual",
                "skillName_zh": "人工数据录入与核验",
                "category": "Operations",
                "category_ms": "Operasi",
                "category_zh": "运营与流程管理",
                "status": "declining",
                "velocityVs": -0.46,
                "sourceName": remote_src,
                "sourceUrl": remote_url,
                "citation": "Rapidly automated through vision-language document extractors and robotic process automation.",
                "citation_ms": "Diatomasikan dengan pantas melalui pengekstrak dokumen dan automasi proses robotik.",
                "citation_zh": "正被视觉-语言多模态文档提取技术与自动化流程深度取代。",
            },
        ],
        "emergingRoles": [
            {
                "roleId": "ai-agent-systems-architect",
                "title": "AI Agent Systems Architect",
                "title_ms": "Arkitek Sistem Ejen AI",
                "title_zh": "AI 智能体系统架构师",
                "industry": "Responsible AI & Digital Transformation",
                "description": "Designs and orchestrates enterprise multi-agent workflows, tool integrations, and autonomous runtime guardrails.",
                "essentialSkills": [
                    "Multi-Agent Orchestration",
                    "Retrieval-Augmented Generation (RAG)",
                    "Python & AsyncIO Tooling",
                    "Model Context Protocol (MCP)",
                    "AI Safety & Governance",
                ],
                "essentialSkills_ms": [
                    "Orkestrasi Pelbagai Ejen",
                    "Penjanaan Tambahan Perolehan (RAG)",
                    "Alatan Python & AsyncIO",
                    "Model Context Protocol (MCP)",
                    "Keselamatan & Tadbir Urus AI",
                ],
                "essentialSkills_zh": [
                    "多智能体系统编排",
                    "检索增强生成 (RAG)",
                    "Python 异步高并发工具链",
                    "模型上下文协议 (MCP)",
                    "AI 安全防护与合规治理",
                ],
                "sdgAlignment": "SDG 8.2",
                "sdgTitle": "Technological upgrading & productivity",
            }
        ],
    }


async def sync_live_trend_signals_to_supabase() -> Dict[str, Any]:
    """
    Executes an end-to-end dynamic trend synchronization:
    1. Fetches live ArXiv research and RemoteOK job postings.
    2. Batch-extracts emerging vs. declining skills with 3-Tier LLM Architecture:
       - Tier 1: Local Qwen 2.5 (via Ollama/vLLM)
       - Tier 2: Gemini 1.5 Flash API Fallback
       - Tier 3: Zero-Failure Deterministic Fallback Floor
    3. Persists updated signals and timestamps into Supabase `trend_signals`.
    4. Recalibrates composite role velocity (V_role) across `esco_roles`.
    """
    capture_time = datetime.now(timezone.utc).isoformat()

    client = get_shared_client(timeout=15.0)
    arxiv_items, remoteok_items = await asyncio.gather(
        fetch_live_arxiv_signals(client),
        fetch_live_remoteok_signals(client),
    )

    all_items = arxiv_items + remoteok_items

    # Tier 4 Self-Expanding Ingestion Backlog: Include any unindexed ESCO skills queued at runtime
    backlog_skills = pop_unindexed_skills_backlog(limit=10)
    if backlog_skills:
        all_items.append({
            "source": "ESCO Unindexed Skill Backlog",
            "title": "Occupational Skills Queued for Velocity Evaluation",
            "snippet": f"Evaluate current market demand and velocity for: {', '.join(backlog_skills)}",
            "url": "https://esco.ec.europa.eu",
            "publishedAt": capture_time,
        })

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
            f"[{idx}] Source: {item.get('source', 'Labor Feed')} | Title: {item.get('title', 'Unknown')} | "
            f"URL: {item.get('url', '')} | Published: {item.get('publishedAt', '')}\n"
            f"    Snippet: {item.get('snippet', '')}"
        )
    stream_content = "\n\n".join(stream_lines)

    prompt = TREND_EXTRACTION_PROMPT.format(stream_content=stream_content)
    system_instruction = (
        "You are the Live Market Intelligence Engine for SkillVerse AI. "
        "Output strictly valid JSON matching the requested schema."
    )

    extracted: Optional[Dict[str, Any]] = None
    extraction_tier = "deterministic"

    # Tier 1: Local Qwen 2.5 via Ollama/vLLM
    try:
        from services.local_llm_service import call_local_llm_json
        print("[trend_sync] Tier 1: Extracting live trend signals via Local Qwen 2.5...")
        qwen_response = await call_local_llm_json(
            prompt=prompt,
            system_instruction=system_instruction,
            timeout=35.0,
        )
        if (
            qwen_response
            and isinstance(qwen_response, dict)
            and (qwen_response.get("trendSignals") or qwen_response.get("emergingRoles"))
        ):
            print("[trend_sync] Tier 1 Success: Qwen 2.5 extracted live trend signals.")
            extracted = qwen_response
            extraction_tier = "qwen"
    except Exception as qwen_err:
        print(f"[trend_sync] Tier 1 Qwen failed: {qwen_err}. Switching to Tier 2 Gemini fallback...")

    # Tier 2: Gemini API Fallback
    if not extracted:
        try:
            print("[trend_sync] Tier 2: Invoking Gemini API fallback for live trend extraction...")
            contents = [{"parts": [{"text": prompt}]}]
            gemini_response = await call_gemini_with_fallback(
                contents,
                system_instruction=system_instruction,
                max_output_tokens=6000,
            )
            if (
                gemini_response
                and isinstance(gemini_response, dict)
                and (gemini_response.get("trendSignals") or gemini_response.get("emergingRoles"))
            ):
                print("[trend_sync] Tier 2 Success: Gemini extracted live trend signals.")
                extracted = gemini_response
                extraction_tier = "gemini"
        except Exception as gemini_err:
            print(f"[trend_sync] Tier 2 Gemini failed: {gemini_err}. Invoking Tier 3 fallback...")

    # Tier 3: Zero-Failure Deterministic Fallback Floor
    if not extracted:
        print("[trend_sync] Tier 3: Building deterministic fallback signals from feed items...")
        extracted = _build_deterministic_trend_signals(all_items)
        extraction_tier = "deterministic"

    signals = extracted.get("trendSignals", []) if isinstance(extracted, dict) else []
    emerging_roles = extracted.get("emergingRoles", []) if isinstance(extracted, dict) else []

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

        cat_val = normalize_canonical_category(s.get("category"), skill_name=skill_name)
        cat_ms_val = CATEGORY_TRANSLATIONS[cat_val]["ms"]
        cat_zh_val = CATEGORY_TRANSLATIONS[cat_val]["zh"]

        signal_payloads.append({
            "id": str(uuid.uuid4()),
            "skillName": skill_name,
            "category": cat_val,
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
                    "category_ms": cat_ms_val,
                    "category_zh": cat_zh_val,
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
        vel_map = build_trend_signals_velocity_map(signal_payloads)

        # Prepare role metadata and batch embeddings concurrently
        role_items_to_embed = []
        for role in emerging_roles:
            r_id = role.get("roleId") or f"emerging-{uuid.uuid4().hex[:8]}"
            title = role.get("title", "Emerging Professional Role")
            title_ms = sanitize_title_ms(role.get("title_ms"), title)
            title_zh = role.get("title_zh") or title
            skills_en = role.get("essentialSkills", [])
            skills_ms = sanitize_skills_ms(role.get("essentialSkills_ms"), skills_en)
            skills_zh = role.get("essentialSkills_zh") or []
            if not skills_zh or len(skills_zh) < len(skills_en):
                skills_zh = [localize_skill_name(s, "zh") for s in skills_en]

            register_skill_translation(f"role:{title.lower()}", title_zh, title_ms, title)
            for s_idx, s_name in enumerate(skills_en):
                zh_s = skills_zh[s_idx] if s_idx < len(skills_zh) else s_name
                ms_s = skills_ms[s_idx] if s_idx < len(skills_ms) else s_name
                register_skill_translation(s_name, zh_s, ms_s)

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
            vel_metrics = compute_role_velocity_metrics(
                required_skills=item["skills_en"],
                industry=item["industry"],
                title=item["title"],
                trend_signals_map=vel_map,
                stored_base_velocity=0.45,
                scenario_multiplier=1.0,
            )
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
                "scenario_multipliers": {
                    "moderate": 1.0,
                    "accelerated_ai": 1.25,
                    "green_economy": 1.10,
                    "velocityVs": vel_metrics["roleVelocity"],
                    "trendStatus": vel_metrics["roleTrendStatus"],
                },
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

    # Recalibrate composite role velocity (V_role) across all ESCO roles in Supabase
    recalibration_summary = await recalibrate_all_esco_roles_velocity()

    return {
        "success": True,
        "message": f"Successfully synced {synced_count} live trend signals and {roles_synced_count} emerging occupational roles from ArXiv & RemoteOK feeds (Tier: {extraction_tier}).",
        "syncedCount": synced_count,
        "syncedRolesCount": roles_synced_count,
        "rolesVelocityRecalibration": recalibration_summary,
        "tierUsed": extraction_tier,
        "sourcesProcessed": ["ArXiv cs.AI (Latest Research)", "RemoteOK (Live Global Remote Jobs)"],
        "capturedAt": capture_time,
        "sampleSignals": [s.get("skillName") for s in signals[:5]],
        "sampleRoles": [r.get("title") for r in emerging_roles],
    }
