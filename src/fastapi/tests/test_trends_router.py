import pytest
from unittest.mock import patch, AsyncMock
from starlette.testclient import TestClient
from routers.v1.trends import invalidate_trends_cache, _trends_cache
from schemas.trends import SkillSearchResponse, SkillTrendVisualization


def _create_mock_skill_search_response(query: str = "Docker"):
    """Helper creating mock SkillSearchResponse."""
    return SkillSearchResponse(
        success=True,
        query=query,
        matchedSkillName="Docker Containerization",
        matchedSkillLocalized={"en": "Docker Containerization", "ms": "Pengkontenaan Docker", "zh": "Docker 容器化"},
        category="Cloud & DevOps",
        categoryLocalized={"en": "Cloud & DevOps", "ms": "Awan & DevOps", "zh": "云原生与运维架构"},
        sources=[{"sourceName": "ArXiv cs.AI", "sourceUrl": "https://arxiv.org"}],
        isNewSkillSynthesized=False,
        visualization=SkillTrendVisualization(
            velocityScore=0.45,
            growthRatePercent="+45.0%",
            status="emerging",
            statusLocalized={"en": "Emerging", "ms": "Meningkat", "zh": "高增长"},
            trendDirection="surging",
            marketDemand="High Growth",
            marketDemandLocalized={"en": "High Growth", "ms": "Pertumbuhan Tinggi", "zh": "高需求"},
            historicalBaseline=10.0,
            currentDemand=14.5,
            timeSeries=[],
            analysisSummary={"en": "Strong continuous demand for container orchestration."},
        ),
        suggestedRoles=[],
        locale="en",
    )


def test_get_trends_endpoint_default(client: TestClient):
    """Test GET /api/v1/trends returns localized payload."""
    invalidate_trends_cache()
    response = client.get("/api/v1/trends")
    assert response.status_code == 200
    data = response.json()
    assert "locale" in data
    assert data["locale"] == "en"
    assert "signals" in data
    assert isinstance(data["signals"], list)


def test_get_trends_endpoint_locales(client: TestClient):
    """Test GET /api/v1/trends with ms and zh locale parameters."""
    for loc in ["ms", "zh"]:
        response = client.get(f"/api/v1/trends?locale={loc}")
        assert response.status_code == 200
        data = response.json()
        assert data["locale"] == loc


def test_trends_cache_invalidation():
    """Verify that invalidate_trends_cache clears cached items."""
    _trends_cache["en"] = {"cached": True}
    assert "en" in _trends_cache
    invalidate_trends_cache()
    assert len(_trends_cache) == 0


def test_search_skill_get_validation_error(client: TestClient):
    """Calling GET /api/v1/trends/search without query parameter should return 422."""
    response = client.get("/api/v1/trends/search")
    assert response.status_code == 422


@patch("routers.v1.trends.search_and_analyze_skill")
def test_search_skill_get_success(mock_search, client: TestClient):
    """Test successful GET /api/v1/trends/search with mocked analysis."""
    mock_search.return_value = _create_mock_skill_search_response("Kubernetes")

    response = client.get("/api/v1/trends/search?query=Kubernetes&locale=en")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["query"] == "Kubernetes"
    assert "visualization" in data
    assert data["visualization"]["status"] == "emerging"


def test_search_skill_post_method_not_allowed(client: TestClient):
    """Calling POST /api/v1/trends/search should return 405 Method Not Allowed."""
    response = client.post("/api/v1/trends/search", json={"query": "Docker"})
    assert response.status_code == 405


@patch("routers.v1.trends.sync_live_trend_signals_to_supabase")
def test_sync_trends_endpoint(mock_sync, client: TestClient):
    """Test POST /api/v1/sync-trends triggers synchronization."""
    mock_sync.return_value = {
        "success": True,
        "message": "Synced 10 signals successfully.",
        "syncedCount": 10,
    }

    response = client.post("/api/v1/sync-trends")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["syncedCount"] == 10


