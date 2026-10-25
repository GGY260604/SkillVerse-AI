import pytest
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


@pytest.mark.asyncio
async def test_team_matrix_intelligence_tier1_qwen(monkeypatch):
    """Verifies evaluate_team_skill_matrix utilizes Tier 1 Qwen 2.5 when online."""
    from schemas.team import TeamSkillMatrixRequest
    from services.analyze.team_matrix_service import evaluate_team_skill_matrix

    qwen_called = False

    async def mock_call_local_llm_json(prompt, system_instruction, timeout=25.0):
        nonlocal qwen_called
        qwen_called = True
        return {
            "recommendations": [
                {
                    "skillName": "Kubernetes",
                    "courseTitle": "Advanced Kubernetes Platform Architecture",
                    "courseTitle_ms": "Seni Bina Platform Kubernetes Lanjutan",
                    "courseTitle_zh": "高级 Kubernetes 云原生架构实战",
                    "platform": "Linux Foundation Academy",
                    "platform_ms": "Akademi Linux Foundation",
                    "platform_zh": "Linux 基金会企业学院",
                    "durationHours": 24,
                    "isHrdCorpClaimable": True,
                    "isFree": False,
                }
            ],
            "executiveInsight": "The cohort possesses solid systems foundations but requires immediate upskilling in Kubernetes orchestration.",
            "executiveInsight_ms": "Kohort mempunyai asas sistem yang kukuh tetapi memerlukan peningkatan kemahiran segera dalam orkestrasi Kubernetes.",
            "executiveInsight_zh": "团队具备扎实的系统底座能力，但亟需在 Kubernetes 编排领域进行重点强化以达成全员角色就绪。",
        }

    monkeypatch.setattr("services.local_llm_service.call_local_llm_json", mock_call_local_llm_json)

    req = TeamSkillMatrixRequest(
        targetRoleTitle="Cloud Platform Engineer",
        customRequiredSkills=["Kubernetes", "Linux", "Terraform", "CI/CD"],
        teamMembers=[
            {
                "userId": "user-1",
                "name": "Bob Smith",
                "skills": [{"name": "Linux", "proficiency": "advanced"}],
            }
        ],
        locale="en",
    )

    result = await evaluate_team_skill_matrix(req)
    assert qwen_called is True
    assert result.targetRoleTitle == "Cloud Platform Engineer"
    assert len(result.cohortSummary.cohortTrainingRecommendations) >= 1
    rec = result.cohortSummary.cohortTrainingRecommendations[0]
    assert rec.courseTitle == "Advanced Kubernetes Platform Architecture"
    assert rec.durationHours == 24
    assert "Kubernetes" in result.cohortSummary.executiveInsight


@pytest.mark.asyncio
async def test_team_matrix_intelligence_tier2_gemini_fallback(monkeypatch):
    """Verifies evaluate_team_skill_matrix falls back to Tier 2 Gemini when Qwen fails."""
    from schemas.team import TeamSkillMatrixRequest
    from services.analyze.team_matrix_service import evaluate_team_skill_matrix, clear_team_matrix_cache

    clear_team_matrix_cache()
    gemini_called = False

    async def mock_call_local_llm_json(prompt, system_instruction, timeout=25.0):
        raise ConnectionError("Ollama daemon unreachable")

    async def mock_call_gemini_json(contents, **kwargs):
        nonlocal gemini_called
        gemini_called = True
        return {
            "recommendations": [
                {
                    "skillName": "Kubernetes",
                    "courseTitle": "Certified Kubernetes Administrator (CKA) Intensive",
                    "courseTitle_ms": "Intensif Pentadbir Kubernetes Bertauliah (CKA)",
                    "courseTitle_zh": "CKA 认证 Kubernetes 管理员强化营",
                    "platform": "HRD Corp Claimable (Malaysia)",
                    "platform_ms": "Boleh Dituntut HRD Corp (Malaysia)",
                    "platform_zh": "马来西亚 HRD Corp 培训基金可申报",
                    "durationHours": 32,
                    "isHrdCorpClaimable": True,
                    "isFree": False,
                }
            ],
            "executiveInsight": "Gemini: Targeted cohort investment in CKA certification will close 80% of team gaps within 4 weeks.",
            "executiveInsight_ms": "Gemini: Pelaburan kohort yang disasarkan dalam pensijilan CKA akan menutup 80% jurang pasukan dalam masa 4 minggu.",
            "executiveInsight_zh": "Gemini: 针对 CKA 认证的定向团队培训将在 4 周内补齐团队 80% 的核心能力缺口。",
        }

    monkeypatch.setattr("services.local_llm_service.call_local_llm_json", mock_call_local_llm_json)
    monkeypatch.setattr("services.gemini_service.call_gemini_json", mock_call_gemini_json)

    req = TeamSkillMatrixRequest(
        targetRoleTitle="Cloud Platform Engineer",
        customRequiredSkills=["Kubernetes", "Linux", "Terraform", "CI/CD"],
        teamMembers=[
            {
                "userId": "user-1",
                "name": "Bob Smith",
                "skills": [{"name": "Linux", "proficiency": "advanced"}],
            }
        ],
        locale="en",
    )

    result = await evaluate_team_skill_matrix(req)
    assert gemini_called is True
    assert len(result.cohortSummary.cohortTrainingRecommendations) >= 1
    rec = result.cohortSummary.cohortTrainingRecommendations[0]
    assert rec.courseTitle == "Certified Kubernetes Administrator (CKA) Intensive"
    assert rec.durationHours == 32
    assert "Gemini" in result.cohortSummary.executiveInsight


