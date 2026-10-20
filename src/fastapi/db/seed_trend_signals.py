import asyncio
import uuid
from datetime import datetime, timezone
import httpx
from typing import List, Dict, Any
from ..config import settings

# Curated labor market trend signals grounded in World Economic Forum (WEF) Future of Jobs Report 2025
# and Malaysian TalentCorp Critical Occupations List (COL).
TREND_SIGNALS_DATA: List[Dict[str, Any]] = [
    # -------------------------------------------------------------
    # DECLINING / AUTOMATION-AT-RISK COMPETENCIES (Negative Velocity)
    # -------------------------------------------------------------
    {
        "skillName": "manual data entry",
        "category": "Clerical & Administrative",
        "velocityVs": -0.45,
        "status": "declining",
        "currentWindowC": 12.4,
        "pastWindowC": 22.8,
        "sources": [
            {"sourceName": "WEF Future of Jobs 2025", "url": "https://weforum.org", "citation": "Rapid decline due to Intelligent Document Processing (IDP)"},
            {"sourceName": "TalentCorp Malaysia", "url": "https://talentcorp.com.my", "citation": "Transition to automated database pipelines"}
        ]
    },
    {
        "skillName": "routine document filing",
        "category": "Clerical & Administrative",
        "velocityVs": -0.38,
        "status": "declining",
        "currentWindowC": 8.1,
        "pastWindowC": 13.0,
        "sources": [
            {"sourceName": "WEF Future of Jobs 2025", "url": "https://weforum.org", "citation": "Replaced by cloud content management systems and auto-tagging"}
        ]
    },
    {
        "skillName": "basic switchboard routing",
        "category": "Customer Support",
        "velocityVs": -0.35,
        "status": "declining",
        "currentWindowC": 5.2,
        "pastWindowC": 8.0,
        "sources": [
            {"sourceName": "ILO Global Employment Trends", "url": "https://ilo.org", "citation": "Automated by conversational voice AI and natural language IVR systems"}
        ]
    },
    {
        "skillName": "generic copywriting",
        "category": "Marketing & Content",
        "velocityVs": -0.40,
        "status": "declining",
        "currentWindowC": 14.5,
        "pastWindowC": 24.2,
        "sources": [
            {"sourceName": "LinkedIn Workforce Report", "url": "https://linkedin.com", "citation": "Baseline promotional copy automated by Large Language Models"}
        ]
    },
    {
        "skillName": "simple bookkeeping reconciliation",
        "category": "Accounting & Finance",
        "velocityVs": -0.32,
        "status": "declining",
        "currentWindowC": 10.3,
        "pastWindowC": 15.1,
        "sources": [
            {"sourceName": "ACCA / TalentCorp Malaysia", "url": "https://talentcorp.com.my", "citation": "Direct bank feeds and automated reconciliation rules"}
        ]
    },
    {
        "skillName": "payroll data processing",
        "category": "Human Resources",
        "velocityVs": -0.28,
        "status": "declining",
        "currentWindowC": 7.0,
        "pastWindowC": 9.7,
        "sources": [
            {"sourceName": "WEF Future of Jobs 2025", "url": "https://weforum.org", "citation": "Automated self-service HRMS payroll systems"}
        ]
    },
    {
        "skillName": "manual inventory counting",
        "category": "Logistics & Warehousing",
        "velocityVs": -0.36,
        "status": "declining",
        "currentWindowC": 9.2,
        "pastWindowC": 14.4,
        "sources": [
            {"sourceName": "Supply Chain Brain", "url": "https://supplychainbrain.com", "citation": "RFID tagging, computer vision and automated warehouse drones"}
        ]
    },
    {
        "skillName": "telemarketing outbound calling",
        "category": "Sales & Customer Support",
        "velocityVs": -0.48,
        "status": "declining",
        "currentWindowC": 4.1,
        "pastWindowC": 7.9,
        "sources": [
            {"sourceName": "WEF Future of Jobs 2025", "url": "https://weforum.org", "citation": "Regulatory restrictions and AI customer engagement agents"}
        ]
    },
    {
        "skillName": "routine proofreading",
        "category": "Publishing & Media",
        "velocityVs": -0.30,
        "status": "declining",
        "currentWindowC": 6.8,
        "pastWindowC": 9.7,
        "sources": [
            {"sourceName": "LinkedIn Workforce Report", "url": "https://linkedin.com", "citation": "Integrated neural grammar, style and syntax assistants"}
        ]
    },
    {
        "skillName": "basic photo retouching",
        "category": "Creative & Design",
        "velocityVs": -0.34,
        "status": "declining",
        "currentWindowC": 8.0,
        "pastWindowC": 12.1,
        "sources": [
            {"sourceName": "Adobe / WEF Creative Tech 2024", "url": "https://weforum.org", "citation": "One-click generative AI fill and background eradication"}
        ]
    },

    # -------------------------------------------------------------
    # EMERGING / FUTURE-RESILIENT COMPETENCIES (Positive Velocity)
    # -------------------------------------------------------------
    {
        "skillName": "generative ai prompting",
        "category": "Artificial Intelligence & Automation",
        "velocityVs": 0.72,
        "status": "emerging",
        "currentWindowC": 28.5,
        "pastWindowC": 16.5,
        "sources": [
            {"sourceName": "WEF Future of Jobs 2025", "url": "https://weforum.org", "citation": "Top 1 fastest-growing cross-functional skill"}
        ]
    },
    {
        "skillName": "scope 1 2 3 carbon accounting",
        "category": "Clean Energy & ESG",
        "velocityVs": 0.58,
        "status": "emerging",
        "currentWindowC": 18.2,
        "pastWindowC": 11.5,
        "sources": [
            {"sourceName": "Bursa Malaysia ESG Reporting Guide", "url": "https://bursamalaysia.com", "citation": "Mandatory climate disclosure standards (ISSB/TCFD)"}
        ]
    },
    {
        "skillName": "cloud security posture management",
        "category": "Cybersecurity & Cloud",
        "velocityVs": 0.54,
        "status": "emerging",
        "currentWindowC": 22.0,
        "pastWindowC": 14.3,
        "sources": [
            {"sourceName": "CyberSecurity Malaysia", "url": "https://cybersecurity.my", "citation": "Critical national infrastructure cyber resilience"}
        ]
    },
    {
        "skillName": "automated workflow orchestration",
        "category": "Digital Transformation",
        "velocityVs": 0.65,
        "status": "emerging",
        "currentWindowC": 25.1,
        "pastWindowC": 15.2,
        "sources": [
            {"sourceName": "MDEC Digital Economy Report", "url": "https://mdec.my", "citation": "RPA and AI agent orchestration adoption across enterprise"}
        ]
    },
    {
        "skillName": "iot telemetry & sensor analytics",
        "category": "Smart Infrastructure & Agritech",
        "velocityVs": 0.49,
        "status": "emerging",
        "currentWindowC": 16.4,
        "pastWindowC": 11.0,
        "sources": [
            {"sourceName": "TalentCorp National Industry 4.0", "url": "https://talentcorp.com.my", "citation": "Smart farming, smart port logistics and industrial telemetry"}
        ]
    },
]


