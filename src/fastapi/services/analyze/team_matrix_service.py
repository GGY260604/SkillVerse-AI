import asyncio
import math
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from schemas.team import (
    SkillMatchStatus,
    SkillEvaluationItem,
    TeamMemberInput,
    TeamMemberAnalysis,
    SkillDeficitMetric,
    CohortTrainingRecommendation,
    TeamMatrixCohortSummary,
    TeamSkillMatrixRequest,
    TeamSkillMatrixResponse,
)
from schemas.analysis import MacroScenario
from services.embedding_service import generate_embedding, cosine_similarity
from services.analyze.matching_service import (
    fetch_active_roles_from_supabase,
    synthesize_on_demand_role,
    compute_string_similarity,
)
from services.analyze.skill_translations import (
    get_trilingual_skill,
    localize_skill_list_trilingual,
    warm_skills_cache_batch,
)


READINESS_LABELS = {
    "ready": {
        "en": "Role Ready",
        "ms": "Peranan Sedia Ada",
        "zh": "角色就绪",
    },
    "bridgeable": {
        "en": "Short Reskill Runway",
        "ms": "Jurang Boleh Ditingkatkan",
        "zh": "短期能力桥接",
    },
    "intensive": {
        "en": "Substantial Reskill Required",
        "ms": "Latihan Intensif Diperlukan",
        "zh": "需深度重塑培训",
    },
}

EFFORT_LABELS = {
    SkillMatchStatus.MASTERED: {
        "en": "0 Weeks - Ready",
        "ms": "0 Minggu - Sedia",
        "zh": "0 周 - 已熟练掌握",
    },
    SkillMatchStatus.GAP: {
        "en": "2-3 Weeks - Upskill",
        "ms": "2-3 Minggu - Tingkat Kemahiran",
        "zh": "2-3 周 - 模块进阶",
    },
    SkillMatchStatus.CRITICAL_DEFICIT: {
        "en": "4-6 Weeks - Intensive",
        "ms": "4-6 Minggu - Latihan Intensif",
        "zh": "4-6 周 - 零基础强化",
    },
}

STATUS_LABELS = {
    SkillMatchStatus.MASTERED: {
        "en": "Mastered",
        "ms": "Dikuasai",
        "zh": "已掌握",
    },
    SkillMatchStatus.GAP: {
        "en": "Skill Gap",
        "ms": "Jurang Kemahiran",
        "zh": "能力差距",
    },
    SkillMatchStatus.CRITICAL_DEFICIT: {
        "en": "Critical Deficit",
        "ms": "Kekurangan Kritikal",
        "zh": "严重短缺",
    },
}

MATCH_TYPE_LABELS = {
    "exact": {
        "en": "Exact Lexical Overlap",
        "ms": "Padanan Leksikal Tepat",
        "zh": "精确词法匹配",
    },
    "token_jaccard": {
        "en": "Token Jaccard Overlap",
        "ms": "Pertindihan Token Jaccard",
        "zh": "词元交集重叠匹配",
    },
    "semantic_bge_m3": {
        "en": "BGE-M3 Dense Cosine Vector",
        "ms": "Vektor Kosinus Padat BGE-M3",
        "zh": "BGE-M3 语义向量相似匹配",
    },
    "unmatched": {
        "en": "Unmatched Deficit",
        "ms": "Kekurangan Belum Dipadankan",
        "zh": "尚未匹配缺失能力",
    },
}

