import logging
from typing import Any, Dict, List, Optional, Set, Tuple

from config import settings
from services.embedding_service import (
    cosine_similarity as compute_cosine_similarity,
    generate_embeddings_batch,
)
from services.http_client import get_shared_client

logger = logging.getLogger(__name__)

# ==========================================
# Section 1: Trilingual Localization Constants (Section 7 of ESCO_ROLE_VELOCITY.md)
# ==========================================
ROLE_TREND_STATUS_LABELS: Dict[str, Dict[str, str]] = {
    "on_trend": {
        "en": "On-Trend (High Growth)",
        "ms": "Trend Meningkat (Pertumbuhan Tinggi)",
        "zh": "强劲增长 (重点推荐)",
    },
    "stable": {
        "en": "Stable Core Competency",
        "ms": "Stabil (Kompetensi Asas)",
        "zh": "平稳基石 (需求稳健)",
    },
    "falling_behind": {
        "en": "Falling Behind (Automation Risk)",
        "ms": "Ketinggalan (Berisiko Automasi)",
        "zh": "面临淘汰 (转型预警)",
    },
}

ROLE_PURSUE_RECOMMENDATIONS: Dict[str, Dict[str, str]] = {
    "on_trend": {
        "en": "Highly viable career path with expanding workforce demand.",
        "ms": "Laluan kerjaya yang amat berdaya maju dengan permintaan pasaran yang berkembang pesat.",
        "zh": "具备极高职业拓展前景，企业招聘需求加速扩张。",
    },
    "stable": {
        "en": "Foundational career path with consistent market absorption and low volatility.",
        "ms": "Laluan kerjaya asas dengan penyerapan pasaran yang konsisten dan volatiliti rendah.",
        "zh": "稳健型基础职业路径，市场需求稳定且短期自动化波动较低。",
    },
    "falling_behind": {
        "en": "Core tasks face automation pressure; prioritize AI-augmented tooling.",
        "ms": "Tugas teras menghadapi tekanan automasi; utamakan penguasaan alatan berkuasa AI.",
        "zh": "基础工作流面临自动化替代风险，建议重点补充 AI 增效工具链。",
    },
}

# ==========================================
# Section 2: Tier 4 Self-Expanding Ingestion Backlog
# ==========================================
_UNINDEXED_SKILLS_BACKLOG: Set[str] = set()
MAX_BACKLOG_SIZE = 200


def register_unindexed_skill(skill_name: str) -> None:
    """
    Tier 4: Queue an unindexed ESCO skill into the self-expanding ingestion backlog
    so the next scheduled run of trend_sync_service can evaluate its velocity.
    """
    cleaned = str(skill_name or "").strip()
    if len(cleaned) < 2 or len(_UNINDEXED_SKILLS_BACKLOG) >= MAX_BACKLOG_SIZE:
        return
    _UNINDEXED_SKILLS_BACKLOG.add(cleaned)


def get_unindexed_skills_backlog() -> List[str]:
    """Return a snapshot of queued unindexed skills without clearing."""
    return sorted(_UNINDEXED_SKILLS_BACKLOG)


def pop_unindexed_skills_backlog(limit: int = 25) -> List[str]:
    """Pop up to `limit` unindexed skills for live ingestion during trend sync."""
    selected: List[str] = []
    for skill in sorted(_UNINDEXED_SKILLS_BACKLOG):
        if len(selected) >= limit:
            break
        selected.append(skill)
    for skill in selected:
        _UNINDEXED_SKILLS_BACKLOG.discard(skill)
    return selected


