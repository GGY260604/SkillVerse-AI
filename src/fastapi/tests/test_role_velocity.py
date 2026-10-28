import pytest
from services.trends.role_velocity_service import (
    classify_role_trend_status,
    compute_role_velocity_metrics,
    resolve_single_skill_velocity,
    infer_sector_velocity_prior,
    get_unindexed_skills_backlog,
    pop_unindexed_skills_backlog,
    ROLE_TREND_STATUS_LABELS,
    ROLE_PURSUE_RECOMMENDATIONS,
)


def test_classify_role_trend_status_thresholds():
    """Verify the 3-tier market viability thresholds from ESCO_ROLE_VELOCITY.md Section 2.2."""
    assert classify_role_trend_status(0.48) == "on_trend"
    assert classify_role_trend_status(0.25) == "on_trend"
    assert classify_role_trend_status(0.249) == "stable"
    assert classify_role_trend_status(0.0) == "stable"
    assert classify_role_trend_status(-0.10) == "stable"
    assert classify_role_trend_status(-0.101) == "falling_behind"
    assert classify_role_trend_status(-0.35) == "falling_behind"


def test_role_velocity_mathematical_formulation_and_scenario_multiplier():
    """
    Verify Section 2.1:
      V_skills(R) = (1 / |S|) * sum(w_s * V_s(s))
      V_role = round(V_skills(R) * M_scenario, 3)
    """
    signals_map = {
        "python": 0.45,
        "retrieval-augmented generation (rag)": 0.65,
        "kubernetes": 0.40,
        "fastapi": 0.50,
    }
    req_skills = ["Python", "Retrieval-Augmented Generation (RAG)", "Kubernetes", "FastAPI"]
    # Mean V_skills = (0.45 + 0.65 + 0.40 + 0.50) / 4 = 0.50

    res_moderate = compute_role_velocity_metrics(
        required_skills=req_skills,
        industry="Artificial Intelligence",
        title="AI Engineer",
        trend_signals_map=signals_map,
        scenario_multiplier=1.0,
    )
    assert res_moderate["roleVelocity"] == 0.50
    assert res_moderate["roleGrowthRatePercent"] == "+50.0%"
    assert res_moderate["roleTrendStatus"] == "on_trend"
    assert res_moderate["roleTrendStatusLocalized"] == ROLE_TREND_STATUS_LABELS["on_trend"]
    assert res_moderate["pursueRecommendation"] == ROLE_PURSUE_RECOMMENDATIONS["on_trend"]

    # Apply Accelerated AI Surge multiplier M_scenario = 1.22 -> V_role = round(0.50 * 1.22, 3) = 0.61
    res_ai = compute_role_velocity_metrics(
        required_skills=req_skills,
        industry="Artificial Intelligence",
        title="AI Engineer",
        trend_signals_map=signals_map,
        scenario_multiplier=1.22,
    )
    assert res_ai["roleVelocity"] == 0.61
    assert res_ai["roleGrowthRatePercent"] == "+61.0%"
    assert res_ai["roleTrendStatus"] == "on_trend"


def test_tier_1_bge_m3_semantic_vector_transfer():
    """
    Verify Tier 1 (Section 3.2):
    When an ESCO skill is not in trend_signals lexically, but its BGE-M3 embedding has
    cosine similarity >= 0.70 with an indexed signal, it inherits sim * V_s(neighbor).
    """
    signals_map = {"kubernetes": 0.48}
    # Unit vector along axis 0 for "kubernetes"
    trend_emb_map = {"kubernetes": [1.0, 0.0, 0.0]}
    # Vector with cosine similarity 0.80 to [1.0, 0.0, 0.0]
    unknown_vec = [0.80, 0.60, 0.0]

    vel, tier = resolve_single_skill_velocity(
        skill_name="container cluster orchestration",
        trend_signals_map=signals_map,
        trend_embeddings_map=trend_emb_map,
        skill_embedding=unknown_vec,
        queue_unindexed=False,
    )
    assert tier == 1
    assert vel == pytest.approx(0.80 * 0.48, rel=1e-3)


def test_tier_2_and_tier_4_backlog_for_unindexed_skill():
    """
    Verify Tier 2 (Stable Core 0.00 baseline) and Tier 4 (Self-Expanding Ingestion Backlog)
    when a skill has no lexical match and cosine similarity < 0.70.
    """
    pop_unindexed_skills_backlog(limit=500)  # Clear backlog
    signals_map = {"kubernetes": 0.48}
    trend_emb_map = {"kubernetes": [1.0, 0.0, 0.0]}
    orthogonal_vec = [0.0, 1.0, 0.0]  # cosine similarity = 0.0 < 0.70

    vel, tier = resolve_single_skill_velocity(
        skill_name=" bespoke artisan watchmaking ",
        trend_signals_map=signals_map,
        trend_embeddings_map=trend_emb_map,
        skill_embedding=orthogonal_vec,
        queue_unindexed=True,
    )
    assert tier == 2
    assert vel == 0.0
    backlog = get_unindexed_skills_backlog()
    assert "bespoke artisan watchmaking" in backlog
    popped = pop_unindexed_skills_backlog(limit=10)
    assert "bespoke artisan watchmaking" in popped


def test_tier_3_sector_macro_multiplier_prior():
    """
    Verify Tier 3 (Section 3.2):
    When a role's specialized skills have zero matches in trend_signals,
    it falls back to the Sector Macro Multiplier Prior (V_sector).
    """
    assert infer_sector_velocity_prior("Artificial Intelligence", "LLM Architect") == 0.15
    assert infer_sector_velocity_prior("Clean Energy & ESG", "Solar Grid Planner") == 0.12
    assert infer_sector_velocity_prior("Clerical Administration", "Data Entry Clerk") == -0.15
    assert infer_sector_velocity_prior("Healthcare", "Clinical Nurse") == 0.0

    res_legacy = compute_role_velocity_metrics(
        required_skills=["stenography", "manual ledger filing"],
        industry="Clerical Administration",
        title="Data Entry Clerk",
        trend_signals_map={},
        scenario_multiplier=1.0,
        queue_unindexed=False,
    )
    assert res_legacy["roleVelocity"] == -0.15
    assert res_legacy["roleTrendStatus"] == "falling_behind"
    assert res_legacy["roleGrowthRatePercent"] == "-15.0%"