@pytest.mark.asyncio
async def test_team_matrix_intelligence_tier3_deterministic_fallback(monkeypatch):
    """Verifies evaluate_team_skill_matrix falls back to Tier 3 deterministic template when both LLMs fail."""
    from schemas.team import TeamSkillMatrixRequest
    from services.analyze.team_matrix_service import evaluate_team_skill_matrix, clear_team_matrix_cache

    clear_team_matrix_cache()

    async def mock_call_local_llm_json(prompt, system_instruction, timeout=25.0):
        raise ConnectionError("Ollama daemon offline")

    async def mock_call_gemini_json(contents, **kwargs):
        raise RuntimeError("Gemini quota exhausted")

    monkeypatch.setattr("services.local_llm_service.call_local_llm_json", mock_call_local_llm_json)
    monkeypatch.setattr("services.gemini_service.call_gemini_json", mock_call_gemini_json)

    req = TeamSkillMatrixRequest(
        targetRoleTitle="Cloud Platform Engineer",
        customRequiredSkills=["Kubernetes", "Linux", "Terraform", "CI/CD"],
        teamMembers=[
            {
                "userId": "user-1",
                "name": "Bob Smith",
                "skills": [{"name": "Linux", "proficiency": "advanced"}],
            }
        ],
        locale="en",
    )

    result = await evaluate_team_skill_matrix(req)
    assert result.targetRoleTitle == "Cloud Platform Engineer"
    assert len(result.cohortSummary.cohortTrainingRecommendations) >= 1
    rec = result.cohortSummary.cohortTrainingRecommendations[0]
    assert "Professional Masterclass" in rec.courseTitle
    assert rec.durationHours == 16
    assert result.cohortSummary.executiveInsight is not None


@pytest.mark.asyncio
async def test_team_matrix_in_memory_cache(monkeypatch):
    """Verifies evaluate_team_skill_matrix returns cached response on duplicate request."""
    from schemas.team import TeamSkillMatrixRequest
    from services.analyze.team_matrix_service import evaluate_team_skill_matrix, clear_team_matrix_cache

    clear_team_matrix_cache()
    call_count = 0

    async def mock_call_local_llm_json(prompt, system_instruction, timeout=25.0):
        nonlocal call_count
        call_count += 1
        return {
            "recommendations": [],
            "executiveInsight": "Cached insight test",
        }

    monkeypatch.setattr("services.local_llm_service.call_local_llm_json", mock_call_local_llm_json)

    req = TeamSkillMatrixRequest(
        targetRoleTitle="Cloud Platform Engineer",
        customRequiredSkills=["Kubernetes", "Linux"],
        teamMembers=[
            {
                "userId": "user-cache-1",
                "name": "Cache Tester",
                "skills": [{"name": "Linux", "proficiency": "advanced"}],
            }
        ],
        locale="en",
    )

    res1 = await evaluate_team_skill_matrix(req)
    assert call_count == 1
    res2 = await evaluate_team_skill_matrix(req)
    # Second call must hit cache without incrementing LLM call count
    assert call_count == 1
    assert res1.targetRoleTitle == res2.targetRoleTitle