# ==========================================
# Section 3: Tier 3 Sector Macro Multiplier Prior
# ==========================================
def infer_sector_velocity_prior(industry: str, title: str = "") -> float:
    """
    Tier 3: Sector Macro Multiplier Prior (V_sector).
    Provides an econometric industry baseline when a role consists primarily of
    specialized niche skills outside the standard trend_signals catalog.
    """
    combined = f"{industry or ''} {title or ''}".lower()

    # Legacy Clerical / Manual Data Entry / Routine Administrative (-0.15)
    legacy_keywords = (
        "clerical",
        "data entry",
        "typist",
        "stenographer",
        "telemarketer",
        "bookkeeping clerk",
        "filing clerk",
        "payroll clerk",
        "cashier",
        "switchboard",
        "manual sorting",
        "word processor",
    )
    if any(kw in combined for kw in legacy_keywords):
        return -0.15

    # Artificial Intelligence, Machine Learning, Cybersecurity, Cloud (+0.15)
    ai_digital_keywords = (
        "artificial intelligence",
        "machine learning",
        "deep learning",
        "llm",
        "generative ai",
        "agentic",
        "cybersecurity",
        "cloud",
        "data science",
        "mlops",
        "devops",
        "robotics",
        "quantum",
        "blockchain",
    )
    if any(kw in combined for kw in ai_digital_keywords):
        return 0.15

    # Clean Energy, Sustainability & ESG (+0.12)
    green_esg_keywords = (
        "clean energy",
        "renewable",
        "solar",
        "wind energy",
        "esg",
        "sustainability",
        "decarbonization",
        "climate",
        "circular economy",
        "green",
        "environmental",
        "carbon",
    )
    if any(kw in combined for kw in green_esg_keywords):
        return 0.12

    # Software, Digital Engineering, FinTech, BioTech (+0.08)
    modern_tech_keywords = (
        "software",
        "technology",
        "information technology",
        "fintech",
        "biotech",
        "semiconductor",
        "automation",
        "analytics",
        "digital",
    )
    if any(kw in combined for kw in modern_tech_keywords):
        return 0.08

    # Enterprise Operations, Healthcare, Education, Hospitality, Trades, Sports (0.00 Stable Baseline)
    return 0.00


# ==========================================
# Section 4: 3-Tier Viability Classification
# ==========================================
def classify_role_trend_status(role_velocity: float) -> str:
    """
    Classify role velocity V_role into the 3-tier market viability framework:
    - on_trend:       V_role >= +0.25
    - stable:         -0.10 <= V_role < +0.25
    - falling_behind: V_role < -0.10
    """
    if role_velocity >= 0.25:
        return "on_trend"
    if role_velocity < -0.10:
        return "falling_behind"
    return "stable"


def format_role_velocity_payload(
    role_velocity: float,
) -> Dict[str, Any]:
    """
    Build the complete trilingual role velocity metadata dictionary ready for
    Pydantic serialization on EscoRoleSuggested and MatchedRole.
    """
    rounded_velocity = round(float(role_velocity), 3)
    status = classify_role_trend_status(rounded_velocity)
    growth_pct = f"{rounded_velocity * 100:+.1f}%"

    return {
        "roleVelocity": rounded_velocity,
        "roleGrowthRatePercent": growth_pct,
        "roleTrendStatus": status,
        "roleTrendStatusLocalized": dict(
            ROLE_TREND_STATUS_LABELS.get(status, ROLE_TREND_STATUS_LABELS["stable"])
        ),
        "pursueRecommendation": dict(
            ROLE_PURSUE_RECOMMENDATIONS.get(status, ROLE_PURSUE_RECOMMENDATIONS["stable"])
        ),
    }


