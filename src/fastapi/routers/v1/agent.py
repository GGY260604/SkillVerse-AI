from fastapi import APIRouter
from schemas.agent import AgentChatRequest, AgentChatResponse
from services.agent.agent_service import execute_agent_chat

router = APIRouter()


@router.post(
    "/agent",
    response_model=AgentChatResponse,
    summary="Chat with Autonomous Career & Platform Agent",
    description="Processes user conversational inquiries with Qwen 2.5 primary inference and instant Gemini API failover.",
)
async def chat_agent_endpoint(request: AgentChatRequest):
    """
    Unified agent endpoint.
    Executes local Qwen 2.5 model first, falling back to Google Gemini on any timeout or connection refusal.
    """
    return await execute_agent_chat(request)


@router.get("/agent/database/{table}")
async def read_agent_database(table: str, user_id: str = None):
    from services.agent.database_reader_service import read_table_for_user
    data = await read_table_for_user(table, user_id)
    return {"success": True, "table": table, "data": data}
