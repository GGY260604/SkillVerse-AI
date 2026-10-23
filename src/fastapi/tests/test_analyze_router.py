from unittest.mock import patch, AsyncMock
from starlette.testclient import TestClient
from schemas.analysis import MatchedRole, SdgAlignmentItem
from schemas.team import (
    TeamSkillMatrixResponse,
    TeamMemberAnalysis,
    TeamMatrixCohortSummary,
    SkillEvaluationItem,
    SkillMatchStatus,
)


def _create_mock_matched_roles():
    """Helper creating mock matched roles and radar data."""
    roles = [
        MatchedRole(
            roleId="ai-support-ops-specialist",
            title="AI Support Operations Specialist",
            titleLocalized="AI Support Operations Specialist",
            industry="Responsible AI",
            matchScore=0.88,
            scenarioMultiplierApplied=1.0,
            sdgAlignments=[
                SdgAlignmentItem(
                    targetCode="SDG 8.2",
                    targetTitle="Technological upgrading & economic productivity",
                    affinityScore=0.9,
                )
            ],
            matchedStrengths=["Customer Communication", "Ticket Routing"],
            skillsGap=["Prompt Engineering", "API Integration"],
            atRiskCompetencies=[],
        )
    ]
    radar = [
        {"category": "Technical Aptitude", "userLevel": 65, "requiredLevel": 85},
        {"category": "Domain Operations", "userLevel": 80, "requiredLevel": 75},
        {"category": "Automation Resilience", "userLevel": 70, "requiredLevel": 80},
        {"category": "Learning Agility", "userLevel": 85, "requiredLevel": 85},
        {"category": "Strategic Leadership", "userLevel": 60, "requiredLevel": 70},
    ]
    scenario_roles = {"conservative": [], "moderate": [], "disruptive": []}
    return roles, radar, scenario_roles


def test_analyze_endpoint_validation_error(client: TestClient):
    """Calling POST /api/v1/analyze without profile should return 422."""
    response = client.post("/api/v1/analyze", json={"macroScenario": "moderate"})
    assert response.status_code == 422


@patch("routers.v1.analyze.evaluate_roles")
def test_analyze_endpoint_success(mock_eval, client: TestClient, sample_analyze_payload):
    """Test standard role evaluation without roadmap auto-synthesis."""
    roles, radar, scenario_roles = _create_mock_matched_roles()
    mock_eval.return_value = (roles, radar, scenario_roles)

    response = client.post("/api/v1/analyze", json=sample_analyze_payload)
    assert response.status_code == 200
    data = response.json()

    assert "assessmentId" in data
    assert "sessionId" in data
    assert data["sessionId"] == "test-session-12345"
    assert data["activeScenario"] == "moderate"
    assert len(data["radarData"]) == 5
    assert len(data["topRoles"]) == 1
    assert data["topRoles"][0]["roleId"] == "ai-support-ops-specialist"
    assert data["selectedRoleRoadmap"] is None


@patch("routers.v1.analyze.evaluate_roles")
def test_analyze_stream_endpoint(mock_eval, client: TestClient, sample_analyze_payload):
    """Test SSE streaming endpoint delivers real-time phase updates."""
    roles, radar, scenario_roles = _create_mock_matched_roles()
    mock_eval.return_value = (roles, radar, scenario_roles)

    response = client.post("/api/v1/analyze/stream", json=sample_analyze_payload)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    content = response.text
    assert "data:" in content
    # Verify phases 1 and complete phase are yielded
    assert '"phase": 1' in content
    assert '"phase": 5' in content or "Discovered top" in content


@patch("routers.v1.analyze.evaluate_team_skill_matrix")
def test_analyze_team_matrix_endpoint(mock_team_service, client: TestClient):
    """Test manager workforce team matrix evaluation endpoint."""
    mock_team_service.return_value = TeamSkillMatrixResponse(
        targetRoleId="cloud-infrastructure-engineer",
        targetRoleTitle="Cloud Infrastructure Engineer",
        industry="Cloud & DevOps",
        requiredSkills=["Docker", "Kubernetes", "Linux"],
        candidates=[
            TeamMemberAnalysis(
                userId="user-1",
                name="Alice Chen",
                currentRole="DevOps Intern",
                overallMatchScore=0.85,
                matchPercentage=85,
                rank=1,
                readinessLevel="Ready to Transition",
                skillsStatus={
                    "Docker": SkillEvaluationItem(
                        skillName="Docker",
                        status=SkillMatchStatus.MASTERED,
                        score=1.0,
                    )
                },
                masteredCount=2,
                gapCount=1,
                criticalDeficitCount=0,
                estimatedReskillingWeeks=4,
            )
        ],
        cohortSummary=TeamMatrixCohortSummary(
            totalCandidates=1,
            averageReadiness=85.0,
            topCandidateName="Alice Chen",
            topCandidateScore=85,
            skillDeficits=[],
            cohortTrainingRecommendations=[],
        ),
        analyzedAt="2026-10-23T00:00:00Z",
    )

    payload = {
        "targetRoleId": "cloud-infrastructure-engineer",
        "teamMembers": [
            {
                "userId": "user-1",
                "name": "Alice Chen",
                "skills": ["Docker", "Linux"],
            }
        ],
    }

    response = client.post("/api/v1/analyze/team-matrix", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["targetRoleTitle"] == "Cloud Infrastructure Engineer"
    assert len(data["candidates"]) == 1
    assert data["candidates"][0]["rank"] == 1
