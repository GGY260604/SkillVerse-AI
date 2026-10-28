from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ChatMessageItem(BaseModel):
    role: str = Field(description="Role of message sender: 'user', 'assistant', 'bot', or 'system'")
    content: str = Field(description="Text content of the conversational message")


class AgentChatRequest(BaseModel):
    message: str = Field(description="Latest prompt or inquiry sent by the user")
    history: Optional[List[ChatMessageItem]] = Field(default=[], description="Prior conversational context turns")
    locale: Optional[str] = Field(default="en", description="User active language: 'en', 'zh', or 'ms'")
    system_instruction: Optional[str] = Field(default=None, description="Optional custom agent system instruction prompt")
    user_id: Optional[str] = Field(default=None, description="Authenticated user identifier")


class AgentChatResponse(BaseModel):
    success: bool = Field(default=True, description="Indicates whether model inference succeeded")
    target: Optional[str] = Field(default=None, description="Matched route, modal id, or tool name if an action is triggered")
    message: str = Field(description="Conversational reply text to display to user")
    args: Optional[Dict[str, Any]] = Field(default={}, description="Optional arguments passed to tool/action")
    model_used: str = Field(description="Identifier of model that fulfilled request (e.g., 'qwen2.5:7b' or 'gemini')")
