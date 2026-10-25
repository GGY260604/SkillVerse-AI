import json
import time
import logging
from typing import List, Dict, Any, Tuple
from schemas.analysis import (
    SelectedRoleRoadmap,
    RoadmapMilestone,
    RecommendedCourse,
    MatchedRole,
    AnalyzeProfileData,
)
from services.gemini_service import call_gemini_with_fallback

logger = logging.getLogger("pathway_service")

# In-memory TTL cache for synthesized reskilling roadmaps (30 minutes TTL)
_pathway_cache: Dict[str, Tuple[SelectedRoleRoadmap, float]] = {}
PATHWAY_CACHE_TTL = 1800.0


PATHWAY_PROMPT_TEMPLATE = """
You are an expert L&D (Learning & Development) Curriculum Architect for SkillVerse AI.
You are designing a personalized, progressive Reskilling Pathway for an individual transitioning into a future-ready role in Malaysia.

CANDIDATE CONTEXT:
- Target Role: {target_role_title} ({target_industry})
- Target Role SDGs: {target_sdgs}
- Skills to Acquire (Gap): {skills_gap}
- Matched Strengths (ALREADY MASTERED - DO NOT TEACH): {matched_strengths}
- Weekly Availability: {weekly_hours} hours per week

CRITICAL CURRICULUM CONSTRAINTS:
1. STRICT EXCLUSION OF MASTERED SKILLS:
   - The candidate ALREADY possesses strong proficiency in "{matched_strengths}".
   - DO NOT include, teach, review, or recommend courses for ANY skill listed under "Matched Strengths (ALREADY MASTERED)".
   - Reskilling roadmaps must respect candidate seniority: NEVER waste their time reviewing concepts they have already mastered!
2. PHASE 1 MUST TARGET THE PRIMARY SKILLS GAP:
   - Phase 1 MUST immediately begin bridging the candidate's highest-priority missing competencies from "{skills_gap}".
   - Phase 1 is NOT a generic beginner/101 digital literacy primer. It is "Phase 1: Gap Foundations & Architecture", focusing directly on the foundational theoretical principles of their missing gap skills.
   - Phase 2 focuses on hands-on tools, modern frameworks, and production automation for the remaining gap skills.
   - Phase 3 is the Capstone & Industry Readiness project integrating these newly acquired competencies.
3. ZERO GAP HANDLING:
   - If the candidate already possesses all baseline skills (gap is null or 0), you MUST synthesize 3 progressive, future-ready frontier competencies/leadership skills into "skillsToAcquire" and "skillsToAcquireLocalized" (trilingual en, ms, zh) and design all 3 milestones around these advanced topics so every single phase teaches genuinely new, future-ready capabilities.

MANDATORY REQUIREMENTS:
1. TRILINGUAL SUPPORT (CRITICAL):
   Every milestone and course MUST include content in ALL THREE LANGUAGES:
   - "en": Professional English
   - "ms": Natural Bahasa Melayu
   - "zh": Simplified Chinese (简体中文)
2. STRUCTURED PHASES:
   - 3 progressive phases:
     * Phase 1: Gap Foundations & Core Architecture (theoretical basis of gap skills)
     * Phase 2: Applied Toolchains & Production Workflows (hands-on stack & automation)
     * Phase 3: Capstone Integration & Industry Readiness (end-to-end portfolio & certification)
   - Assign sequential phaseIndex starting from 1 (1, 2, 3).
3. RECOMMENDED COURSES:
   - Recommend 1-2 realistic courses per phase (e.g. Coursera, edX, freeCodeCamp, DeepLearning.AI, HRD Corp Malaysia).
   - Courses MUST teach the candidate's gap skills, NOT their already mastered strengths.
   - Mark whether isHrdCorpClaimable (boolean) and isFree (boolean).
4. UN SDG GOAL RELATION EXPLANATION (CRITICAL):
   For EACH phase/milestone, identify the primary UN Sustainable Development Goal it aligns with (e.g. "SDG 4.4", "SDG 8.2", "SDG 9.4", "SDG 12.2") and provide a motivating, clear trilingual explanation in "sdgExplanationLocalized" with keys "en", "ms", and "zh":
   - Explicitly connect the specific skills acquired in this milestone to that SDG target.
   - Explain how this phase shields the candidate from routine automation risk and elevates them to higher-productivity, sustainable economic work.
   - Include "sdgGoal" (e.g. "SDG 4.4 & 8.2"), "sdgTitle", and "sdgExplanation" (canonical English summary).
5. Output MUST be ONLY valid JSON matching this schema:
{{
  "totalWeeks": 10,
  "skillsToAcquire": ["Advanced Generative AI Workflows", "Production Scalability Architecture", "Cross-Functional Digital Leadership"],
  "skillsToAcquireLocalized": {{
    "en": ["Advanced Generative AI Workflows", "Production Scalability Architecture", "Cross-Functional Digital Leadership"],
    "ms": ["Aliran Kerja AI Generatif Lanjutan", "Seni Bina Kebolehskalaan Pengeluaran", "Kepimpinan Digital Rentas Fungsi"],
    "zh": ["高级生成式 AI 生产流", "生产级高可用架构设计", "跨职能数字技术领导力"]
  }},
  "milestones": [
    {{
      "phaseIndex": 1,
      "phaseTitle": "Phase 1: Gap Foundations & Architecture",
      "titleLocalized": {{
        "en": "Phase 1: Gap Foundations & Architecture",
        "ms": "Fasa 1: Asas Jurang & Seni Bina",
        "zh": "第一阶段：技能差距核心架构与理论底座"
      }},
      "description": "Master the core theoretical fundamentals of your targeted gap competencies.",
      "descriptionLocalized": {{
        "en": "Master the core theoretical fundamentals of your targeted gap competencies.",
        "ms": "Kuasai asas teori teras kemahiran jurang yang disasarkan.",
        "zh": "系统掌握目标差距技能的核心理论基础与前沿标准。"
      }},
      "durationWeeks": 3,
      "estimatedHours": 15,
      "learningObjectives": [
        "Master the foundational theory and systems architecture of target gap skills",
        "Analyze enterprise standards, performance benchmarks, and regulatory compliance"
      ],
      "objectivesLocalized": {{
        "en": [
          "Master the foundational theory and systems architecture of target gap skills",
          "Analyze enterprise standards, performance benchmarks, and regulatory compliance"
        ],
        "ms": [
          "Kuasai teori asas dan seni bina sistem kemahiran jurang sasaran",
          "Analisis standard perusahaan, tanda aras prestasi, dan pematuhan peraturan"
        ],
        "zh": [
          "系统掌握目标差距技能的底层理论架构与高可用设计原则",
          "分析行业企业级技术规范、性能基准及行业合规标准"
        ]
      }},
      "recommendedCourses": [
        {{
          "title": "Core Architecture for Emerging Tech Specializations",
          "titleLocalized": {{
            "en": "Core Architecture for Emerging Tech Specializations",
            "ms": "Seni Bina Teras bagi Pengkhususan Teknologi Muncul",
            "zh": "前沿技术核心架构与系统级专项实训"
          }},
          "platform": "Coursera",
          "url": "https://www.coursera.org",
          "isHrdCorpClaimable": false,
          "isFree": true,
          "durationHours": 12
        }}
      ],
      "sdgGoal": "SDG 4.4 & 8.2",
      "sdgTitle": "Technical & Vocational Skills for Decent Work",
      "sdgExplanation": "Mastering high-value gap competencies directly advances UN SDG 4.4 and SDG 8.2 by converting vulnerable manual routines into resilient technical mastery.",
      "sdgExplanationLocalized": {{
        "en": "Mastering high-value gap competencies directly advances UN SDG 4.4 and SDG 8.2 by converting vulnerable manual routines into resilient technical mastery, shielding you from routine automation.",
        "ms": "Menguasai kemahiran jurang bernilai tinggi memacu UN SDG 4.4 dan SDG 8.2 secara langsung dengan menukar tugas rutin berisiko kepada penguasaan teknikal berdaya tahan.",
        "zh": "深入掌握高价值技术差距核心底座，直接契合联合国 SDG 4.4 与 SDG 8.2，将常规经验重塑为抗自动化替代的高附加值技术掌控力。"
      }}
    }}
  ]
}}
"""