@pytest.mark.asyncio
async def test_sync_live_trend_signals_tier1_qwen(monkeypatch):
    """Verifies sync_live_trend_signals_to_supabase uses Tier 1 Local Qwen 2.5 when available."""
    from services.trends.trend_sync_service import sync_live_trend_signals_to_supabase

    mock_feed_items = [
        {"source": "ArXiv cs.AI", "title": "Paper on Agents", "snippet": "Autonomous agents using RAG", "url": "https://arxiv.org/1", "publishedAt": "2026-10-25"},
        {"source": "RemoteOK Job Feed", "title": "AI Engineer", "snippet": "Active tags: python, agents", "url": "https://remoteok.com/1", "publishedAt": "2026-10-25"},
    ]

    monkeypatch.setattr("services.trends.trend_sync_service.fetch_live_arxiv_signals", AsyncMock(return_value=mock_feed_items[:1]))
    monkeypatch.setattr("services.trends.trend_sync_service.fetch_live_remoteok_signals", AsyncMock(return_value=mock_feed_items[1:]))

    qwen_called = False

    async def mock_call_local_llm_json(prompt, system_instruction, timeout=35.0):
        nonlocal qwen_called
        qwen_called = True
        return {
            "trendSignals": [
                {
                    "skillName": "agentic ai systems",
                    "skillName_ms": "sistem ai berautonomi",
                    "skillName_zh": "自主 AI 智能体系统",
                    "category": "Artificial Intelligence",
                    "status": "emerging",
                    "velocityVs": 0.70,
                    "sourceName": "ArXiv cs.AI",
                    "sourceUrl": "https://arxiv.org/1",
                    "citation": "Surge in multi-agent orchestration.",
                }
            ],
            "emergingRoles": [],
        }

    monkeypatch.setattr("services.local_llm_service.call_local_llm_json", mock_call_local_llm_json)

    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    mock_resp.json = lambda: []
    mock_client = AsyncMock()
    mock_client.get.return_value = mock_resp
    mock_client.post.return_value = mock_resp
    monkeypatch.setattr("services.trends.trend_sync_service.get_shared_client", lambda timeout=None: mock_client)

    result = await sync_live_trend_signals_to_supabase()
    assert qwen_called is True
    assert result["success"] is True
    assert result["tierUsed"] == "qwen"
    assert result["syncedCount"] == 1


@pytest.mark.asyncio
async def test_sync_live_trend_signals_tier2_gemini_fallback(monkeypatch):
    """Verifies sync_live_trend_signals_to_supabase falls back to Tier 2 Gemini when Qwen fails."""
    from services.trends.trend_sync_service import sync_live_trend_signals_to_supabase

    mock_feed_items = [
        {"source": "ArXiv cs.AI", "title": "Paper on Agents", "snippet": "Autonomous agents", "url": "https://arxiv.org/1", "publishedAt": "2026-10-25"},
    ]

    monkeypatch.setattr("services.trends.trend_sync_service.fetch_live_arxiv_signals", AsyncMock(return_value=mock_feed_items))
    monkeypatch.setattr("services.trends.trend_sync_service.fetch_live_remoteok_signals", AsyncMock(return_value=[]))

    async def mock_call_local_llm_json(prompt, system_instruction, timeout=35.0):
        raise ConnectionError("Ollama offline")

    gemini_called = False

    async def mock_call_gemini_with_fallback(contents, **kwargs):
        nonlocal gemini_called
        gemini_called = True
        return {
            "trendSignals": [
                {
                    "skillName": "retrieval-augmented generation",
                    "category": "Artificial Intelligence",
                    "status": "emerging",
                    "velocityVs": 0.60,
                    "sourceName": "ArXiv cs.AI",
                    "sourceUrl": "https://arxiv.org/1",
                    "citation": "Gemini fallback extracted citation.",
                }
            ],
            "emergingRoles": [],
        }

    monkeypatch.setattr("services.local_llm_service.call_local_llm_json", mock_call_local_llm_json)
    monkeypatch.setattr("services.trends.trend_sync_service.call_gemini_with_fallback", mock_call_gemini_with_fallback)

    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    mock_resp.json = lambda: []
    mock_client = AsyncMock()
    mock_client.get.return_value = mock_resp
    mock_client.post.return_value = mock_resp
    monkeypatch.setattr("services.trends.trend_sync_service.get_shared_client", lambda timeout=None: mock_client)

    result = await sync_live_trend_signals_to_supabase()
    assert gemini_called is True
    assert result["success"] is True
    assert result["tierUsed"] == "gemini"
    assert result["syncedCount"] == 1