def build_trend_signals_velocity_map(signals: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Convert a list of `trend_signals` rows into a fast lowercase lookup dictionary
    mapping English, Bahasa Melayu, and Chinese skill names to `velocityVs`.
    """
    vel_map: Dict[str, float] = {}
    for row in signals or []:
        if not isinstance(row, dict):
            continue
        raw_vel = row.get("velocityVs")
        if raw_vel is None:
            raw_vel = row.get("velocity_vs", 0.0)
        try:
            v_val = float(raw_vel)
        except (TypeError, ValueError):
            v_val = 0.0

        en_name = str(row.get("skillName") or row.get("skill_name") or "").strip().lower()
        if en_name:
            vel_map[en_name] = v_val

        sources = row.get("sources")
        if isinstance(sources, list) and sources and isinstance(sources[0], dict):
            src0 = sources[0]
            ms_name = str(src0.get("skillName_ms") or "").strip().lower()
            zh_name = str(src0.get("skillName_zh") or "").strip().lower()
            if ms_name:
                vel_map[ms_name] = v_val
            if zh_name:
                vel_map[zh_name] = v_val

    return vel_map


# ==========================================
# Section 5: 4-Tier Cascading Skill Velocity Resolution
# ==========================================
def resolve_single_skill_velocity(
    skill_name: str,
    trend_signals_map: Dict[str, float],
    trend_embeddings_map: Optional[Dict[str, List[float]]] = None,
    skill_embedding: Optional[List[float]] = None,
    queue_unindexed: bool = True,
) -> Tuple[float, int]:
    """
    Resolve a single skill's velocity V_s(s) using the 4-tier cascading hierarchy:
    Returns (velocity_vs, resolution_tier) where:
      - tier 0: Direct / lexical match in trend_signals_map
      - tier 1: BGE-M3 Semantic Vector Transfer (cosine similarity >= 0.70)
      - tier 2: Economic "Stable Core Competency" Prior (V_s = 0.00) + Tier 4 Backlog
    """
    s_clean = str(skill_name or "").strip().lower()
    if not s_clean:
        return 0.0, 2

    # Tier 0a: Exact match in trend_signals_map
    if s_clean in trend_signals_map:
        return float(trend_signals_map[s_clean]), 0

    # Tier 0b: High-precision substring / token match in trend_signals_map
    for sig_key, sig_vel in trend_signals_map.items():
        if len(sig_key) >= 4 and (sig_key in s_clean or s_clean in sig_key):
            return float(sig_vel), 0

    # Tier 1: BGE-M3 Semantic Vector Transfer (cosine similarity >= 0.70)
    if skill_embedding and trend_embeddings_map:
        best_sim = 0.0
        best_neighbor_vel = 0.0
        for sig_key, sig_vec in trend_embeddings_map.items():
            if not sig_vec or sig_key not in trend_signals_map:
                continue
            sim = compute_cosine_similarity(skill_embedding, sig_vec)
            if sim > best_sim:
                best_sim = sim
                best_neighbor_vel = float(trend_signals_map[sig_key])

        if best_sim >= 0.70:
            transferred_vel = round(best_sim * best_neighbor_vel, 4)
            return transferred_vel, 1

    # Tier 2: Economic "Stable Core Competency" Baseline (V_s = 0.00)
    # Tier 4: Queue into self-expanding ingestion backlog
    if queue_unindexed:
        register_unindexed_skill(skill_name)
    return 0.0, 2


def compute_role_velocity_metrics(
    required_skills: List[str],
    industry: str = "",
    title: str = "",
    trend_signals_map: Optional[Dict[str, float]] = None,
    trend_embeddings_map: Optional[Dict[str, List[float]]] = None,
    skill_embeddings_map: Optional[Dict[str, List[float]]] = None,
    scenario_multiplier: float = 1.0,
    stored_base_velocity: Optional[float] = None,
    skill_weights: Optional[Dict[str, float]] = None,
    queue_unindexed: bool = True,
) -> Dict[str, Any]:
    """
    Compute the composite Role Velocity V_role and 3-tier classification according to
    ESCO_ROLE_VELOCITY.md:
      1. V_skills(R) = (1 / |S|) * sum_{s in S} w_s * V_s(s)
      2. If specialized niche skills fall outside active telemetry, apply/blend
         Tier 3 Sector Macro Multiplier Prior (V_sector).
      3. V_role = round(V_skills(R) * M_scenario, 3)
    """
    signals_map = trend_signals_map or {}
    weights_map = skill_weights or {}

    base_velocity: Optional[float] = None

    if required_skills and signals_map:
        total_weighted_v = 0.0
        matched_count = 0
        n = len(required_skills)

        for s in required_skills:
            s_clean = str(s or "").strip().lower()
            w_s = float(weights_map.get(s_clean, weights_map.get(s, 1.0)))
            s_vec = (skill_embeddings_map or {}).get(s) or (skill_embeddings_map or {}).get(s_clean)
            v_s, tier = resolve_single_skill_velocity(
                skill_name=s,
                trend_signals_map=signals_map,
                trend_embeddings_map=trend_embeddings_map,
                skill_embedding=s_vec,
                queue_unindexed=queue_unindexed,
            )
            if tier in (0, 1):
                matched_count += 1
            total_weighted_v += w_s * v_s

        v_skills = total_weighted_v / max(n, 1)
        sector_prior = infer_sector_velocity_prior(industry, title)
        coverage_ratio = matched_count / max(n, 1)

        # If stored_base_velocity was already computed with full BGE-M3 skill embeddings
        # and runtime call didn't pass skill_embeddings_map, prefer stored_base_velocity
        # when lexical coverage is incomplete.
        if (
            stored_base_velocity is not None
            and not skill_embeddings_map
            and coverage_ratio < 0.60
        ):
            base_velocity = float(stored_base_velocity)
        elif matched_count == 0:
            if stored_base_velocity is not None:
                base_velocity = float(stored_base_velocity)
            else:
                base_velocity = sector_prior
        elif coverage_ratio < 0.50 and sector_prior != 0.0:
            # Tier 3: Blend observed skill velocity with sector macro prior when coverage is sparse
            base_velocity = (v_skills * coverage_ratio) + (sector_prior * (1.0 - coverage_ratio))
        else:
            base_velocity = v_skills
    elif stored_base_velocity is not None:
        base_velocity = float(stored_base_velocity)
    else:
        base_velocity = infer_sector_velocity_prior(industry, title)

    # Apply macroeconomic scenario multiplier M_scenario
    effective_multiplier = float(scenario_multiplier) if scenario_multiplier else 1.0
    v_role = round(float(base_velocity) * effective_multiplier, 3)
    v_role = max(-1.0, min(1.0, v_role))

    return format_role_velocity_payload(v_role)


# ==========================================
# Section 6: Batch Recalibration of esco_roles in Supabase
# ==========================================
async def recalibrate_all_esco_roles_velocity() -> Dict[str, Any]:
    """
    Fetch all active `trend_signals` and `esco_roles` from Supabase, compute each role's
    composite velocity V_role using the full 4-tier cascading hierarchy (including
    Tier 1 BGE-M3 semantic vector transfer across all required skills), and persist
    `velocityVs` and `trendStatus` inside `esco_roles.scenario_multipliers` JSONB column.
    Requires zero DDL schema migrations.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("[RoleVelocity] Supabase credentials unavailable; skipping recalibration.")
        return {"updated": 0, "status": "skipped"}

    base_url = settings.SUPABASE_URL.rstrip("/")
    if base_url.endswith("/rest/v1"):
        base_url = base_url[:-8]

    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }

    try:
        client = get_shared_client(timeout=30.0)

        # 1. Fetch all trend_signals
        sig_resp = await client.get(
            f"{base_url}/rest/v1/trend_signals?select=skillName,category,velocityVs,sources",
            headers=headers,
        )
        sig_rows = sig_resp.json() if sig_resp.status_code == 200 else []
        if not isinstance(sig_rows, list):
            sig_rows = []

        trend_signals_map = build_trend_signals_velocity_map(sig_rows)

        # Batch-embed canonical trend signal skill names for Tier 1 BGE-M3 Vector Transfer
        canonical_sig_names: List[str] = []
        sig_embed_texts: List[str] = []
        for row in sig_rows:
            s_name = str(row.get("skillName") or "").strip().lower()
            if not s_name:
                continue
            cat = str(row.get("category") or "General")
            canonical_sig_names.append(s_name)
            sig_embed_texts.append(f"Skill: {s_name}. Category: {cat}.")

        trend_embeddings_map: Dict[str, List[float]] = {}
        if sig_embed_texts:
            sig_vecs = await generate_embeddings_batch(sig_embed_texts)
            for s_name, vec in zip(canonical_sig_names, sig_vecs):
                if vec:
                    trend_embeddings_map[s_name] = vec

        # 2. Fetch all esco_roles
        roles_resp = await client.get(
            f"{base_url}/rest/v1/esco_roles?select=role_id,title,industry,required_skills,scenario_multipliers",
            headers=headers,
        )
        role_rows = roles_resp.json() if roles_resp.status_code == 200 else []
        if not isinstance(role_rows, list):
            role_rows = []

        # Collect all unique required skills that do NOT have a Tier 0 lexical match
        # so we can batch-embed them in one single pass for Tier 1 BGE-M3 transfer!
        unmatched_skills: List[str] = []
        seen_unmatched: Set[str] = set()
        for r in role_rows:
            for s in r.get("required_skills") or []:
                s_clean = str(s or "").strip().lower()
                if not s_clean or s_clean in seen_unmatched:
                    continue
                _, tier = resolve_single_skill_velocity(
                    skill_name=s_clean,
                    trend_signals_map=trend_signals_map,
                    trend_embeddings_map=None,
                    skill_embedding=None,
                    queue_unindexed=False,
                )
                if tier != 0:
                    seen_unmatched.add(s_clean)
                    unmatched_skills.append(s_clean)

        skill_embeddings_map: Dict[str, List[float]] = {}
        if unmatched_skills:
            unmatched_texts = [f"Skill: {s}" for s in unmatched_skills]
            unmatched_vecs = await generate_embeddings_batch(unmatched_texts)
            for s_clean, vec in zip(unmatched_skills, unmatched_vecs):
                if vec:
                    skill_embeddings_map[s_clean] = vec

        # 3. Compute each role's velocity and update scenario_multipliers in Supabase
        updated_count = 0
        tier_counts = {"on_trend": 0, "stable": 0, "falling_behind": 0}

        for r in role_rows:
            role_id = r.get("role_id")
            if not role_id:
                continue
            title = str(r.get("title") or "")
            industry = str(r.get("industry") or "")
            req_skills = r.get("required_skills") or []
            if not isinstance(req_skills, list):
                req_skills = []

            existing_mult = r.get("scenario_multipliers")
            if not isinstance(existing_mult, dict):
                existing_mult = {
                    "moderate": 1.0,
                    "accelerated_ai": 1.15,
                    "green_economy": 1.08,
                }
            else:
                existing_mult = dict(existing_mult)

            # Ensure canonical scenario keys exist
            existing_mult.setdefault("moderate", 1.0)
            existing_mult.setdefault(
                "accelerated_ai", existing_mult.get("disruptive", 1.15)
            )
            existing_mult.setdefault(
                "green_economy", existing_mult.get("conservative", 1.08)
            )

            metrics = compute_role_velocity_metrics(
                required_skills=[str(s) for s in req_skills],
                industry=industry,
                title=title,
                trend_signals_map=trend_signals_map,
                trend_embeddings_map=trend_embeddings_map,
                skill_embeddings_map=skill_embeddings_map,
                scenario_multiplier=1.0,
                queue_unindexed=True,
            )

            existing_mult["velocityVs"] = metrics["roleVelocity"]
            existing_mult["trendStatus"] = metrics["roleTrendStatus"]
            tier_counts[metrics["roleTrendStatus"]] = (
                tier_counts.get(metrics["roleTrendStatus"], 0) + 1
            )

            patch_resp = await client.patch(
                f"{base_url}/rest/v1/esco_roles?role_id=eq.{role_id}",
                json={"scenario_multipliers": existing_mult},
                headers=headers,
            )
            if patch_resp.status_code in (200, 204):
                updated_count += 1

        logger.info(
            f"[RoleVelocity] Recalibrated {updated_count} ESCO roles: {tier_counts}"
        )
        return {
            "updated": updated_count,
            "tierCounts": tier_counts,
            "backlogSize": len(_UNINDEXED_SKILLS_BACKLOG),
        }
    except Exception as exc:
        logger.warning(f"[RoleVelocity] Recalibration failed: {exc}")
        return {"updated": 0, "error": str(exc)}
