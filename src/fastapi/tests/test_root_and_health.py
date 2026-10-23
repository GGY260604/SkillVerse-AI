from starlette.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Test the root endpoint returns online status and correct metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["service"] == "SkillVerse AI"
    assert data["documentation"] == "/docs"
    assert data["health"] == "/api/v1/health"
    assert data["version"] == "1.0.0"


def test_health_check_endpoint(client: TestClient):
    """Test the API v1 health check endpoint."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "SkillVerse AI"
    assert "version" in data
    assert "gemini_keys_available" in data
    assert isinstance(data["gemini_keys_available"], int)


def test_cors_headers(client: TestClient):
    """Test that CORS headers allow localhost frontend access."""
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
    }
    response = client.options("/api/v1/health", headers=headers)
    assert response.status_code in [200, 204]
    # Check that allow-origin is returned
    assert "access-control-allow-origin" in response.headers
    allowed_origin = response.headers["access-control-allow-origin"]
    assert allowed_origin in ["http://localhost:3000", "*"]


def test_openapi_docs_endpoints(client: TestClient):
    """Test that Swagger /docs and OpenAPI JSON schema are accessible."""
    docs_resp = client.get("/docs")
    assert docs_resp.status_code == 200

    openapi_resp = client.get("/openapi.json")
    assert openapi_resp.status_code == 200
    schema = openapi_resp.json()
    assert "paths" in schema
    assert "/api/v1/health" in schema["paths"]


def test_nonexistent_endpoint_returns_404(client: TestClient):
    """Test requesting an undefined endpoint returns 404."""
    response = client.get("/api/v1/undefined-route-xyz")
    assert response.status_code == 404