def get_default_roadmap(target_role: MatchedRole, locale: str = "en") -> SelectedRoleRoadmap:
    """Fallback deterministic trilingual roadmap if LLM call is unavailable."""
    if target_role.skillsGap:
        first_gap = target_role.skillsGap[0]
        second_gap = target_role.skillsGap[1] if len(target_role.skillsGap) > 1 else "Workflow Automation"
        fallback_skills = list(target_role.skillsGap)
        fallback_skills_loc = dict(target_role.skillsGapLocalized) if target_role.skillsGapLocalized else None
    else:
        first_gap = f"Advanced {target_role.title} Architecture"
        second_gap = f"Automated {target_role.industry} Systems"
        fallback_skills = [first_gap, second_gap, "Sustainable Digital Leadership"]
        fallback_skills_loc = {
            "en": fallback_skills,
            "ms": [f"Seni Bina {target_role.title} Lanjutan", f"Sistem Automasi {target_role.industry}", "Kepimpinan Digital Mampan"],
            "zh": [f"高级 {target_role.title} 架构设计", f"{target_role.industry} 自动化流水线系统", "可持续数字技术领导力"],
        }

    role_name_en = target_role.title
    role_name_localized = target_role.titleLocalized or target_role.title
    primary_role_sdg = (
        target_role.sdgAlignments[0].targetCode
        if target_role.sdgAlignments
        else "SDG 8.2"
    )

    m1_title_loc = {
        "en": f"Phase 1: {first_gap} Foundations",
        "ms": f"Fasa 1: Asas {first_gap}",
        "zh": f"第一阶段：{first_gap} 核心理论基础",
    }
    m1_desc_loc = {
        "en": f"Master the core theoretical fundamentals of {first_gap} and industry compliance standards.",
        "ms": f"Kuasai asas teori teras {first_gap} dan piawaian pematuhan industri.",
        "zh": f"掌握 {first_gap} 的核心理论基础与行业合规标准。",
    }
    m1_obj_loc = {
        "en": [
            f"Master the core theoretical fundamentals of {first_gap}.",
            "Analyze Malaysian and international industry best practices.",
        ],
        "ms": [
            f"Kuasai asas teori dan rangka kerja teras {first_gap}.",
            "Analisis amalan terbaik industri Malaysia dan antarabangsa.",
        ],
        "zh": [
            f"掌握 {first_gap} 的核心理论基础与知识架构。",
            "分析马来西亚及国际行业最佳实践与规范。",
        ],
    }

    m2_title_loc = {
        "en": "Phase 2: Applied Tools & Workflows",
        "ms": "Fasa 2: Alat & Aliran Kerja Praktikal",
        "zh": "第二阶段：应用工具与实操",
    }
    m2_desc_loc = {
        "en": f"Hands-on execution with {second_gap} and modern production-grade workflows.",
        "ms": f"Latihan amali menggunakan {second_gap} dan aliran kerja gred pengeluaran moden.",
        "zh": f"深入实操 {second_gap} 及现代生产级自动化工作流。",
    }
    m2_obj_loc = {
        "en": [
            f"Hands-on execution with {second_gap} and modern cloud/digital platforms.",
            "Build automated data pipelines and reporting dashboards.",
        ],
        "ms": [
            f"Latihan amali menggunakan {second_gap} dan platform awan/digital moden.",
            "Bina saluran data automatik dan papan pemuka pelaporan.",
        ],
        "zh": [
            f"深入实操 {second_gap} 及现代云端/数字化平台。",
            "构建自动化数据流程与业务分析报告看板。",
        ],
    }

    m3_title_loc = {
        "en": "Phase 3: Capstone & Industry Readiness",
        "ms": "Fasa 3: Projek Capstone & Persijilan",
        "zh": "第三阶段：综合实战项目与认证",
    }
    m3_desc_loc = {
        "en": f"Deliver an end-to-end industry portfolio capstone targeting {role_name_en}.",
        "ms": f"Sempurnakan projek capstone portfolio industri untuk peranan {role_name_localized}.",
        "zh": f"完成面向 {role_name_localized} 的端到端行业实战作品集毕业设计。",
    }
    m3_obj_loc = {
        "en": [
            f"Deliver an end-to-end industry portfolio project demonstrating {first_gap} and {second_gap}.",
            "Verify alignment with UN SDG impact metrics and workplace standards.",
        ],
        "ms": [
            f"Sempurnakan projek portfolio industri menyeluruh yang membuktikan kemahiran {first_gap} dan {second_gap}.",
            "Sahkan penjajaran dengan metrik impak UN SDG dan piawaian tempat kerja.",
        ],
        "zh": [
            f"交付展示 {first_gap} 与 {second_gap} 综合能力的端到端实战项目。",
            "验证联合国可持续发展目标（SDG）指标与职场技能标准。",
        ],
    }

    milestones = [
        RoadmapMilestone(
            phaseIndex=1,
            phaseTitle=m1_title_loc.get(locale, m1_title_loc["en"]),
            titleLocalized=m1_title_loc,
            description=m1_desc_loc.get(locale, m1_desc_loc["en"]),
            descriptionLocalized=m1_desc_loc,
            durationWeeks=3,
            estimatedHours=15,
            learningObjectives=m1_obj_loc.get(locale, m1_obj_loc["en"]),
            objectivesLocalized=m1_obj_loc,
            recommendedCourses=[
                RecommendedCourse(
                    title=f"Introduction to {first_gap} & Digital Standards",
                    titleLocalized={
                        "en": f"Introduction to {first_gap} & Digital Standards",
                        "ms": f"Pengenalan kepada {first_gap} & Standard Digital",
                        "zh": f"{first_gap} 核心理论与数字化标准",
                    },
                    platform="Coursera (Free Audit)",
                    url="https://www.coursera.org",
                    isHrdCorpClaimable=False,
                    isFree=True,
                    durationHours=12,
                ),
                RecommendedCourse(
                    title="Malaysian Digital Workforce Essentials",
                    titleLocalized={
                        "en": "Malaysian Digital Workforce Essentials",
                        "ms": "Asas Tenaga Kerja Digital Malaysia",
                        "zh": "马来西亚数字技能与职场基础认证",
                    },
                    platform="HRD Corp Claimable",
                    url="https://hrdcorp.gov.my",
                    isHrdCorpClaimable=True,
                    isFree=False,
                    durationHours=16,
                ),
            ],
            sdgGoal="SDG 4.4 & 8.2",
            sdgTitle="Technical & Vocational Skills for Decent Work",
            sdgExplanation=f"Mastering core fundamentals of {first_gap} advances UN SDG 4.4 and SDG 8.2 by transforming routine manual knowledge into resilient digital literacy.",
            sdgExplanationLocalized={
                "en": f"Mastering core fundamentals of {first_gap} directly advances UN SDG 4.4 and SDG 8.2 by transforming routine manual knowledge into resilient digital literacy, shielding you from routine automation.",
                "ms": f"Menguasai asas teras {first_gap} memacu UN SDG 4.4 dan SDG 8.2 secara langsung dengan menukar tugas rutin kepada literasi digital berdaya tahan.",
                "zh": f"深入掌握 {first_gap} 核心理论基础直接契合联合国 SDG 4.4 与 SDG 8.2，将机械常规流程重塑为具备抗自动化韧性的数字化素养。",
            },
        ),
        RoadmapMilestone(
            phaseIndex=2,
            phaseTitle=m2_title_loc.get(locale, m2_title_loc["en"]),
            titleLocalized=m2_title_loc,
            description=m2_desc_loc.get(locale, m2_desc_loc["en"]),
            descriptionLocalized=m2_desc_loc,
            durationWeeks=4,
            estimatedHours=20,
            learningObjectives=m2_obj_loc.get(locale, m2_obj_loc["en"]),
            objectivesLocalized=m2_obj_loc,
            recommendedCourses=[
                RecommendedCourse(
                    title=f"Hands-on {second_gap} Bootcamp",
                    titleLocalized={
                        "en": f"Hands-on {second_gap} Bootcamp",
                        "ms": f"Kem Latihan Praktikal {second_gap}",
                        "zh": f"{second_gap} 进阶实操强化营",
                    },
                    platform="edX (Free Audit)",
                    url="https://www.edx.org",
                    isHrdCorpClaimable=False,
                    isFree=True,
                    durationHours=18,
                ),
                RecommendedCourse(
                    title="Applied Industrial Analytics & Systems",
                    titleLocalized={
                        "en": "Applied Industrial Analytics & Systems",
                        "ms": "Analitik & Sistem Perindustrian Gunaan",
                        "zh": "应用工业数据分析与自动化系统",
                    },
                    platform="HRD Corp Claimable",
                    url="https://hrdcorp.gov.my",
                    isHrdCorpClaimable=True,
                    isFree=False,
                    durationHours=24,
                ),
            ],
            sdgGoal="SDG 9.4 & 8.2",
            sdgTitle="Modern Infrastructure Upgrade & Sustainable Digital Innovation",
            sdgExplanation=f"Applying modern toolchains like {second_gap} fulfills UN SDG 9.4 and SDG 8.2 by modernizing legacy workflows and driving sustainable industrial productivity.",
            sdgExplanationLocalized={
                "en": f"Applying modern toolchains like {second_gap} fulfills UN SDG 9.4 and SDG 8.2 by modernizing legacy workflows and driving sustainable industrial productivity.",
                "ms": f"Mengaplikasikan alatan praktikal {second_gap} memenuhi UN SDG 9.4 dan SDG 8.2 dengan memodenkan aliran kerja manual dan memacu inovasi industri mampan.",
                "zh": f"深入实操 {second_gap} 等现代工具链深度推进联合国 SDG 9.4 与 SDG 8.2，淘汰低效手工内耗，加速数字化基础设施改造与可持续技术升级。",
            },
        ),
        RoadmapMilestone(
            phaseIndex=3,
            phaseTitle=m3_title_loc.get(locale, m3_title_loc["en"]),
            titleLocalized=m3_title_loc,
            description=m3_desc_loc.get(locale, m3_desc_loc["en"]),
            descriptionLocalized=m3_desc_loc,
            durationWeeks=3,
            estimatedHours=15,
            learningObjectives=m3_obj_loc.get(locale, m3_obj_loc["en"]),
            objectivesLocalized=m3_obj_loc,
            recommendedCourses=[
                RecommendedCourse(
                    title=f"{role_name_en} Portfolio Project Capstone",
                    titleLocalized={
                        "en": f"{role_name_en} Portfolio Project Capstone",
                        "ms": f"Projek Portfolio Capstone {role_name_localized}",
                        "zh": f"{role_name_localized} 综合实战作品集项目",
                    },
                    platform="freeCodeCamp / GitHub Open Project",
                    url="https://www.freecodecamp.org",
                    isHrdCorpClaimable=False,
                    isFree=True,
                    durationHours=20,
                )
            ],
            sdgGoal=primary_role_sdg,
            sdgTitle="High-Value Economic Productivity & Standards Verification",
            sdgExplanation=f"Delivering the {role_name_en} portfolio capstone directly achieves UN SDG 8.2 by certifying your capability for high-value economic productivity and sustainable career longevity.",
            sdgExplanationLocalized={
                "en": f"Delivering the {role_name_en} portfolio capstone directly achieves UN SDG 8.2 by certifying your capability for high-value economic productivity and sustainable career longevity.",
                "ms": f"Menyempurnakan capstone industri untuk {role_name_localized} memenuhi UN SDG 8.2 secara langsung dengan memperakui keupayaan produktiviti bernilai tinggi anda.",
                "zh": f"完成面向 {role_name_localized} 的综合实战作品集直接践行联合国 SDG 8.2，认证高附加值工程实战水准，实现高质量体面就业跃升。",
            },
        ),
    ]

    return SelectedRoleRoadmap(
        targetRoleId=target_role.roleId,
        totalWeeks=10,
        milestones=milestones,
        skillsToAcquire=fallback_skills,
        skillsToAcquireLocalized=fallback_skills_loc,
    )


