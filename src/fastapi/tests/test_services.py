import math
import pytest
from services.embedding_service import (
    cosine_similarity,
    generate_deterministic_vector,
    is_skill_semantically_matched,
)
from services.analyze.skill_translations import (
    get_trilingual_skill,
    localize_skill_name,
    localize_skill_list_trilingual,
)
from services.http_client import get_shared_client


# =========================================================================
# Embedding Service Tests
# =========================================================================

def test_cosine_similarity_identical_vectors():
    vec_a = [1.0, 0.0, 0.0]
    vec_b = [1.0, 0.0, 0.0]
    assert math.isclose(cosine_similarity(vec_a, vec_b), 1.0, rel_tol=1e-5)


def test_cosine_similarity_orthogonal_vectors():
    vec_a = [1.0, 0.0, 0.0]
    vec_b = [0.0, 1.0, 0.0]
    assert math.isclose(cosine_similarity(vec_a, vec_b), 0.0, abs_tol=1e-5)


def test_cosine_similarity_opposite_vectors():
    vec_a = [1.0, 2.0, 3.0]
    vec_b = [-1.0, -2.0, -3.0]
    assert math.isclose(cosine_similarity(vec_a, vec_b), -1.0, rel_tol=1e-5)


def test_cosine_similarity_edge_cases():
    # Empty lists
    assert cosine_similarity([], []) == 0.0
    # Length mismatch
    assert cosine_similarity([1.0, 2.0], [1.0]) == 0.0
    # Zero vector
    assert cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0


def test_generate_deterministic_vector_properties():
    text = "Machine Learning Engineering"
    vec = generate_deterministic_vector(text, dim=1024)

    assert len(vec) == 1024
    # Vector must be unit-normalized: sqrt(sum(x^2)) ~= 1.0
    magnitude = math.sqrt(sum(x * x for x in vec))
    assert math.isclose(magnitude, 1.0, abs_tol=1e-4)

    # Calling again on same text must produce identical vector
    vec_repeat = generate_deterministic_vector(text, dim=1024)
    assert vec == vec_repeat

    # Calling on different text must produce different vector
    vec_different = generate_deterministic_vector("Solar Photovoltaic Technician", dim=1024)
    assert vec != vec_different


@pytest.mark.asyncio
async def test_is_skill_semantically_matched_fast_paths():
    # Exact match
    assert await is_skill_semantically_matched("Python", "python") is True
    # Substring match
    assert await is_skill_semantically_matched("Python", "Python Programming") is True
    assert await is_skill_semantically_matched("Cloud Computing (AWS)", "AWS") is True


# =========================================================================
# Trilingual Localization Service Tests
# =========================================================================

def test_get_trilingual_skill_known_competency():
    res = get_trilingual_skill("AI Safety & Alignment Auditing")
    assert res["en"] == "AI Safety & Alignment Auditing"
    assert "安全" in res["zh"]
    assert "Keselamatan" in res["ms"]


def test_localize_skill_name_locales():
    skill = "AI Safety & Alignment Auditing"
    zh = localize_skill_name(skill, locale="zh")
    ms = localize_skill_name(skill, locale="ms")
    en = localize_skill_name(skill, locale="en")

    assert zh != en
    assert ms != en
    assert en == skill


def test_localize_skill_list_trilingual():
    skills = ["AI Safety & Alignment Auditing", "Algorithm Design"]
    res = localize_skill_list_trilingual(skills)

    assert "en" in res and "ms" in res and "zh" in res
    assert len(res["en"]) == 2
    assert len(res["ms"]) == 2
    assert len(res["zh"]) == 2


def test_localize_skill_name_empty_or_none():
    assert localize_skill_name("") == ""
    assert localize_skill_name(None) == ""


# =========================================================================
# HTTP Client Service Tests
# =========================================================================

def test_http_client_singleton():
    c1 = get_shared_client()
    c2 = get_shared_client()
    assert c1 is c2
    assert not c1.is_closed