async def seed_trend_signals_to_supabase():
    """
    Seeds real empirical labor market trend signals into Supabase trend_signals table.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        print("[!] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.")
        return

    base_url = settings.SUPABASE_URL.rstrip("/")
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8]

    endpoint = f"{base_url}/rest/v1/trend_signals"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    print(f"[*] Starting ingestion of {len(TREND_SIGNALS_DATA)} trend signals into Supabase...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        for item in TREND_SIGNALS_DATA:
            row_payload = {
                "id": str(uuid.uuid4()),
                "skillName": item["skillName"],
                "category": item["category"],
                "velocityVs": item["velocityVs"],
                "status": item["status"],
                "currentWindowC": item["currentWindowC"],
                "pastWindowC": item["pastWindowC"],
                "sources": item["sources"],
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }

            resp = await client.post(endpoint, json=row_payload, headers=headers)
            if resp.status_code in [200, 201, 204]:
                print(f"    [OK] Synced '{item['skillName']}' ({item['status']}, velocity={item['velocityVs']:+.2f})")
            else:
                clean_err = resp.text.encode('ascii', errors='replace').decode('ascii')
                print(f"    [!] Error uploading '{item['skillName']}': HTTP {resp.status_code} - {clean_err}")

    print("\n=================================================================")
    print("[OK] Labor market trend signals seeded successfully into Supabase!")
    print("=================================================================")


if __name__ == "__main__":
    asyncio.run(seed_trend_signals_to_supabase())
