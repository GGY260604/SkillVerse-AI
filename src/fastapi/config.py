import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load root .env or local environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))


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
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

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
