from unittest.mock import patch
from starlette.testclient import TestClient
from schemas.quiz import PhaseQuizResponse, QuizQuestion


def _create_mock_quiz_response():
    """Helper creating a 10-question mock PhaseQuizResponse."""
    questions = []
    for i in range(1, 11):
        questions.append(
            QuizQuestion(
                id=i,
                question=f"Test Scenario Question {i} on Cloud Infrastructure?",
                options=["Option A", "Option B (Correct)", "Option C", "Option D"],
                correctIndex=1,
                explanation=f"Option B is the correct industry practice for question {i}.",
            )
        )

    return PhaseQuizResponse(
        phaseIndex=1,
        phaseTitle="Foundation Core Competencies",
        expReward=50,
        expDifficultyTier="Applied Mastery (50 EXP)",
        evaluationReason="Tested skills demand practical knowledge of container architectures.",
        passingScore=10,
        questions=questions,
    )


def test_quiz_generate_validation_error(client: TestClient):
    """Calling POST /api/v1/quiz/generate with invalid payload should return 422."""
    response = client.post("/api/v1/quiz/generate", json={"phaseIndex": "invalid-index"})
    assert response.status_code == 422


@patch("routers.v1.quiz.generate_phase_quiz")
def test_quiz_generate_success(mock_quiz_service, client: TestClient, sample_quiz_request):
    """Test successful generation of 10-question milestone quiz."""
    mock_quiz_service.return_value = _create_mock_quiz_response()

    response = client.post("/api/v1/quiz/generate", json=sample_quiz_request)
    assert response.status_code == 200
    data = response.json()

    assert data["phaseIndex"] == 1
    assert data["expReward"] == 50
    assert data["passingScore"] == 10
    assert len(data["questions"]) == 10
    for q in data["questions"]:
        assert len(q["options"]) == 4
        assert 0 <= q["correctIndex"] <= 3
        assert len(q["explanation"]) > 0


@patch("routers.v1.quiz.generate_phase_quiz")
def test_quiz_generate_service_failure(mock_quiz_service, client: TestClient, sample_quiz_request):
    """Test 500 error propagation when quiz service encounters an unhandled exception."""
    mock_quiz_service.side_effect = RuntimeError("Gemini API rate limit exceeded")

    response = client.post("/api/v1/quiz/generate", json=sample_quiz_request)
    assert response.status_code == 500
    assert "failed to generate phase verification quiz" in response.json()["detail"].lower()
