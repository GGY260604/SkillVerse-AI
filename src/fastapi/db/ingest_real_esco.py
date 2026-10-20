import asyncio
import uuid
from datetime import datetime, timezone
import httpx
from typing import List, Dict, Any
from ..config import settings
from ..services.embedding_service import generate_embedding

# Official European Commission ESCO API Endpoints
ESCO_SEARCH_API = "https://ec.europa.eu/esco/api/search"
ESCO_RESOURCE_API = "https://ec.europa.eu/esco/api/resource/occupation"

# Target search queries for high-growth, future-ready sectors in Malaysia
TARGET_SEARCH_QUERIES = [
    # 1. AI, Data & Software
    {"query": "data analyst", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 8.2", "sdg_title": "Technological upgrading & productivity"},
    {"query": "data scientist", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 9.4", "sdg_title": "Upgrading industrial technologies"},
    {"query": "machine learning engineer", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 8.2", "sdg_title": "Productivity through innovation"},
    {"query": "software developer", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 4.4", "sdg_title": "Technical and vocational skills"},
    {"query": "cloud architect", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 9.c", "sdg_title": "Universal access to information and communications technology"},
    {"query": "cyber security analyst", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 16.6", "sdg_title": "Develop effective, accountable and transparent institutions"},
    {"query": "database administrator", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 9.4", "sdg_title": "Modernizing technological infrastructure"},
    {"query": "user interface designer", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 9.c", "sdg_title": "Human-centric digital interfaces and accessibility"},

    # 2. ESG, Clean Energy & Environment
    {"query": "corporate social responsibility manager", "industry": "Clean Energy & ESG", "sdg": "SDG 12.6", "sdg_title": "Adopt sustainable practices & ESG reporting"},
    {"query": "environmental engineer", "industry": "Clean Energy & ESG", "sdg": "SDG 13.1", "sdg_title": "Climate resilience and adaptation"},
    {"query": "energy consultant", "industry": "Clean Energy & ESG", "sdg": "SDG 7.3", "sdg_title": "Double the global rate of energy efficiency"},
    {"query": "solar energy technician", "industry": "Clean Energy & ESG", "sdg": "SDG 7.2", "sdg_title": "Increase substantially the share of renewable energy"},
    {"query": "waste management consultant", "industry": "Clean Energy & ESG", "sdg": "SDG 12.5", "sdg_title": "Substantially reduce waste generation through recycling and reuse"},
    {"query": "water resource specialist", "industry": "Clean Energy & ESG", "sdg": "SDG 6.4", "sdg_title": "Substantially increase water-use efficiency"},

    # 3. Smart Logistics, Supply Chain & Automation
    {"query": "logistics analyst", "industry": "Smart Logistics & Automation", "sdg": "SDG 9.1", "sdg_title": "Resilient infrastructure and supply chains"},
    {"query": "supply chain manager", "industry": "Smart Logistics & Automation", "sdg": "SDG 8.2", "sdg_title": "Automation and process optimization"},
    {"query": "procurement specialist", "industry": "Smart Logistics & Automation", "sdg": "SDG 12.7", "sdg_title": "Promote public procurement practices that are sustainable"},
    {"query": "warehouse manager", "industry": "Smart Logistics & Automation", "sdg": "SDG 9.4", "sdg_title": "Automated warehouse logistics and handling"},

    # 4. Advanced Manufacturing & Robotics
    {"query": "robotics engineer", "industry": "Advanced Manufacturing & Robotics", "sdg": "SDG 9.5", "sdg_title": "Enhance scientific research and industrial innovation"},
    {"query": "industrial engineer", "industry": "Advanced Manufacturing & Robotics", "sdg": "SDG 9.4", "sdg_title": "Resource-efficient industrial processes"},
    {"query": "automation engineer", "industry": "Advanced Manufacturing & Robotics", "sdg": "SDG 8.2", "sdg_title": "Higher economic productivity through industrial automation"},
    {"query": "quality assurance engineer", "industry": "Advanced Manufacturing & Robotics", "sdg": "SDG 9.2", "sdg_title": "Promote inclusive and sustainable industrialization"},

    # 5. Precision Agritech & Bioeconomy
    {"query": "agronomist", "industry": "Precision Agriculture", "sdg": "SDG 2.4", "sdg_title": "Sustainable and resilient food production"},
    {"query": "agricultural engineer", "industry": "Precision Agriculture", "sdg": "SDG 9.4", "sdg_title": "Agritech modernization"},
    {"query": "food technologist", "industry": "Precision Agriculture", "sdg": "SDG 2.1", "sdg_title": "Universal access to safe and nutritious food"},

    # 6. Clean Healthcare & Digital Health
    {"query": "health informatics", "industry": "Clean Healthcare", "sdg": "SDG 3.8", "sdg_title": "Universal quality healthcare access"},
    {"query": "clinical data manager", "industry": "Clean Healthcare", "sdg": "SDG 3.8", "sdg_title": "Modern clinical healthcare operations"},
    {"query": "biomedical engineer", "industry": "Clean Healthcare", "sdg": "SDG 3.b", "sdg_title": "Medical devices and health tech research"},
    {"query": "bioinformatics", "industry": "Clean Healthcare", "sdg": "SDG 3.b", "sdg_title": "Genomic and biological data analysis"},
    {"query": "telehealth", "industry": "Clean Healthcare", "sdg": "SDG 3.8", "sdg_title": "Remote digital medical care"},

    # 7. FinTech & Corporate Governance
    {"query": "financial analyst", "industry": "FinTech & Governance", "sdg": "SDG 8.10", "sdg_title": "Strengthen financial and banking institutions"},
    {"query": "risk manager", "industry": "FinTech & Governance", "sdg": "SDG 8.2", "sdg_title": "Risk mitigation and financial stability"},
    {"query": "compliance officer", "industry": "FinTech & Governance", "sdg": "SDG 16.6", "sdg_title": "Accountable and transparent regulatory compliance"},
    {"query": "investment analyst", "industry": "FinTech & Governance", "sdg": "SDG 8.10", "sdg_title": "Sustainable capital allocation"},
    {"query": "fraud analyst", "industry": "FinTech & Governance", "sdg": "SDG 16.6", "sdg_title": "Financial crime and fraud prevention"},

    # 8. Modern Software, Cloud & AI Expansion
    {"query": "devops engineer", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 9.c", "sdg_title": "Universal digital infrastructure"},
    {"query": "full stack developer", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 8.2", "sdg_title": "Productivity through digital systems"},
    {"query": "natural language processing", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 9.5", "sdg_title": "Scientific research & AI innovation"},
    {"query": "computer vision", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 9.5", "sdg_title": "Autonomous visual inspection"},
    {"query": "mobile application developer", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 9.c", "sdg_title": "Mobile access to services"},
    {"query": "penetration tester", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 16.6", "sdg_title": "Cyber defense and resilience"},

    # 9. Green Transition & Circular Economy Expansion
    {"query": "carbon footprint analyst", "industry": "Clean Energy & ESG", "sdg": "SDG 13.1", "sdg_title": "Climate action & carbon reduction"},
    {"query": "circular economy", "industry": "Clean Energy & ESG", "sdg": "SDG 12.5", "sdg_title": "Waste reduction & circular economy"},
    {"query": "wind energy engineer", "industry": "Clean Energy & ESG", "sdg": "SDG 7.2", "sdg_title": "Renewable wind power"},
    {"query": "sustainable building consultant", "industry": "Clean Energy & ESG", "sdg": "SDG 11.c", "sdg_title": "Sustainable and resilient buildings"},

    # 10. Robotics & Autonomous Logistics Expansion
    {"query": "drone pilot", "industry": "Smart Logistics & Automation", "sdg": "SDG 9.1", "sdg_title": "Aerial logistics and surveying"},
    {"query": "mechatronics engineer", "industry": "Advanced Manufacturing & Robotics", "sdg": "SDG 9.5", "sdg_title": "Advanced electromechanical systems"},
    {"query": "digital content strategist", "industry": "Responsible AI & Digital Transformation", "sdg": "SDG 8.2", "sdg_title": "Digital marketing & content systems"},
]

# Title localization dictionary for official ESCO titles
TITLE_TRANSLATIONS = {
    "data analyst": {"ms": "Penganalisis Data", "zh": "数据分析师"},
    "data scientist": {"ms": "Saintis Data", "zh": "数据科学家"},
    "machine learning engineer": {"ms": "Jurutera Pembelajaran Mesin", "zh": "机器学习工程师"},
    "software developer": {"ms": "Pembangun Perisian", "zh": "软件开发工程师"},
    "cloud architect": {"ms": "Arkitek Awan", "zh": "云架构师"},
    "cyber security analyst": {"ms": "Penganalisis Keselamatan Siber", "zh": "网络安全分析师"},
    "database administrator": {"ms": "Pentadbir Pangkalan Data", "zh": "数据库管理员"},
    "user interface designer": {"ms": "Pereka Antara Muka Pengguna (UI/UX)", "zh": "用户界面(UI/UX)设计师"},
    "corporate social responsibility manager": {"ms": "Pengurus Kelestarian & Tanggungjawab Sosial (ESG)", "zh": "企业社会责任与可持续发展(ESG)经理"},
    "environmental engineer": {"ms": "Jurutera Alam Sekitar", "zh": "环境工程师"},
    "energy consultant": {"ms": "Perunding Tenaga Hijau", "zh": "绿色能源顾问"},
    "solar energy technician": {"ms": "Juruteknik Tenaga Suria", "zh": "太阳能技术员"},
    "waste management consultant": {"ms": "Perunding Pengurusan Sisa", "zh": "废物管理与循环经济顾问"},
    "water resource specialist": {"ms": "Pakar Sumber Air", "zh": "水资源专家"},
    "logistics analyst": {"ms": "Penganalisis Logistik Pintar", "zh": "智能物流分析师"},
    "supply chain manager": {"ms": "Pengurus Rangkaian Bekalan", "zh": "供应链经理"},
    "procurement specialist": {"ms": "Pakar Perolehan Strategik", "zh": "战略采购专员"},
    "warehouse manager": {"ms": "Pengurus Gudang Automasi", "zh": "智能仓储经理"},
    "robotics engineer": {"ms": "Jurutera Robotik", "zh": "机器人工程师"},
    "industrial engineer": {"ms": "Jurutera Industri", "zh": "工业工程师"},
    "automation engineer": {"ms": "Jurutera Automasi", "zh": "自动化工程师"},
    "quality assurance engineer": {"ms": "Jurutera Jaminan Kualiti (QA)", "zh": "质量保证(QA)工程师"},
    "agronomist": {"ms": "Pakar Agronomi Jitu", "zh": "精准农学专家"},
    "agricultural engineer": {"ms": "Jurutera Pertanian Pintar", "zh": "智慧农业工程师"},
    "food technologist": {"ms": "Pakar Teknologi Makanan", "zh": "食品科技专家"},
    "health informatics specialist": {"ms": "Pakar Informatik Kesihatan Digital", "zh": "数字医疗信息专家"},
    "clinical data manager": {"ms": "Pengurus Data Klinikal", "zh": "临床数据经理"},
    "biomedical engineer": {"ms": "Jurutera Bioperubatan", "zh": "生物医学工程师"},
    "financial analyst": {"ms": "Penganalisis Kewangan", "zh": "金融分析师"},
    "risk manager": {"ms": "Pengurus Risiko", "zh": "风险管理经理"},
    "compliance officer": {"ms": "Pegawai Pematuhan & Kawal Selia", "zh": "合规与监管专员"},
}


async def fetch_real_esco_occupation(client: httpx.AsyncClient, query_spec: Dict[str, str]) -> Dict[str, Any]:
    """
    Queries the official European Commission ESCO API to retrieve the canonical
    occupation URI, official title, and essential skills from the ESCO graph.
    """
    search_term = query_spec["query"]
    params = {
        "type": "occupation",
        "language": "en",
        "text": search_term,
        "limit": 1,
    }

    resp = await client.get(ESCO_SEARCH_API, params=params)
    if resp.status_code != 200:
        return None

    results = resp.json().get("_embedded", {}).get("results", [])
    if not results:
        return None

    top_result = results[0]
    uri = top_result["uri"]
    esco_title = top_result.get("title", search_term)

    # Fetch detailed occupation resource to extract official skills
    detail_resp = await client.get(ESCO_RESOURCE_API, params={"uri": uri, "language": "en"})
    skills = []
    if detail_resp.status_code == 200:
        links = detail_resp.json().get("_links", {})
        essential_skills = links.get("hasEssentialSkill", [])
        for s in essential_skills[:12]:  # Top essential skills
            if "title" in s:
                skills.append(s["title"].title())

    if not skills:
        skills = [f"{esco_title.title()} Operations", "Data Processing", "Communication", "Problem Solving"]

    # Slugify role_id
    role_id = f"esco-{esco_title.lower().replace(' ', '-').replace('/', '-')}"
    
    # Look up localization
    loc = TITLE_TRANSLATIONS.get(esco_title.lower(), {
        "ms": esco_title.title(),
        "zh": esco_title.title(),
    })

    return {
        "role_id": role_id,
        "title": esco_title.title(),
        "title_ms": loc.get("ms", esco_title.title()),
        "title_zh": loc.get("zh", esco_title.title()),
        "industry": query_spec["industry"],
        "required_skills": skills,
        "sdg_alignments": [
            {
                "targetCode": query_spec["sdg"],
                "targetTitle": query_spec["sdg_title"],
                "affinityScore": 0.92,
            }
        ],
        "scenario_multipliers": {
            "moderate": 1.0,
            "accelerated_ai": 1.20 if "AI" in query_spec["industry"] or "Logistics" in query_spec["industry"] else 1.0,
            "green_economy": 1.30 if "Clean" in query_spec["industry"] or "Agritech" in query_spec["industry"] else 1.0,
        },
        "radar_requirements": {
            "AI & Digital Tools": 85 if "AI" in query_spec["industry"] else 70,
            "Data Literacy & Analytics": 90 if "Data" in esco_title else 75,
            "Domain Operations": 85,
            "Human Communication": 80,
            "ESG & Sustainability": 90 if "Clean" in query_spec["industry"] or "Agritech" in query_spec["industry"] else 60,
        },
    }


async def ingest_official_esco_to_supabase():
    """
    Ingests real ESCO roles from the European Commission API,
    generates 1024-dim ML embeddings via bge-m3/Gemini,
    and stores them in Supabase esco_roles table via pgvector.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        print("[!] Missing SUPABASE credentials in .env file.")
        return

    base_url = settings.SUPABASE_URL.rstrip("/")
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8]

    endpoint = f"{base_url}/rest/v1/esco_roles?on_conflict=role_id"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    print("=================================================================", flush=True)
    print("[*] Official EU Commission ESCO Taxonomy Ingestion Started", flush=True)
    print(f"[*] Ingesting {len(TARGET_SEARCH_QUERIES)} future-ready roles across key sectors...", flush=True)
    print("=================================================================", flush=True)

    async with httpx.AsyncClient(timeout=30.0) as client:
        existing_role_ids = set()
        try:
            get_resp = await client.get(f"{base_url}/rest/v1/esco_roles?select=role_id", headers=headers)
            if get_resp.status_code == 200:
                existing_role_ids = {r["role_id"] for r in get_resp.json()}
                print(f"[*] Found {len(existing_role_ids)} existing roles in Supabase. Skipping duplicates.", flush=True)
        except Exception:
            pass

        for index, query_spec in enumerate(TARGET_SEARCH_QUERIES, 1):
            query = query_spec["query"]
            approx_slug = query.lower().replace(" ", "-")
            if any(approx_slug in rid or rid.replace("esco-", "") in approx_slug for rid in existing_role_ids):
                print(f"[{index}/{len(TARGET_SEARCH_QUERIES)}] Query '{query}' already covered in Supabase. Skipping.", flush=True)
                continue

            print(f"\n[{index}/{len(TARGET_SEARCH_QUERIES)}] Fetching canonical ESCO role: '{query}'...", flush=True)
            try:
                role_data = await fetch_real_esco_occupation(client, query_spec)
            except Exception as e:
                print(f"    [!] Error fetching ESCO resource for '{query}': {e}. Skipping.", flush=True)
                continue

            if not role_data:
                print(f"    [!] Could not fetch ESCO resource for '{query}'. Skipping.", flush=True)
                continue

            if role_data["role_id"] in existing_role_ids:
                print(f"    [=] '{role_data['role_id']}' already exists in Supabase. Skipping.", flush=True)
                continue

            title = role_data["title"]
            skills_preview = ", ".join(role_data["required_skills"][:5])
            print(f"    [OK] Retrieved: {title} ({len(role_data['required_skills'])} essential skills)", flush=True)
            print(f"    [i] Skills: {skills_preview}...", flush=True)

            # Generate ML Embedding Vector (1024-dim)
            embedding_text = (
                f"Occupational Title: {title}. "
                f"Sector: {role_data['industry']}. "
                f"Essential Competencies: {', '.join(role_data['required_skills'])}."
            )
            print(f"    [..] Generating 1024-dim ML embedding vector...", flush=True)
            vector = await generate_embedding(embedding_text)
            role_data["embedding"] = vector
            role_data["updated_at"] = datetime.now(timezone.utc).isoformat()

            # Upsert into Supabase pgvector table
            resp = await client.post(endpoint, json=role_data, headers=headers)
            if resp.status_code in [200, 201, 204]:
                print(f"    [OK] Successfully stored '{role_data['role_id']}' in Supabase pgvector!", flush=True)
            else:
                clean_err = resp.text.encode('ascii', errors='replace').decode('ascii')
                print(f"    [!] Supabase upload error: HTTP {resp.status_code} - {clean_err}", flush=True)

    print("\n=================================================================", flush=True)
    print("[OK] Official ESCO ingestion to Supabase pgvector completed successfully!", flush=True)
    print("=================================================================", flush=True)


if __name__ == "__main__":
    asyncio.run(ingest_official_esco_to_supabase())
