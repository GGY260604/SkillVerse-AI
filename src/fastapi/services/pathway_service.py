import json
from typing import List, Dict, Any
from schemas.analysis import (
    SelectedRoleRoadmap,
    RoadmapMilestone,
    RecommendedCourse,
    MatchedRole,
    AnalyzeProfileData,
)
from .gemini_service import call_gemini_with_fallback


PATHWAY_PROMPT_TEMPLATE = """
You are an expert L&D (Learning & Development) Curriculum Architect for SkillVerse AI.
You are designing a personalized, 3-Phase Reskilling Pathway for an individual transitioning into a future-ready role in Malaysia.

CANDIDATE CONTEXT:
- Target Role: {target_role_title} ({target_industry})
- Skills to Acquire (Gap): {skills_gap}
- Matched Strengths (Already Mastered): {matched_strengths}
- Weekly Availability: {weekly_hours} hours per week
- Target Output Language: {locale} (en = English, ms = Bahasa Melayu, zh = 中文)

REQUIREMENTS:
1. Synthesize exactly 3 progressive phases:
   - Phase 1: Foundation Core (bridging fundamental concepts)
   - Phase 2: Applied Tools & Workflows (hands-on technical platforms)
   - Phase 3: Capstone & Industry Readiness (demonstrable project & compliance)
2. Every phase MUST recommend 1-2 realistic, verified courses:
   - Emphasize Free / Audit platforms: Coursera (audit), edX, freeCodeCamp, DeepLearning.AI
   - Emphasize Malaysian HRD Corp-claimable vocational/professional training
3. LANGUAGE COMPLIANCE (MANDATORY):
   - If Target Output Language is 'zh', generate ALL text fields ("phaseTitle", "learningObjectives", "recommendedCourses.title") strictly in natural Simplified Chinese (简体中文).
   - If Target Output Language is 'ms', generate ALL text fields ("phaseTitle", "learningObjectives", "recommendedCourses.title") strictly in natural Bahasa Melayu.
   - If Target Output Language is 'en', generate ALL text fields in clear, professional English.
4. Output MUST be ONLY valid JSON matching this schema:
{{
  "totalWeeks": number,
  "milestones": [
    {{
      "phaseIndex": 1,
      "phaseTitle": "Phase 1: Foundation Core (in target locale)",
      "durationWeeks": 3,
      "estimatedHours": 15,
      "learningObjectives": ["objective 1 in target locale", "objective 2 in target locale"],
      "recommendedCourses": [
        {{
          "title": "Course Title in target locale",
          "platform": "Coursera" | "edX" | "freeCodeCamp" | "HRD Corp",
          "url": "https://www.coursera.org",
          "isHrdCorpClaimable": boolean,
          "isFree": boolean,
          "durationHours": 12
        }}
      ]
    }}
  ]
}}
"""


