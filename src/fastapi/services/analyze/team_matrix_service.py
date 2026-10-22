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
            r_title = r.get("title", "").lower().strip()
            if r_title == req_title_lower or req_title_lower in r_title:
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
            # Attempt AI on-demand synthesis
            user_skill_sample = []
            for m in request.teamMembers[:3]:
                for s in m.skills[:3]:
                    user_skill_sample.append(s.name)

            synth_role = await synthesize_on_demand_role(
                title=request.targetRoleTitle,
                user_skills=user_skill_sample,
            )
            if synth_role:
                target_role_dict = synth_role

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

    # Pre-generate embeddings for all required benchmark skills in parallel
    if req_skills:
        raw_r_vecs = await asyncio.gather(*(generate_embedding(r) for r in req_skills))
        req_skill_vectors: Dict[str, List[float]] = {
            r: v for r, v in zip(req_skills, raw_r_vecs) if v
        }
    else:
        req_skill_vectors = {}

    # 2. Evaluate Each Candidate
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

        # Pre-compute candidate skill vectors in parallel
        cand_keys = list(user_skills_dict.keys())
        if cand_keys:
            raw_cand_vecs = await asyncio.gather(*(generate_embedding(k) for k in cand_keys))
            user_skill_vectors: Dict[str, List[float]] = {
                k: v for k, v in zip(cand_keys, raw_cand_vecs) if v
            }
        else:
            user_skill_vectors = {}


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

            skills_status_map[r_skill] = SkillEvaluationItem(
                skillName=r_skill,
                status=status,
                score=round(skill_score, 2),
                matchedUserSkill=matched_skill_name,
                matchType=match_type,
                proficiency=matched_proficiency,
                reskillEffortWeeks=effort_weeks,
                reskillEffortLabel=effort_str,
            )
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

        deficit_metrics.append(
            SkillDeficitMetric(
                skillName=r_skill,
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
            cohort_recommendations.append(
                CohortTrainingRecommendation(
                    skillName=r_skill,
                    courseTitle=f"Professional Masterclass: {r_skill}",
                    platform="HRD Corp Claimable (Malaysia)",
                    isHrdCorpClaimable=True,
                    isFree=False,
                    durationHours=16,
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
        industry=role_industry,
        requiredSkills=req_skills,
        candidates=evaluated_candidates,
        cohortSummary=cohort_summary,
        analyzedAt=datetime.now(timezone.utc).isoformat(),
    )
