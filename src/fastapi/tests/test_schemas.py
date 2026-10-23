import pytest
from pydantic import ValidationError
from schemas.profile import (
    UserSkillItem,
    ProfileIntakePayload,
    EmploymentStatus,
    SkillProficiency,
)
from schemas.analysis import (
    MacroScenario,
    AnalyzeRequestPayload,
    AnalyzeProfileData,
    SdgAlignmentItem,
)
from schemas.quiz import (
    QuizQuestion,
    PhaseQuizRequest,
    PhaseQuizResponse,
)
from schemas.trends import (
    SkillSearchRequest,
    TrendTimeSeriesPoint,
)


def test_user_skill_item_from_string():
    """Verify string skill can be converted into valid UserSkillItem with localized labels."""
    skill = UserSkillItem.model_validate("Python")
    assert skill.name == "Python"
    assert skill.proficiency == SkillProficiency.INTERMEDIATE
    assert skill.isAiExtracted is True
    assert skill.id.startswith("skill-")
    assert isinstance(skill.localized_labels, dict)
    assert "en" in skill.localized_labels


def test_user_skill_item_proficiency_aliasing():
    """Verify proficiency string aliases normalize to correct enum."""
    skill_expert = UserSkillItem.model_validate({"name": "SQL", "proficiency": "senior"})
    assert skill_expert.proficiency == SkillProficiency.ADVANCED

    skill_junior = UserSkillItem.model_validate({"name": "SQL", "proficiency": "entry"})
    assert skill_junior.proficiency == SkillProficiency.BEGINNER

    skill_unknown = UserSkillItem.model_validate({"name": "SQL", "proficiency": "unknown_val"})
    assert skill_unknown.proficiency == SkillProficiency.INTERMEDIATE


def test_profile_intake_payload_sanitizer():
    """Verify invalid employment status falls back to EMPLOYED_AT_RISK gracefully."""
    payload = ProfileIntakePayload.model_validate({
        "employmentStatus": "invalid_status_xyz",
        "skills": ["JavaScript"],
    })
    assert payload.employmentStatus == EmploymentStatus.EMPLOYED_AT_RISK
    assert len(payload.skills) == 1


def test_macro_scenario_enum():
    """Verify MacroScenario valid enum values."""
    assert MacroScenario.MODERATE.value == "moderate"
    assert MacroScenario.ACCELERATED_AI.value == "accelerated_ai"
    assert MacroScenario.GREEN_ECONOMY.value == "green_economy"


def test_analyze_request_sanitizer():
    """Verify macroScenario and locale sanitization."""
    req = AnalyzeRequestPayload.model_validate({
        "profile": {"skills": []},
        "macroScenario": "invalid_scenario_code",
    })
    assert req.macroScenario == MacroScenario.MODERATE
    assert req.locale == "en"


def test_quiz_question_validation_limits():
    """Verify QuizQuestion enforces id (1..10) and correctIndex (0..3)."""
    # Valid question
    q = QuizQuestion(
        id=1,
        question="What is an API Gateway?",
        options=["A", "B", "C", "D"],
        correctIndex=2,
        explanation="C is correct.",
    )
    assert q.correctIndex == 2

    # Invalid correctIndex > 3
    with pytest.raises(ValidationError):
        QuizQuestion(
            id=1,
            question="What is an API Gateway?",
            options=["A", "B", "C", "D"],
            correctIndex=4,
            explanation="Invalid",
        )

    # Invalid id < 1
    with pytest.raises(ValidationError):
        QuizQuestion(
            id=0,
            question="What is an API Gateway?",
            options=["A", "B", "C", "D"],
            correctIndex=0,
            explanation="Invalid",
        )


def test_phase_quiz_response_exp_limits():
    """Verify PhaseQuizResponse enforces expReward in range 5..100."""
    valid_q = QuizQuestion(
        id=1,
        question="Question 1",
        options=["A", "B", "C", "D"],
        correctIndex=0,
        explanation="Exp",
    )

    # Valid expReward
    res = PhaseQuizResponse(
        phaseIndex=1,
        phaseTitle="Core",
        expReward=75,
        evaluationReason="High difficulty.",
        questions=[valid_q],
    )
    assert res.expReward == 75

    # expReward < 5
    with pytest.raises(ValidationError):
        PhaseQuizResponse(
            phaseIndex=1,
            phaseTitle="Core",
            expReward=2,
            evaluationReason="Too low.",
            questions=[valid_q],
        )

    # expReward > 100
    with pytest.raises(ValidationError):
        PhaseQuizResponse(
            phaseIndex=1,
            phaseTitle="Core",
            expReward=150,
            evaluationReason="Too high.",
            questions=[valid_q],
        )


def test_skill_search_request_length_limits():
    """Verify SkillSearchRequest rejects empty query or oversized strings."""
    # Empty query
    with pytest.raises(ValidationError):
        SkillSearchRequest(query="")

    # Max length (120) exceeded
    with pytest.raises(ValidationError):
        SkillSearchRequest(query="x" * 121)

    # Valid query
    req = SkillSearchRequest(query="Machine Learning")
    assert req.query == "Machine Learning"
    assert req.locale == "en"