def get_default_roadmap(target_role: MatchedRole, locale: str) -> SelectedRoleRoadmap:
    """Fallback deterministic roadmap if LLM call is unavailable."""
    is_zh = locale == "zh"
    is_ms = locale == "ms"

    first_gap = target_role.skillsGap[0] if target_role.skillsGap else "Industry Tools"
    second_gap = target_role.skillsGap[1] if len(target_role.skillsGap) > 1 else "Workflow Automation"

    if is_zh:
        p1_title = "第一阶段：核心基础 (Foundation Core)"
        p2_title = "第二阶段：应用工具与实操 (Applied Tools)"
        p3_title = "第三阶段：综合实战项目与认证 (Capstone)"
        obj1 = [
            f"掌握 {first_gap} 的核心理论基础与知识架构。",
            "分析行业最佳实践与国际合规标准。",
        ]
        obj2 = [
            f"深入实操 {second_gap} 及现代数字化平台。",
            "构建自动化工作流程与业务分析看板。",
        ]
        obj3 = [
            "交付端到端行业实战毕业设计项目。",
            "验证联合国可持续发展目标（SDG）指标与职场技能标准。",
        ]
        c1_title = f"{first_gap} 核心理论与数字化标准"
        c2_title = "马来西亚数字技能与职场基础认证"
        c3_title = f"{second_gap} 进阶实操强化营"
        c4_title = "应用工业数据分析与自动化系统"
        c5_title = f"{target_role.titleLocalized or target_role.title} 综合实战作品集项目"
    elif is_ms:
        p1_title = "Fasa 1: Teras Asas (Foundation Core)"
        p2_title = "Fasa 2: Alat & Aliran Kerja Praktikal"
        p3_title = "Fasa 3: Projek Capstone & Persijilan"
        obj1 = [
            f"Kuasai asas teori dan rangka kerja teras {first_gap}.",
            "Analisis amalan terbaik industri dan piawaian pematuhan.",
        ]
        obj2 = [
            f"Latihan amali menggunakan {second_gap} dan platform moden.",
            "Bina saluran kerja automatik dan papan pemuka analitik.",
        ]
        obj3 = [
            "Sempurnakan projek capstone industri yang komprehensif.",
            "Sahkan penjajaran dengan metrik UN SDG dan standard tempat kerja.",
        ]
        c1_title = f"Pengenalan kepada {first_gap} & Standard Digital"
        c2_title = "Asas Tenaga Kerja Digital Malaysia"
        c3_title = f"Kem Latihan Praktikal {second_gap}"
        c4_title = "Analitik & Sistem Perindustrian Gunaan"
        c5_title = f"Projek Portfolio Capstone {target_role.titleLocalized or target_role.title}"
    else:
        p1_title = "Phase 1: Foundation Core"
        p2_title = "Phase 2: Applied Tools & Workflows"
        p3_title = "Phase 3: Capstone & Industry Readiness"
        obj1 = [
            f"Master the core theoretical fundamentals of {first_gap}.",
            "Analyze industry best practices and compliance standards.",
        ]
        obj2 = [
            f"Hands-on execution with {second_gap} and modern platforms.",
            "Build automated pipelines and reporting dashboards.",
        ]
        obj3 = [
            "Deliver an end-to-end industry portfolio project.",
            "Verify alignment with UN SDG metrics and workplace standards.",
        ]
        c1_title = f"Introduction to {first_gap} & Digital Standards"
        c2_title = "Malaysian Digital Workforce Essentials"
        c3_title = f"Hands-on {second_gap} Bootcamp"
        c4_title = "Applied Industrial Analytics & Systems"
        c5_title = f"{target_role.title} Portfolio Project Capstone"

    return SelectedRoleRoadmap(
        targetRoleId=target_role.roleId,
        totalWeeks=10,
        milestones=[
            RoadmapMilestone(
                phaseIndex=1,
                phaseTitle=p1_title,
                durationWeeks=3,
                estimatedHours=15,
                learningObjectives=obj1,
                recommendedCourses=[
                    RecommendedCourse(
                        title=c1_title,
                        platform="Coursera (Free Audit)",
                        url="https://www.coursera.org",
                        isHrdCorpClaimable=False,
                        isFree=True,
                        durationHours=12,
                    ),
                    RecommendedCourse(
                        title=c2_title,
                        platform="HRD Corp Claimable",
                        url="https://hrdcorp.gov.my",
                        isHrdCorpClaimable=True,
                        isFree=False,
                        durationHours=16,
                    ),
                ],
            ),
            RoadmapMilestone(
                phaseIndex=2,
                phaseTitle=p2_title,
                durationWeeks=4,
                estimatedHours=20,
                learningObjectives=obj2,
                recommendedCourses=[
                    RecommendedCourse(
                        title=c3_title,
                        platform="edX (Free Audit)",
                        url="https://www.edx.org",
                        isHrdCorpClaimable=False,
                        isFree=True,
                        durationHours=18,
                    ),
                    RecommendedCourse(
                        title=c4_title,
                        platform="HRD Corp Claimable",
                        url="https://hrdcorp.gov.my",
                        isHrdCorpClaimable=True,
                        isFree=False,
                        durationHours=24,
                    ),
                ],
            ),
            RoadmapMilestone(
                phaseIndex=3,
                phaseTitle=p3_title,
                durationWeeks=3,
                estimatedHours=15,
                learningObjectives=obj3,
                recommendedCourses=[
                    RecommendedCourse(
                        title=c5_title,
                        platform="freeCodeCamp / GitHub Open Project",
                        url="https://www.freecodecamp.org",
                        isHrdCorpClaimable=False,
                        isFree=True,
                        durationHours=20,
                    )
                ],
            ),
        ],
    )


async def synthesize_pathway(
    target_role: MatchedRole,
    profile: AnalyzeProfileData,
    locale: str,
) -> SelectedRoleRoadmap:
    """
    Synthesizes a tailored 3-phase reskilling roadmap using Gemini 1.5 Flash,
    grounding recommendations in free courses and Malaysian HRD Corp programs.
    """
    prompt = PATHWAY_PROMPT_TEMPLATE.format(
        target_role_title=target_role.title,
        target_industry=target_role.industry,
        skills_gap=", ".join(target_role.skillsGap[:5]) or "General Upgrading",
        matched_strengths=", ".join(target_role.matchedStrengths[:4]) or "Foundational experience",
        weekly_hours=profile.weeklyCommitmentHours or "3-5",
        locale=locale,
    )

    contents = [{"parts": [{"text": prompt}]}]

    try:
        json_data = await call_gemini_with_fallback(contents)
        total_weeks = int(json_data.get("totalWeeks", 10))
        raw_milestones = json_data.get("milestones", [])

        milestones: List[RoadmapMilestone] = []
        for idx, m in enumerate(raw_milestones, 1):
            courses: List[RecommendedCourse] = []
            for c in m.get("recommendedCourses", []):
                courses.append(
                    RecommendedCourse(
                        title=c.get("title", "Industrial Competency Module"),
                        platform=c.get("platform", "Coursera"),
                        url=c.get("url", "https://www.coursera.org"),
                        isHrdCorpClaimable=bool(c.get("isHrdCorpClaimable", False)),
                        isFree=bool(c.get("isFree", True)),
                        durationHours=c.get("durationHours"),
                    )
                )

            milestones.append(
                RoadmapMilestone(
                    phaseIndex=int(m.get("phaseIndex", idx)),
                    phaseTitle=m.get("phaseTitle", f"Phase {idx}"),
                    durationWeeks=int(m.get("durationWeeks", 3)),
                    estimatedHours=int(m.get("estimatedHours", 15)),
                    learningObjectives=m.get("learningObjectives", []),
                    recommendedCourses=courses,
                )
            )

        if milestones:
            return SelectedRoleRoadmap(
                targetRoleId=target_role.roleId,
                totalWeeks=total_weeks,
                milestones=milestones,
            )

    except Exception:
        # Graceful fallback to guarantee zero crash in demo
        pass

    return get_default_roadmap(target_role, locale)
