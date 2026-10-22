import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load root .env or local environment variables
_fastapi_env = os.path.join(os.path.dirname(__file__), ".env")
_root_env = os.path.join(os.path.dirname(__file__), "../../.env")
if os.path.exists(_root_env):
    load_dotenv(dotenv_path=_root_env)
if os.path.exists(_fastapi_env):
    load_dotenv(dotenv_path=_fastapi_env, override=True)


class Settings(BaseSettings):
    APP_NAME: str = "SkillVerse AI"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.replit.app",
        "https://*.replit.dev",
        "*",
    ]
    
    # Gemini API Key Pool (Loads GEMINI_API_KEY_1 through GEMINI_API_KEY_50)
    GEMINI_API_KEYS: List[str] = []
    
    # Supabase Configuration (supports both standard backend and NEXT_PUBLIC_ prefixes)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # RunPod GPU Inference Microservice (BAAI/bge-m3)
    RUNPOD_API_ENDPOINT: str = os.getenv("RUNPOD_API_ENDPOINT", "")
    RUNPOD_API_KEY: str = os.getenv("RUNPOD_API_KEY", "")
    ENABLE_LOCAL_BGE_M3: bool = os.getenv("ENABLE_LOCAL_BGE_M3", "false").lower() in ["1", "true", "yes"]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Collect all populated GEMINI_API_KEY_* keys from environment
        keys = []
        for i in range(1, 51):
            key = os.getenv(f"GEMINI_API_KEY_{i}")
            if key and key.strip():
                keys.append(key.strip())
        
        # Fallback to generic GEMINI_API_KEY if present
        single_key = os.getenv("GEMINI_API_KEY")
        if single_key and single_key.strip() and single_key not in keys:
            keys.append(single_key.strip())
            
        self.GEMINI_API_KEYS = keys

    class Config:
        case_sensitive = True


settings = Settings()