PROFICIENCY_LABELS = {
    "advanced": {
        "en": "Advanced",
        "ms": "Lanjutan",
        "zh": "熟练精通",
    },
    "expert": {
        "en": "Expert",
        "ms": "Pakar",
        "zh": "专家水平",
    },
    "senior": {
        "en": "Senior",
        "ms": "Kanan",
        "zh": "资深资历",
    },
    "lead": {
        "en": "Lead",
        "ms": "Ketua",
        "zh": "主导领军",
    },
    "intermediate": {
        "en": "Intermediate",
        "ms": "Sederhana",
        "zh": "良好进阶",
    },
    "mid": {
        "en": "Mid-Level",
        "ms": "Tahap Pertengahan",
        "zh": "中级水平",
    },
    "competent": {
        "en": "Competent",
        "ms": "Berwibawa",
        "zh": "胜任合格",
    },
    "beginner": {
        "en": "Beginner",
        "ms": "Permulaan",
        "zh": "初学基础",
    },
    "junior": {
        "en": "Junior",
        "ms": "Muda",
        "zh": "入门基础",
    },
    "novice": {
        "en": "Novice",
        "ms": "Baharu",
        "zh": "新手起步",
    },
}

INDUSTRY_LABELS = {
    "Responsible AI & Enterprise Digitalization": {
        "en": "Responsible AI & Enterprise Digitalization",
        "ms": "AI Bertanggungjawab & Pendigitalan Perusahaan",
        "zh": "可信负责任 AI 与企业数字化",
    },
    "Responsible AI & Digital Transformation": {
        "en": "Responsible AI & Digital Transformation",
        "ms": "AI Bertanggungjawab & Transformasi Digital",
        "zh": "负责任 AI 与数字化转型",
    },
    "Software Engineering & Modern Cloud": {
        "en": "Software Engineering & Modern Cloud",
        "ms": "Kejuruteraan Perisian & Awan Moden",
        "zh": "软件工程与现代云架构",
    },
    "Clean Energy & Sustainable Infrastructure": {
        "en": "Clean Energy & Sustainable Infrastructure",
        "ms": "Tenaga Bersih & Infrastruktur Mampan",
        "zh": "清洁能源与可持续基础设施",
    },
    "Clean Energy & ESG": {
        "en": "Clean Energy & ESG",
        "ms": "Tenaga Bersih & ESG",
        "zh": "清洁能源与 ESG 可持续发展",
    },
    "Enterprise Custom Benchmark": {
        "en": "Enterprise Custom Benchmark",
        "ms": "Penanda Aras Khusus Perusahaan",
        "zh": "企业自定义对标基准",
    },
    "General Technology": {
        "en": "General Technology",
        "ms": "Teknologi Umum",
        "zh": "通用数字科技",
    },
}

DEFAULT_BENCHMARK_ROLES: List[Dict[str, Any]] = [
    {
        "roleId": "role-ai-solutions-architect",
        "title": "AI Solutions Architect",
        "titleLocalized": {
            "en": "AI Solutions Architect",
            "ms": "Arkitek Penyelesaian AI",
            "zh": "AI 解决方案架构师",
        },
        "industry": "Responsible AI & Enterprise Digitalization",
        "requiredSkills": [
            "LLM Architecture & Fine-tuning",
            "Python & PyTorch",
            "Vector Databases & RAG Pipelines",
            "Cloud Infrastructure & MLOps",
            "AI Ethics & Governance Frameworks",
        ],
    },
    {
        "roleId": "role-fullstack-dev",
        "title": "Senior Full-Stack Engineer",
        "titleLocalized": {
            "en": "Senior Full-Stack Engineer",
            "ms": "Jurutera Penuh Tindanan Kanan",
            "zh": "高级全栈软件工程师",
        },
        "industry": "Software Engineering & Modern Cloud",
        "requiredSkills": [
            "React & Next.js",
            "TypeScript & Node.js",
            "REST & GraphQL API Design",
            "PostgreSQL & Vector Search",
            "Docker & CI/CD Pipelines",
        ],
    },
    {
        "roleId": "role-clean-energy-analyst",
        "title": "Clean Energy & ESG Data Analyst",
        "titleLocalized": {
            "en": "Clean Energy & ESG Data Analyst",
            "ms": "Penganalisis Data Tenaga Bersih & ESG",
            "zh": "清洁能源与 ESG 数据分析师",
        },
        "industry": "Clean Energy & Sustainable Infrastructure",
        "requiredSkills": [
            "ESG Reporting & Compliance Standards",
            "Python & Pandas",
            "Carbon Footprint Accounting",
            "SQL & Relational Databases",
            "Power BI & ESG Dashboards",
        ],
    },
]


