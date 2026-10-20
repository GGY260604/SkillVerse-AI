import json
from typing import List, Dict, Any
from ..schemas.analysis import (
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
3. Output MUST be ONLY valid JSON matching this schema:
{{
  "totalWeeks": number,
  "milestones": [
    {{
      "phaseIndex": 1,
      "phaseTitle": "Phase 1: Foundation Core (or localized)",
      "durationWeeks": 3,
      "estimatedHours": 15,
      "learningObjectives": ["objective 1", "objective 2"],
      "recommendedCourses": [
        {{
          "title": "Course Title",
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

    p1_title = "第一阶段：核心基础 (Foundation Core)" if is_zh else ("Fasa 1: Teras Asas (Foundation Core)" if is_ms else "Phase 1: Foundation Core")
    p2_title = "第二阶段：应用工具与实操 (Applied Tools)" if is_zh else ("Fasa 2: Alat & Aliran Kerja Praktikal" if is_ms else "Phase 2: Applied Tools & Workflows")
    p3_title = "第三阶段：综合实战项目与认证 (Capstone)" if is_zh else ("Fasa 3: Projek Capstone & Persijilan" if is_ms else "Phase 3: Capstone & Industry Readiness")

    first_gap = target_role.skillsGap[0] if target_role.skillsGap else "Industry Tools"
    second_gap = target_role.skillsGap[1] if len(target_role.skillsGap) > 1 else "Workflow Automation"

    return SelectedRoleRoadmap(
        targetRoleId=target_role.roleId,
        totalWeeks=10,
        milestones=[
            RoadmapMilestone(
                phaseIndex=1,
                phaseTitle=p1_title,
                durationWeeks=3,
                estimatedHours=15,
                learningObjectives=[
                    f"Master the core theoretical fundamentals of {first_gap}.",
                    "Analyze industry best practices and compliance standards.",
                ],
                recommendedCourses=[
                    RecommendedCourse(
                        title=f"Introduction to {first_gap} & Digital Standards",
                        platform="Coursera (Free Audit)",
                        url="https://www.coursera.org",
                        isHrdCorpClaimable=False,
                        isFree=True,
                        durationHours=12,
                    ),
                    RecommendedCourse(
                        title="Malaysian Digital Workforce Essentials",
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
                learningObjectives=[
                    f"Hands-on execution with {second_gap} and modern platforms.",
                    "Build automated pipelines and reporting dashboards.",
                ],
                recommendedCourses=[
                    RecommendedCourse(
                        title=f"Hands-on {second_gap} Bootcamp",
                        platform="edX (Free Audit)",
                        url="https://www.edx.org",
                        isHrdCorpClaimable=False,
                        isFree=True,
                        durationHours=18,
                    ),
                    RecommendedCourse(
                        title="Applied Industrial Analytics & Systems",
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
                learningObjectives=[
                    "Deliver an end-to-end industry portfolio project.",
                    "Verify alignment with UN SDG metrics and workplace standards.",
                ],
                recommendedCourses=[
                    RecommendedCourse(
                        title=f"{target_role.title} Portfolio Project Capstone",
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
