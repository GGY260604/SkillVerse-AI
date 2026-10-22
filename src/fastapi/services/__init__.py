"""
SkillVerse AI Services Layer
Modularized by functional domain:
- analyze: Role matching, radar computation, and reskilling roadmap synthesis
- extract: Document parsing and OCR validation
- trends: Real-time labor market trend signal aggregation
- quiz: Phase technical verification and EXP reward calibration
- Shared core services: gemini_service and embedding_service
"""

from .analyze import evaluate_roles, synthesize_pathway, evaluate_team_skill_matrix
from .extract import extract_text_from_pdf, validate_and_prepare_image
from .trends import sync_live_trend_signals_to_supabase
from .quiz import generate_phase_quiz
from .gemini_service import (
    call_gemini_with_fallback,
    call_gemini_json,
    call_gemini_with_rotation,
    normalize_profile_with_gemini,
    heuristic_extract_profile,
)
from .embedding_service import (
    generate_embedding,
    cosine_similarity,
    persist_embedding_cache,
)

__all__ = [
    # Analyze
    "evaluate_roles",
    "synthesize_pathway",
    "evaluate_team_skill_matrix",
    # Extract
    "extract_text_from_pdf",
    "validate_and_prepare_image",
    # Trends
    "sync_live_trend_signals_to_supabase",
    # Quiz
    "generate_phase_quiz",
    # Gemini core
    "call_gemini_with_fallback",
    "call_gemini_json",
    "call_gemini_with_rotation",
    "normalize_profile_with_gemini",
    "heuristic_extract_profile",
    # Embedding core
    "generate_embedding",
    "cosine_similarity",
    "persist_embedding_cache",
]