async def synthesize_pathway(
    target_role: MatchedRole,
    profile: AnalyzeProfileData,
    locale: str = "en",
) -> SelectedRoleRoadmap:
    """
    Synthesizes a tailored trilingual reskilling roadmap using Gemini,
    grounding recommendations in free courses and Malaysian HRD Corp programs,
    and generating the UN SDG goal relationship explanations for every phase at once.
    Caches results in-memory for 30 minutes for instantaneous (< 1ms) repeat retrievals.
    """
    cache_key = (
        f"{target_role.roleId}:"
        f"{profile.weeklyCommitmentHours or '3-5'}:"
        f"{(locale or 'en').lower().strip()}:"
        f"{','.join(sorted([s.lower().strip() for s in target_role.skillsGap[:5]]))}"
    )

    now = time.time()
    if cache_key in _pathway_cache:
        cached_roadmap, timestamp = _pathway_cache[cache_key]
        if now - timestamp < PATHWAY_CACHE_TTL:
            return cached_roadmap

    target_sdgs_str = (
        ", ".join([s.targetCode for s in target_role.sdgAlignments])
        if target_role.sdgAlignments
        else "SDG 8.2, SDG 4.4, SDG 9.4"
    )

    gap_skills = target_role.skillsGap[:5]
    if not gap_skills:
        gap_desc = "Baseline requirements fully mastered. Candidate is ready for senior frontier competencies, AI workflow acceleration, and sustainable digital leadership."
    else:
        gap_desc = ", ".join(gap_skills)

    prompt = PATHWAY_PROMPT_TEMPLATE.format(
        target_role_title=target_role.title,
        target_industry=target_role.industry,
        skills_gap=gap_desc,
        matched_strengths=", ".join(target_role.matchedStrengths[:4]) or "Foundational experience",
        weekly_hours=profile.weeklyCommitmentHours or "3-5",
        target_sdgs=target_sdgs_str,
    )

    contents = [{"parts": [{"text": prompt}]}]

    try:
        json_data = None

        # Tier 1: Local Qwen 2.5 (via Ollama)
        try:
            from services.local_llm_service import call_local_llm_json
            logger.info(f"[synthesize_pathway] Tier 1: Generating 3-phase reskilling pathway for '{target_role.title}' via Local Qwen 2.5...")
            json_data = await call_local_llm_json(
                prompt=prompt,
                system_instruction="You are an expert workforce reskilling intelligence strategist. Output strictly valid JSON matching the requested roadmap schema.",
                timeout=55.0,
            )
            if json_data and isinstance(json_data, dict) and json_data.get("milestones"):
                logger.info(f"[synthesize_pathway] Tier 1 Success: Qwen 2.5 generated {len(json_data.get('milestones', []))} roadmap phases.")
            else:
                json_data = None
        except Exception as qwen_err:
            logger.warning(f"[synthesize_pathway] Tier 1 Qwen failed: {qwen_err}. Switching to Tier 2 Gemini fallback...")
            json_data = None

        # Tier 2: Gemini API Fallback
        if not json_data:
            logger.info(f"[synthesize_pathway] Tier 2: Fallback to Gemini API for '{target_role.title}' roadmap...")
            json_data = await call_gemini_with_fallback(contents)
        total_weeks = int(json_data.get("totalWeeks", 10))
        raw_milestones = json_data.get("milestones", [])

        milestones: List[RoadmapMilestone] = []
        for idx, m in enumerate(raw_milestones, 1):
            courses: List[RecommendedCourse] = []
            for c in m.get("recommendedCourses", []):
                course_title_raw = c.get("title", "Industrial Competency Module")
                c_title_loc = c.get("titleLocalized")
                if not isinstance(c_title_loc, dict):
                    c_title_loc = {
                        "en": course_title_raw,
                        "ms": course_title_raw,
                        "zh": course_title_raw,
                    }

                courses.append(
                    RecommendedCourse(
                        title=course_title_raw,
                        titleLocalized=c_title_loc,
                        platform=c.get("platform", "Coursera"),
                        url=c.get("url", "https://www.coursera.org"),
                        isHrdCorpClaimable=bool(c.get("isHrdCorpClaimable", False)),
                        isFree=bool(c.get("isFree", True)),
                        durationHours=c.get("durationHours"),
                    )
                )

            # Extract trilingual title
            p_title = m.get("phaseTitle", f"Phase {idx}")
            t_loc = m.get("titleLocalized")
            if not isinstance(t_loc, dict):
                t_loc = {"en": p_title, "ms": p_title, "zh": p_title}

            # Extract trilingual description
            p_desc = m.get("description", "")
            d_loc = m.get("descriptionLocalized")
            if not isinstance(d_loc, dict):
                d_loc = {"en": p_desc, "ms": p_desc, "zh": p_desc}

            # Extract trilingual objectives
            objs = m.get("learningObjectives", [])
            objs_loc = m.get("objectivesLocalized")
            if not isinstance(objs_loc, dict):
                objs_loc = {"en": objs, "ms": objs, "zh": objs}

            # Extract trilingual SDG relationship explanations
            role_sdg_default = (
                target_role.sdgAlignments[0].targetCode
                if target_role.sdgAlignments
                else "SDG 8.2"
            )
            sdg_goal = m.get("sdgGoal") or (
                "SDG 4.4 & 8.2" if idx == 1 else "SDG 9.4 & 8.2" if idx == 2 else role_sdg_default
            )
            sdg_title = m.get("sdgTitle") or (
                "Technical & Vocational Skills for Decent Work"
                if idx == 1
                else "Modern Infrastructure Upgrade & Automation"
                if idx == 2
                else "High-Value Economic Productivity & Standards"
            )

            sdg_exp_loc = m.get("sdgExplanationLocalized")
            if not isinstance(sdg_exp_loc, dict) or not sdg_exp_loc.get("en"):
                p_en = t_loc.get("en", p_title)
                p_ms = t_loc.get("ms", p_title)
                p_zh = t_loc.get("zh", p_title)
                raw_exp = m.get("sdgExplanation")
                sdg_exp_loc = {
                    "en": raw_exp
                    or f"Mastering {p_en} competencies directly advances {sdg_goal} by upgrading routine tasks into resilient, non-automatable skills.",
                    "ms": f"Menguasai kemahiran {p_ms} memacu {sdg_goal} secara langsung dengan menaik taraf tugas rutin kepada kemahiran berdaya tahan kalis automasi.",
                    "zh": f"深入掌握「{p_zh}」阶段核心技能直接赋能 {sdg_goal}，将传统常规流程重塑为具备抗自动化韧性的前沿数字化认知底座。",
                }
            sdg_exp = m.get("sdgExplanation") or sdg_exp_loc.get("en", "")

            milestones.append(
                RoadmapMilestone(
                    phaseIndex=int(m.get("phaseIndex", idx)),
                    phaseTitle=p_title,
                    titleLocalized=t_loc,
                    description=p_desc,
                    descriptionLocalized=d_loc,
                    durationWeeks=int(m.get("durationWeeks", 3)),
                    estimatedHours=int(m.get("estimatedHours", 15)),
                    learningObjectives=objs,
                    objectivesLocalized=objs_loc,
                    recommendedCourses=courses,
                    sdgGoal=sdg_goal,
                    sdgTitle=sdg_title,
                    sdgExplanation=sdg_exp,
                    sdgExplanationLocalized=sdg_exp_loc,
                )
            )

        # Extract or synthesize non-empty skillsToAcquire
        synthesized_skills = json_data.get("skillsToAcquire")
        synthesized_skills_loc = json_data.get("skillsToAcquireLocalized")

        if not synthesized_skills or not isinstance(synthesized_skills, list) or len(synthesized_skills) == 0:
            if target_role.skillsGap:
                synthesized_skills = list(target_role.skillsGap)
                synthesized_skills_loc = dict(target_role.skillsGapLocalized) if target_role.skillsGapLocalized else None
            else:
                first_gap = f"Advanced {target_role.title} Architecture"
                second_gap = f"Automated {target_role.industry} Systems"
                synthesized_skills = [first_gap, second_gap, "Sustainable Digital Leadership"]
                synthesized_skills_loc = {
                    "en": synthesized_skills,
                    "ms": [f"Seni Bina {target_role.title} Lanjutan", f"Sistem Automasi {target_role.industry}", "Kepimpinan Digital Mampan"],
                    "zh": [f"高级 {target_role.title} 架构设计", f"{target_role.industry} 自动化流水线系统", "可持续数字技术领导力"],
                }

        if milestones:
            roadmap_result = SelectedRoleRoadmap(
                targetRoleId=target_role.roleId,
                totalWeeks=total_weeks,
                milestones=milestones,
                skillsToAcquire=synthesized_skills,
                skillsToAcquireLocalized=synthesized_skills_loc,
            )
            _pathway_cache[cache_key] = (roadmap_result, now)
            return roadmap_result

    except Exception as e:
        # Graceful fallback to guarantee zero crash
        pass

    return get_default_roadmap(target_role, locale)