def _get_proficiency_multiplier(proficiency: Optional[str]) -> float:
    """Maps proficiency rating to mastery score multiplier."""
    if not proficiency:
        return 0.70
    p = proficiency.lower().strip()
    if p in ["advanced", "expert", "senior", "lead"]:
        return 0.95
    elif p in ["intermediate", "mid", "competent"]:
        return 0.75
    elif p in ["beginner", "novice", "junior"]:
        return 0.50
    return 0.70


async def evaluate_team_skill_matrix(
    request: TeamSkillMatrixRequest,
) -> TeamSkillMatrixResponse:
    """
    Evaluates and ranks a cohort of candidates against a target benchmark role.
    Uses the 3-Tier Hybrid Matching Strategy:
      1. Tier 1: Exact string, substring, and Token Jaccard overlap (0.00ms).
      2. Tier 2: BGE-M3 Dense Vector Cosine Similarity (>= 0.58 threshold).
      3. Tier 3: Embedding fallback cascade (RunPod BGE-M3 -> Gemini -> deterministic).
    Produces:
      - Individual candidate mastery vs gap breakdown across required skills.
      - Cohort ranking (Closest candidate = Rank 1).
      - Management deficit metrics and HRD Corp claimable cohort reskilling recommendations.
    """
    locale = request.locale or "en"
    active_roles = await fetch_active_roles_from_supabase()
    if not active_roles:
        active_roles = DEFAULT_BENCHMARK_ROLES

    # 1. Resolve Target Role
    target_role_dict: Optional[Dict[str, Any]] = None

    if request.targetRoleId:
        for r in active_roles:
            if r.get("roleId") == request.targetRoleId or r.get("role_id") == request.targetRoleId:
                target_role_dict = r
                break

    if not target_role_dict and request.targetRoleTitle:
        req_title_lower = request.targetRoleTitle.lower().strip()
        for r in active_roles:
            r_title_en = (r.get("title") or "").lower().strip()
            r_title_ms = (r.get("title_ms") or (r.get("titleLocalized") or {}).get("ms") or "").lower().strip()
            r_title_zh = (r.get("title_zh") or (r.get("titleLocalized") or {}).get("zh") or "").lower().strip()

            if (
                req_title_lower in [r_title_en, r_title_ms, r_title_zh]
                or (r_title_en and req_title_lower in r_title_en)
                or (r_title_ms and req_title_lower in r_title_ms)
                or (r_title_zh and req_title_lower in r_title_zh)
            ):
                target_role_dict = r
                break

    # If role not found in active catalog:
    if not target_role_dict:
        if request.customRequiredSkills and len(request.customRequiredSkills) > 0:
            # Custom manager-defined role
            custom_title = request.targetRoleTitle or "Custom Target Role"
            target_role_dict = {
                "roleId": f"custom-{int(time.time())}",
                "title": custom_title,
                "titleLocalized": {
                    "en": custom_title,
                    "ms": custom_title,
                    "zh": custom_title,
                },
                "industry": "Enterprise Custom Benchmark",
                "requiredSkills": request.customRequiredSkills[:8],
            }
        elif request.targetRoleTitle:
            # Attempt AI on-demand synthesis with protective timeout
            user_skill_sample = []
            for m in request.teamMembers[:3]:
                for s in m.skills[:3]:
                    user_skill_sample.append(s.name)

            try:
                synth_role = await asyncio.wait_for(
                    synthesize_on_demand_role(
                        title=request.targetRoleTitle,
                        user_skills=user_skill_sample,
                    ),
                    timeout=4.0,
                )
                if synth_role:
                    target_role_dict = synth_role
            except Exception as synth_err:
                print(f"[team-matrix] On-demand synthesis timed out or failed ({synth_err}), building dynamic benchmark.")

            # If synthesis timed out or failed, build custom on-demand benchmark preserving requested title
            if not target_role_dict:
                clean_title = request.targetRoleTitle.strip()
                clean_slug = clean_title.lower().replace(" ", "-").replace("/", "-")
                target_role_dict = {
                    "roleId": f"custom-{clean_slug}",
                    "title": clean_title,
                    "titleLocalized": {
                        "en": clean_title,
                        "ms": clean_title,
                        "zh": clean_title,
                    },
                    "industry": "Enterprise Custom Benchmark",
                    "requiredSkills": [
                        f"{clean_title} Core Principles",
                        "System Architecture & Design",
                        "Modern Engineering Toolchain",
                        "Quality Assurance & Testing",
                        "Agile Collaboration & Delivery",
                    ],
                }

    # Final fallback if still unresolved
    if not target_role_dict:
        target_role_dict = active_roles[0]

    # Normalize fields
    role_id = target_role_dict.get("roleId") or target_role_dict.get("role_id") or "role-benchmark"
    role_title = target_role_dict.get("title") or "Target Role"
    role_industry = target_role_dict.get("industry") or "General Technology"
    title_loc = target_role_dict.get("titleLocalized") or {
        "en": role_title,
        "ms": target_role_dict.get("title_ms", role_title),
        "zh": target_role_dict.get("title_zh", role_title),
    }

    # Ensure required_skills is clean list
    req_skills = target_role_dict.get("requiredSkills") or target_role_dict.get("required_skills") or []
    if not req_skills:
        req_skills = [
            "Core Systems Architecture",
            "Technical Problem Solving",
            "Modern Toolchain Mastery",
            "Process Automation",
            "Cross-functional Collaboration",
        ]

    # 2. Collect all candidate skills across all team members to perform a single unified parallel embedding gather
    all_candidate_skill_names = set()
    for member in request.teamMembers:
        for s in member.skills:
            clean_name = s.name.strip()
            if clean_name:
                all_candidate_skill_names.add(clean_name)
        if member.matchedStrengths:
            for ms in member.matchedStrengths:
                clean_ms = ms.strip()
                if clean_ms:
                    all_candidate_skill_names.add(clean_ms)

    all_distinct_skills = list(set(req_skills) | all_candidate_skill_names)
    if all_distinct_skills:
        try:
            await asyncio.wait_for(
                warm_skills_cache_batch(all_distinct_skills, locale=locale),
                timeout=2.5,
            )
        except Exception:
            pass

        try:
            all_vecs = await asyncio.wait_for(
                asyncio.gather(*(generate_embedding(s) for s in all_distinct_skills), return_exceptions=True),
                timeout=4.0,
            )
            global_skill_vectors: Dict[str, List[float]] = {}
            for s, v in zip(all_distinct_skills, all_vecs):
                if isinstance(v, list) and len(v) > 0:
                    global_skill_vectors[s] = v
        except Exception:
            global_skill_vectors = {}
    else:
        global_skill_vectors = {}

    req_skill_vectors = {r: global_skill_vectors.get(r) for r in req_skills if r in global_skill_vectors}

    # Industry trilingual localization
    industry_loc = INDUSTRY_LABELS.get(
        role_industry,
        {
            "en": role_industry,
            "ms": role_industry,
            "zh": role_industry,
        },
    )
    industry_display = industry_loc.get(locale, role_industry)

    # Required competencies trilingual localization:
    # 1. First check if role already has pre-cached trilingual skills
    existing_skills_loc = target_role_dict.get("requiredSkillsLocalized") or target_role_dict.get("required_skills_localized")
    if (
        isinstance(existing_skills_loc, dict)
        and existing_skills_loc.get("zh")
        and existing_skills_loc.get("ms")
        and len(existing_skills_loc.get("zh", [])) == len(req_skills)
        and len(existing_skills_loc.get("ms", [])) == len(req_skills)
    ):
        req_skills_trilingual = existing_skills_loc
    else:
        req_skills_trilingual = localize_skill_list_trilingual(req_skills)

    req_skills_display = req_skills_trilingual.get(locale, req_skills)

    # 3. Evaluate Each Candidate synchronously with zero per-candidate network awaits
    evaluated_candidates: List[TeamMemberAnalysis] = []

    for member in request.teamMembers:
        user_skills_dict: Dict[str, Optional[str]] = {}
        for s in member.skills:
            clean_name = s.name.strip()
            if clean_name:
                prof_val = s.proficiency.value if hasattr(s.proficiency, "value") else str(s.proficiency)
                user_skills_dict[clean_name] = prof_val

        # If user has pre-analyzed matchedStrengths from prior roadmaps, include them
        if member.matchedStrengths:
            for ms in member.matchedStrengths:
                clean_ms = ms.strip()
                if clean_ms and clean_ms not in user_skills_dict:
                    user_skills_dict[clean_ms] = "intermediate"

        cand_keys = list(user_skills_dict.keys())
        user_skill_vectors: Dict[str, List[float]] = {
            k: global_skill_vectors.get(k) for k in cand_keys if k in global_skill_vectors
        }

        skills_status_map: Dict[str, SkillEvaluationItem] = {}
        total_score_acc = 0.0
        mastered_cnt = 0
        gap_cnt = 0
        deficit_cnt = 0
        total_reskill_weeks = 0

        for r_skill in req_skills:
            r_norm = r_skill.lower().strip()
            r_vec = req_skill_vectors.get(r_skill)

            matched_skill_name: Optional[str] = None
            matched_proficiency: Optional[str] = None
            match_type: str = "unmatched"
            skill_score: float = 0.0

            # Tier 1: Lexical Fast-Path (Exact / Substring / Token Jaccard)
            for u_name, u_prof in user_skills_dict.items():
                u_norm = u_name.lower().strip()
                if u_norm == r_norm or u_norm in r_norm or r_norm in u_norm:
                    matched_skill_name = u_name
                    matched_proficiency = u_prof
                    match_type = "exact"
                    skill_score = _get_proficiency_multiplier(u_prof)
                    break
                elif compute_string_similarity(u_norm, r_norm) >= 0.60:
                    matched_skill_name = u_name
                    matched_proficiency = u_prof
                    match_type = "token_jaccard"
                    skill_score = _get_proficiency_multiplier(u_prof) * 0.90
                    break

            # Tier 2: BGE-M3 Dense Semantic Vector Cosine Similarity
            if match_type == "unmatched" and r_vec:
                best_sim = 0.0
                best_skill = None
                best_prof = None
                for u_name, u_prof in user_skills_dict.items():
                    u_vec = user_skill_vectors.get(u_name)
                    if u_vec:
                        sim = cosine_similarity(u_vec, r_vec)
                        if sim > best_sim:
                            best_sim = sim
                            best_skill = u_name
                            best_prof = u_prof

                if best_sim >= 0.58 and best_skill:
                    matched_skill_name = best_skill
                    matched_proficiency = best_prof
                    match_type = "semantic_bge_m3"
                    prof_mult = _get_proficiency_multiplier(best_prof)
                    skill_score = min(1.0, round(best_sim * prof_mult, 3))

            # Tier 3: Unmatched default
            if match_type == "unmatched":
                skill_score = 0.0

            # Determine Mastery Status & Reskill Effort
            if skill_score >= 0.70:
                status = SkillMatchStatus.MASTERED
                effort_weeks = 0
                mastered_cnt += 1
            elif skill_score >= 0.40:
                status = SkillMatchStatus.GAP
                effort_weeks = 3
                gap_cnt += 1
                total_reskill_weeks += effort_weeks
            else:
                status = SkillMatchStatus.CRITICAL_DEFICIT
                effort_weeks = 5
                deficit_cnt += 1
                total_reskill_weeks += effort_weeks

            effort_labels = EFFORT_LABELS[status]
            effort_str = effort_labels.get(locale, effort_labels["en"])

            status_labels = STATUS_LABELS[status]
            status_str = status_labels.get(locale, status_labels["en"])

            r_skill_trilingual = get_trilingual_skill(r_skill)
            matched_skill_trilingual = (
                get_trilingual_skill(matched_skill_name) if matched_skill_name else None
            )

            prof_key = (matched_proficiency or "").lower()
            prof_loc = (
                PROFICIENCY_LABELS.get(
                    prof_key,
                    {"en": matched_proficiency, "ms": matched_proficiency, "zh": matched_proficiency},
                )
                if matched_proficiency
                else None
            )
            prof_display = prof_loc.get(locale, matched_proficiency) if prof_loc else matched_proficiency

            match_type_loc = MATCH_TYPE_LABELS.get(
                match_type,
                {"en": match_type, "ms": match_type, "zh": match_type},
            )

            eval_item = SkillEvaluationItem(
                skillName=r_skill_trilingual.get(locale, r_skill),
                skillNameLocalized=r_skill_trilingual,
                status=status,
                statusLabel=status_str,
                statusLabelLocalized=status_labels,
                score=round(skill_score, 2),
                matchedUserSkill=matched_skill_trilingual.get(locale, matched_skill_name) if matched_skill_trilingual else None,
                matchedUserSkillLocalized=matched_skill_trilingual,
                matchType=match_type,
                matchTypeLocalized=match_type_loc,
                proficiency=prof_display,
                proficiencyLocalized=prof_loc,
                reskillEffortWeeks=effort_weeks,
                reskillEffortLabel=effort_str,
                reskillEffortLabelLocalized=effort_labels,
            )

            # Map canonical English name as primary key, plus localized names so client lookups in any language succeed
            skills_status_map[r_skill] = eval_item
            if eval_item.skillName != r_skill:
                skills_status_map[eval_item.skillName] = eval_item
            if r_skill_trilingual.get("zh") and r_skill_trilingual["zh"] != r_skill:
                skills_status_map[r_skill_trilingual["zh"]] = eval_item
            if r_skill_trilingual.get("ms") and r_skill_trilingual["ms"] != r_skill:
                skills_status_map[r_skill_trilingual["ms"]] = eval_item

            total_score_acc += skill_score

        # Calculate Overall Candidate Match
        overall_match = total_score_acc / max(len(req_skills), 1)
        match_pct = int(round(overall_match * 100))

        if match_pct >= 75:
            readiness_key = "ready"
        elif match_pct >= 45:
            readiness_key = "bridgeable"
        else:
            readiness_key = "intensive"

        readiness_badge = READINESS_LABELS[readiness_key].get(
            locale, READINESS_LABELS[readiness_key]["en"]
        )

        candidate_analysis = TeamMemberAnalysis(
            userId=member.userId,
            name=member.name,
            email=member.email,
            currentRole=member.currentRole or "Team Member",
            department=member.department or role_industry,
            overallMatchScore=round(overall_match, 3),
            matchPercentage=match_pct,
            rank=0,  # Assigned after sorting
            readinessLevel=readiness_badge,
            readinessLevelLocalized=READINESS_LABELS[readiness_key],
            skillsStatus=skills_status_map,
            masteredCount=mastered_cnt,
            gapCount=gap_cnt,
            criticalDeficitCount=deficit_cnt,
            estimatedReskillingWeeks=total_reskill_weeks,
        )
        evaluated_candidates.append(candidate_analysis)

    # 3. Rank Candidates (Rank 1 = Closest Candidate to Target Role)
    evaluated_candidates.sort(key=lambda c: c.overallMatchScore, reverse=True)
    for idx, c in enumerate(evaluated_candidates):
        c.rank = idx + 1

    # 4. Cohort Aggregation & Deficit Metrics
    total_candidates = len(evaluated_candidates)
    avg_readiness = (
        round(sum(c.overallMatchScore for c in evaluated_candidates) / total_candidates * 100, 1)
        if total_candidates > 0
        else 0.0
    )
    top_cand = evaluated_candidates[0] if evaluated_candidates else None

    deficit_metrics: List[SkillDeficitMetric] = []
    cohort_recommendations: List[CohortTrainingRecommendation] = []

    for r_skill in req_skills:
        m_cnt = sum(1 for c in evaluated_candidates if c.skillsStatus[r_skill].status == SkillMatchStatus.MASTERED)
        g_cnt = sum(1 for c in evaluated_candidates if c.skillsStatus[r_skill].status == SkillMatchStatus.GAP)
        d_cnt = sum(1 for c in evaluated_candidates if c.skillsStatus[r_skill].status == SkillMatchStatus.CRITICAL_DEFICIT)
        def_pct = round(((g_cnt + d_cnt) / max(total_candidates, 1)) * 100, 1)

        skill_trilingual = get_trilingual_skill(r_skill)
        deficit_metrics.append(
            SkillDeficitMetric(
                skillName=skill_trilingual.get(locale, r_skill),
                skillNameLocalized=skill_trilingual,
                masteredCount=m_cnt,
                gapCount=g_cnt,
                deficitCount=d_cnt,
                teamDeficitPercentage=def_pct,
            )
        )

        # Generate targeted cohort training recommendation for skills with deficits
        if (g_cnt + d_cnt) > 0:
            target_members = [
                c.name
                for c in evaluated_candidates
                if c.skillsStatus[r_skill].status in [SkillMatchStatus.GAP, SkillMatchStatus.CRITICAL_DEFICIT]
            ]
            course_title_loc = {
                "en": f"Professional Masterclass: {skill_trilingual['en']}",
                "ms": f"Masterclass Profesional: {skill_trilingual['ms']}",
                "zh": f"专业进阶大师课：{skill_trilingual['zh']}",
            }
            platform_loc = {
                "en": "HRD Corp Claimable (Malaysia)",
                "ms": "Boleh Dituntut HRD Corp (Malaysia)",
                "zh": "马来西亚 HRD Corp 培训基金可申报",
            }
            duration_loc = {
                "en": "16 Hours",
                "ms": "16 Jam",
                "zh": "16 学时",
            }
            cohort_recommendations.append(
                CohortTrainingRecommendation(
                    skillName=skill_trilingual.get(locale, r_skill),
                    skillNameLocalized=skill_trilingual,
                    courseTitle=course_title_loc.get(locale, course_title_loc["en"]),
                    courseTitleLocalized=course_title_loc,
                    platform=platform_loc.get(locale, platform_loc["en"]),
                    platformLocalized=platform_loc,
                    isHrdCorpClaimable=True,
                    isFree=False,
                    durationHours=16,
                    durationHoursLabel=duration_loc.get(locale, duration_loc["en"]),
                    durationHoursLabelLocalized=duration_loc,
                    targetTeamMembers=target_members,
                )
            )

    # Sort deficit metrics: highest deficit first
    deficit_metrics.sort(key=lambda d: d.teamDeficitPercentage, reverse=True)
    cohort_recommendations.sort(key=lambda r: len(r.targetTeamMembers), reverse=True)

    cohort_summary = TeamMatrixCohortSummary(
        totalCandidates=total_candidates,
        averageReadiness=avg_readiness,
        topCandidateName=top_cand.name if top_cand else None,
        topCandidateScore=top_cand.matchPercentage if top_cand else None,
        skillDeficits=deficit_metrics,
        cohortTrainingRecommendations=cohort_recommendations[:4],
    )

    return TeamSkillMatrixResponse(
        targetRoleId=role_id,
        targetRoleTitle=title_loc.get(locale, role_title),
        targetRoleTitleLocalized=title_loc,
        industry=industry_display,
        industryLocalized=industry_loc,
        requiredSkills=req_skills_display,
        requiredSkillsLocalized=req_skills_trilingual,
        candidates=evaluated_candidates,
        cohortSummary=cohort_summary,
        analyzedAt=datetime.now(timezone.utc).isoformat(),
    )