@pytest.mark.asyncio
async def test_sync_live_trend_signals_tier3_deterministic_fallback(monkeypatch):
    """Verifies sync_live_trend_signals_to_supabase falls back to Tier 3 deterministic floor when both LLMs fail."""
    from services.trends.trend_sync_service import sync_live_trend_signals_to_supabase

    mock_feed_items = [
        {"source": "ArXiv cs.AI", "title": "Paper on Agents", "snippet": "Autonomous agents", "url": "https://arxiv.org/1", "publishedAt": "2026-10-25"},
    ]

    monkeypatch.setattr("services.trends.trend_sync_service.fetch_live_arxiv_signals", AsyncMock(return_value=mock_feed_items))
    monkeypatch.setattr("services.trends.trend_sync_service.fetch_live_remoteok_signals", AsyncMock(return_value=[]))

    async def mock_call_local_llm_json(prompt, system_instruction, timeout=35.0):
        raise ConnectionError("Ollama offline")

    async def mock_call_gemini_with_fallback(contents, **kwargs):
        raise RuntimeError("Gemini quota exhausted")

    monkeypatch.setattr("services.local_llm_service.call_local_llm_json", mock_call_local_llm_json)
    monkeypatch.setattr("services.trends.trend_sync_service.call_gemini_with_fallback", mock_call_gemini_with_fallback)
    monkeypatch.setattr("services.trends.trend_sync_service.generate_embeddings_batch", AsyncMock(return_value=[[0.1] * 1024]))

    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    mock_resp.json = lambda: []
    mock_client = AsyncMock()
    mock_client.get.return_value = mock_resp
    mock_client.post.return_value = mock_resp
    monkeypatch.setattr("services.trends.trend_sync_service.get_shared_client", lambda timeout=None: mock_client)

    result = await sync_live_trend_signals_to_supabase()
    assert result["success"] is True
    assert result["tierUsed"] == "deterministic"
    assert result["syncedCount"] >= 1
    assert result["syncedRolesCount"] >= 1


@pytest.mark.asyncio
async def test_synthesize_skill_and_roles_tier1_qwen(monkeypatch):
    """Verifies synthesize_skill_and_roles_on_demand uses Local Qwen 2.5 as primary Tier 1."""
    from services.trends.skill_search_service import synthesize_skill_and_roles_on_demand

    mock_qwen_output = {
        "skill": {
            "skillName": "agentic ai architecture",
            "category": "Artificial Intelligence",
            "status": "emerging",
            "velocityVs": 0.65,
        },
        "suggestedRoles": [
            {
                "roleId": "agentic-ai-architect",
                "title": "Agentic AI Architect",
                "requiredSkills": ["Agentic AI", "Python", "LangChain"],
            }
        ],
    }

    async def mock_call_local_llm_json(prompt, system_instruction, timeout=25.0):
        return mock_qwen_output

    monkeypatch.setattr("services.local_llm_service.call_local_llm_json", mock_call_local_llm_json)

    res = await synthesize_skill_and_roles_on_demand("Agentic AI")
    assert res["tierUsed"] == "qwen"
    assert res["skill"]["skillName"] == "agentic ai architecture"
    assert len(res["suggestedRoles"]) == 1


@pytest.mark.asyncio
async def test_synthesize_skill_and_roles_tier2_gemini(monkeypatch):
    """Verifies synthesize_skill_and_roles_on_demand falls back to Tier 2 Gemini Flash when Qwen fails."""
    from services.trends.skill_search_service import synthesize_skill_and_roles_on_demand

    async def mock_call_local_llm_json(prompt, system_instruction, timeout=25.0):
        raise ConnectionError("Ollama daemon offline")

    mock_gemini_output = {
        "skill": {
            "skillName": "agentic ai architecture",
            "category": "Artificial Intelligence",
            "status": "emerging",
            "velocityVs": 0.58,
        },
        "suggestedRoles": [
            {
                "roleId": "agentic-ai-architect",
                "title": "Agentic AI Architect",
                "requiredSkills": ["Agentic AI"],
            }
        ],
    }

    async def mock_call_gemini_with_fallback(contents, **kwargs):
        return mock_gemini_output

    monkeypatch.setattr("services.local_llm_service.call_local_llm_json", mock_call_local_llm_json)
    monkeypatch.setattr("services.trends.skill_search_service.call_gemini_with_fallback", mock_call_gemini_with_fallback)

    res = await synthesize_skill_and_roles_on_demand("Agentic AI")
    assert res["tierUsed"] == "gemini"
    assert res["skill"]["skillName"] == "agentic ai architecture"


