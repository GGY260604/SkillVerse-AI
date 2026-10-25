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


def test_search_skill_post_validation_error(client: TestClient):
    """Calling POST /api/v1/trends/search with empty body should return 422."""
    response = client.post("/api/v1/trends/search", json={})
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


@patch("routers.v1.trends.search_and_analyze_skill")
def test_search_skill_post_success(mock_search, client: TestClient, sample_skill_search_request):
    """Test successful POST /api/v1/trends/search with valid payload."""
    mock_search.return_value = _create_mock_skill_search_response("Kubernetes Orchestration")

    response = client.post("/api/v1/trends/search", json=sample_skill_search_request)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["matchedSkillName"] == "Docker Containerization"


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
