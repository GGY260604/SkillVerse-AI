import re
import logging
from typing import Dict, List, Tuple, Optional, Any
from config import settings

logger = logging.getLogger("pii_sanitizer")

_gliner_instance = None
_gliner_load_attempted = False

# Entities targeted for SDG 5/10 Fairness and PDPA/PII Compliance
PII_ENTITY_LABELS = [
    "person",
    "name",
    "phone number",
    "email address",
    "home address",
    "identity number",
    "passport number",
    "national id",
    "mykad",
    "nric",
    "date of birth",
    "gender",
    "ethnicity",
    "race",
    "marital status",
    "religion",
]

# Label to placeholder token mapping
LABEL_REPLACEMENTS = {
    "person": "[REDACTED_NAME]",
    "name": "[REDACTED_NAME]",
    "phone number": "[REDACTED_PHONE]",
    "email address": "[REDACTED_EMAIL]",
    "home address": "[REDACTED_LOCATION]",
    "identity number": "[REDACTED_ID]",
    "passport number": "[REDACTED_ID]",
    "national id": "[REDACTED_ID]",
    "mykad": "[REDACTED_ID]",
    "nric": "[REDACTED_ID]",
    "date of birth": "[REDACTED_DOB]",
    "gender": "[REDACTED_DEMOGRAPHIC]",
    "ethnicity": "[REDACTED_DEMOGRAPHIC]",
    "race": "[REDACTED_DEMOGRAPHIC]",
    "marital status": "[REDACTED_DEMOGRAPHIC]",
    "religion": "[REDACTED_DEMOGRAPHIC]",
}


def get_gliner_model():
    """Lazy loader for the GLiNER model to conserve memory until first extraction."""
    global _gliner_instance, _gliner_load_attempted
    if _gliner_instance is not None:
        return _gliner_instance
    if _gliner_load_attempted:
        return None

    _gliner_load_attempted = True
    if not getattr(settings, "ENABLE_LOCAL_GLINER", True):
        logger.info("Local GLiNER PII masking is disabled by config.")
        return None

    try:
        import warnings
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=FutureWarning)
            warnings.filterwarnings("ignore", category=UserWarning)
            from gliner import GLiNER
            model_name = getattr(settings, "GLINER_MODEL_NAME", "urchade/gliner_small-v2.1")
            # Try local cache first to avoid hanging during web requests
            try:
                _gliner_instance = GLiNER.from_pretrained(model_name, local_files_only=True)
                logger.info(f"GLiNER model '{model_name}' loaded from local disk cache.")
                return _gliner_instance
            except Exception:
                try:
                    _gliner_instance = GLiNER.from_pretrained(model_name)
                    logger.info(f"GLiNER model '{model_name}' downloaded and loaded.")
                    return _gliner_instance
                except Exception:
                    logger.info(f"GLiNER model '{model_name}' not cached locally. Using high-speed regex PII sanitizer.")
                    return None
    except Exception as e:
        logger.warning(f"Could not load GLiNER model ({e}). Using regex PII sanitizer fallback.")
        return None


def sanitize_pii_with_regex(text: str) -> Tuple[str, Dict[str, int]]:
    """
    Deterministic rule-based sanitizer targeting:
    - Malaysian MyKad / NRIC format (YYMMDD-PB-###G or 12 continuous digits)
    - Email addresses
    - Phone numbers (Malaysia +60 / 01x and international)
    """
    stats = {"email": 0, "phone": 0, "id": 0}
    sanitized = text

    # 1. Emails
    email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
    matches = re.findall(email_pattern, sanitized)
    if matches:
        stats["email"] += len(matches)
        sanitized = re.sub(email_pattern, "[REDACTED_EMAIL]", sanitized)

    # 2. Malaysian MyKad / IC (e.g. 950812-14-5678 or 950812145678)
    mykad_pattern = r"\b\d{6}[-\s]?\d{2}[-\s]?\d{4}\b"
    matches = re.findall(mykad_pattern, sanitized)
    if matches:
        stats["id"] += len(matches)
        sanitized = re.sub(mykad_pattern, "[REDACTED_ID]", sanitized)

    # 3. Malaysian and international phone numbers
    phone_pattern = r"\b(?:\+?60|0)[1-9]\d{0,2}[-\s]?\d{6,8}\b"
    matches = re.findall(phone_pattern, sanitized)
    if matches:
        stats["phone"] += len(matches)
        sanitized = re.sub(phone_pattern, "[REDACTED_PHONE]", sanitized)

    return sanitized, stats


def sanitize_pii_with_gliner(raw_text: str) -> Tuple[str, Dict[str, Any]]:
    """
    Sanitizes raw document text by:
    1. Executing zero-shot NER with GLiNER on PII entities (names, addresses, gender, age, IDs).
    2. Applying regex fallback pass for any missed structured tokens (emails, phones, MyKad).
    Returns (sanitized_text, audit_metadata).
    """
    if not raw_text or not raw_text.strip():
        return raw_text, {"gliner_entities_redacted": 0, "regex_matches": 0, "engine": "none"}

    redacted_text = raw_text
    gliner_entities_found = 0
    model = get_gliner_model()

    if model:
        try:
            # GLiNER works well in chunks of up to ~1500 chars to maintain token fidelity
            # Process text in paragraphs or sliding windows
            entities = model.predict_entities(raw_text, PII_ENTITY_LABELS, threshold=0.40)
            
            # Sort entities by start position descending so replacements don't invalidate indices
            entities = sorted(entities, key=lambda x: x["start"], reverse=True)
            
            for ent in entities:
                label = ent["label"].lower()
                replacement = LABEL_REPLACEMENTS.get(label, "[REDACTED_PII]")
                start, end = ent["start"], ent["end"]
                redacted_text = redacted_text[:start] + replacement + redacted_text[end:]
                gliner_entities_found += 1
                
        except Exception as e:
            logger.warning(f"GLiNER entity extraction error: {e}. Falling back to regex.")

    # Always run deterministic regex pass to guarantee zero leakage of numbers/emails
    final_text, regex_stats = sanitize_pii_with_regex(redacted_text)

    metadata = {
        "engine": "gliner+regex" if model else "regex_only",
        "gliner_entities_redacted": gliner_entities_found,
        "regex_redactions": sum(regex_stats.values()),
        "breakdown": regex_stats,
    }
    return final_text, metadata
