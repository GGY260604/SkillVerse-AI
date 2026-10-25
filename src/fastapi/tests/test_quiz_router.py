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


async def test_generate_phase_quiz_tier1_qwen():
    """Verify that generate_phase_quiz prioritizes Tier 1 Local Qwen 2.5."""
    from services.quiz.quiz_service import generate_phase_quiz
    from schemas.quiz import PhaseQuizRequest

    qwen_mock_data = {
        "expReward": 45,
        "expDifficultyTier": "Intermediate Architecture (45 EXP)",
        "evaluationReason": "Scenario evaluation requiring architectural comprehension.",
        "questions": [
            {
                "id": i,
                "question": f"Qwen Scenario Question {i}?",
                "options": ["Opt A", "Opt B", "Opt C", "Opt D"],
                "correctIndex": 0,
                "explanation": "Opt A is verified standard.",
            }
            for i in range(1, 11)
        ],
    }

    req = PhaseQuizRequest(
        phaseIndex=1,
        phaseTitle="Cloud Fundamentals",
        skills=["Kubernetes", "Docker"],
        locale="en",
        forceRefresh=True,
    )

    with patch("services.local_llm_service.call_local_llm_json", return_value=qwen_mock_data) as mock_qwen, \
         patch("services.quiz.quiz_service.call_gemini_with_fallback") as mock_gemini:
        res = await generate_phase_quiz(req)
        mock_qwen.assert_called_once()
        mock_gemini.assert_not_called()
        assert res.expReward == 45
        assert len(res.questions) == 10
        assert res.questions[0].question == "Qwen Scenario Question 1?"


async def test_generate_phase_quiz_tier2_gemini_fallback():
    """Verify fallback to Tier 2 Gemini when Tier 1 Qwen fails."""
    from services.quiz.quiz_service import generate_phase_quiz
    from schemas.quiz import PhaseQuizRequest

    gemini_mock_data = {
        "expReward": 70,
        "expDifficultyTier": "Advanced Systems (70 EXP)",
        "evaluationReason": "Evaluated by Gemini fallback.",
        "questions": [
            {
                "id": i,
                "question": f"Gemini Scenario Question {i}?",
                "options": ["Opt 1", "Opt 2", "Opt 3", "Opt 4"],
                "correctIndex": 2,
                "explanation": "Opt 3 is the correct path.",
            }
            for i in range(1, 11)
        ],
    }

    req = PhaseQuizRequest(
        phaseIndex=2,
        phaseTitle="Production Workflows",
        skills=["Terraform", "CI/CD"],
        locale="en",
        forceRefresh=True,
    )

    with patch("services.local_llm_service.call_local_llm_json", side_effect=Exception("Ollama offline")), \
         patch("services.quiz.quiz_service.call_gemini_with_fallback", return_value=gemini_mock_data) as mock_gemini:
        res = await generate_phase_quiz(req)
        mock_gemini.assert_called_once()
        assert res.expReward == 70
        assert len(res.questions) == 10
        assert res.questions[0].question == "Gemini Scenario Question 1?"


async def test_generate_phase_quiz_tier3_deterministic_fallback():
    """Verify fallback to Tier 3 deterministic rule-based quiz when both Qwen and Gemini fail."""
    from services.quiz.quiz_service import generate_phase_quiz
    from schemas.quiz import PhaseQuizRequest

    req = PhaseQuizRequest(
        phaseIndex=3,
        phaseTitle="Capstone Certification",
        skills=["Full Stack Architecture"],
        locale="en",
        forceRefresh=True,
    )

    with patch("services.local_llm_service.call_local_llm_json", side_effect=Exception("Ollama offline")), \
         patch("services.quiz.quiz_service.call_gemini_with_fallback", side_effect=Exception("Gemini disabled")):
        res = await generate_phase_quiz(req)
        assert res.expReward == 85
        assert len(res.questions) == 10
        assert "Full Stack Architecture" in res.questions[0].question

