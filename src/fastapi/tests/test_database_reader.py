import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from services.agent.database_reader_service import read_table_for_user, fetch_user_database_summary


@pytest.mark.asyncio
async def test_read_table_user_isolation_blocks_empty_user():
    data = await read_table_for_user("roadmaps", None)
    assert data == []


@pytest.mark.asyncio
async def test_read_table_user_isolation_with_user():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = [{"id": "rm-1", "user_id": "test-user-123", "targetRoleTitle": "AI Engineer"}]

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)

    with patch("services.agent.database_reader_service.settings") as mock_settings:
        mock_settings.SUPABASE_URL = "https://example.supabase.co"
        mock_settings.SUPABASE_SERVICE_ROLE_KEY = "mock-key"
        with patch("services.agent.database_reader_service.get_shared_client", return_value=mock_client):
            data = await read_table_for_user("roadmaps", "test-user-123")
            assert len(data) == 1
            assert data[0]["id"] == "rm-1"
            assert "user_id=eq.test-user-123" in mock_client.get.call_args[0][0]


@pytest.mark.asyncio
async def test_fetch_user_database_summary_empty_user():
    summary = await fetch_user_database_summary(None)
    assert summary == ""