@pytest.mark.asyncio
async def test_synthesize_skill_and_roles_tier3_deterministic(monkeypatch):
    """Verifies synthesize_skill_and_roles_on_demand falls back to Tier 3 deterministic floor when both fail."""
    from services.trends.skill_search_service import synthesize_skill_and_roles_on_demand

    async def mock_call_local_llm_json(prompt, system_instruction, timeout=25.0):
        raise ConnectionError("Ollama daemon offline")

    async def mock_call_gemini_with_fallback(contents, **kwargs):
        raise RuntimeError("Gemini quota exceeded")

    monkeypatch.setattr("services.local_llm_service.call_local_llm_json", mock_call_local_llm_json)
    monkeypatch.setattr("services.trends.skill_search_service.call_gemini_with_fallback", mock_call_gemini_with_fallback)

    res = await synthesize_skill_and_roles_on_demand("Vector DB Scaling")
    assert res["tierUsed"] == "deterministic"
    assert "vector db scaling" in res["skill"]["skillName"]
    assert len(res["suggestedRoles"]) >= 1


@pytest.mark.asyncio
async def test_persist_new_roles_deduplication(monkeypatch):
    """Verifies persist_new_roles_to_supabase deduplicates against active catalog and candidate batch."""
    from services.trends.skill_search_service import persist_new_roles_to_supabase

    # Mock active catalog with existing role "AI Engineer"
    mock_catalog = [
        {
            "roleId": "ai-engineer-existing",
            "title": "AI Engineer",
            "titleLocalized": {"en": "AI Engineer", "ms": "Jurutera AI", "zh": "AI 工程师"},
            "industry": "Artificial Intelligence",
            "requiredSkills": ["Python", "TensorFlow"],
            "requiredSkillsLocalized": {"en": ["Python", "TensorFlow"], "ms": ["Python", "TensorFlow"], "zh": ["Python", "TensorFlow"]},
            "sdgAlignments": [],
            "scenarioMultipliers": {"moderate": 1.0},
            "radarRequirements": {},
        }
    ]
    monkeypatch.setattr("services.trends.skill_search_service.fetch_active_roles_from_supabase", AsyncMock(return_value=mock_catalog))
    monkeypatch.setattr("services.trends.skill_search_service.generate_embeddings_batch", AsyncMock(return_value=[[0.05] * 1024]))

    # Mock HTTP client
    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    mock_resp.json = lambda: []
    mock_client = AsyncMock()
    mock_client.get.return_value = mock_resp
    mock_client.post.return_value = mock_resp
    monkeypatch.setattr("services.trends.skill_search_service.get_shared_client", lambda timeout=None: mock_client)

    candidate_roles = [
        # Candidate 1: Same title as existing role, different roleId -> Should match existing and NOT be marked newly created
        {
            "roleId": "novel-ai-engineer-slug",
            "title": "ai engineer",
            "industry": "Tech",
            "requiredSkills": ["Python", "PyTorch"],
        },
        # Candidate 2: In-batch duplicate of Candidate 1 -> Should be collapsed/ignored
        {
            "roleId": "another-ai-engineer",
            "title": "AI Engineer",
            "industry": "Tech",
            "requiredSkills": ["Python"],
        },
        # Candidate 3: Truly novel role -> Should be created with canonical slug and marked newly created
        {
            "roleId": "custom-uuid-12345",
            "title": "Quantum Algorithm Researcher",
            "title_ms": "Penyelidik Algoritma Kuantum",
            "title_zh": "量子算法研究员",
            "industry": "Deep Tech & Computing",
            "requiredSkills": ["Quantum Computing", "Linear Algebra"],
        },
    ]

    result = await persist_new_roles_to_supabase(candidate_roles)

    # Should contain exactly 2 roles (the duplicate was collapsed)
    assert len(result) == 2

    # First role: Matched existing AI Engineer
    r1 = result[0]
    assert r1.title == "AI Engineer"
    assert r1.roleId == "ai-engineer-existing"
    assert r1.isNewlyCreated is False

    # Second role: Truly novel role
    r2 = result[1]
    assert r2.title == "Quantum Algorithm Researcher"
    assert r2.roleId == "quantum-algorithm-researcher"
    assert r2.isNewlyCreated is True
