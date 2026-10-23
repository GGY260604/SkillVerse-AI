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
