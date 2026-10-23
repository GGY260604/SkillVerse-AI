import pytest
from starlette.testclient import TestClient
from main import app
from schemas.profile import ProfileIntakePayload, EmploymentStatus, SkillProficiency
from schemas.analysis import AnalyzeRequestPayload, AnalyzeProfileData, MacroScenario
from schemas.quiz import PhaseQuizRequest
from schemas.trends import SkillSearchRequest


@pytest.fixture(scope="session")
def client():
    """
    Session-scoped FastAPI TestClient.
    Executes lifespan startup and shutdown context handlers.
    """
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def sample_profile_data():
    """Sample valid profile data dictionary for testing."""
    return {
        "employmentStatus": "employed_at_risk",
        "currentJobTitle": "Customer Support Representative",
        "industry": "Operations & Support",
        "educationLevel": "Bachelor's Degree",
        "yearsOfExperience": "3-5 years",
        "skills": [
            {
                "name": "Customer Communication",
                "proficiency": "advanced",
                "isAiExtracted": False,
            },
            {
                "name": "Ticket Routing",
                "proficiency": "intermediate",
                "isAiExtracted": True,
            },
            {
                "name": "Data Entry",
                "proficiency": "intermediate",
                "isAiExtracted": True,
            },
        ],
        "toolsAndSoftware": ["Zendesk", "Slack", "Microsoft Excel"],
        "casualDescription": "Handling high-volume customer inquiries and escalations daily.",
        "languages": ["English", "Bahasa Melayu"],
        "careerGoal": "reskill",
        "targetSectors": ["Responsible AI", "Cloud & DevOps"],
        "targetJobTitle": "AI Support Operations Specialist",
        "workArrangement": "hybrid",
        "weeklyCommitmentHours": "5-10",
        "outputLanguage": "en",
    }


@pytest.fixture
def sample_analyze_payload(sample_profile_data):
    """Sample valid AnalyzeRequestPayload dictionary."""
    return {
        "sessionId": "test-session-12345",
        "locale": "en",
        "macroScenario": "moderate",
        "profile": sample_profile_data,
        "autoSynthesizeRoadmap": False,
    }


@pytest.fixture
def sample_quiz_request():
    """Sample valid PhaseQuizRequest dictionary."""
    return {
        "phaseIndex": 1,
        "phaseTitle": "Foundation Core Competencies",
        "skills": ["Prompt Engineering", "Python Basics"],
        "courseTopic": "Introduction to Generative AI Systems",
        "targetRole": "AI Application Developer",
        "locale": "en",
        "forceRefresh": True,
    }


@pytest.fixture
def sample_skill_search_request():
    """Sample valid SkillSearchRequest dictionary."""
    return {
        "query": "Kubernetes Orchestration",
        "locale": "en",
    }
