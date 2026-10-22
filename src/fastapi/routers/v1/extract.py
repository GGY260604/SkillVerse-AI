import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from schemas.profile import ExtractionResponse
from services.extract import extract_text_from_pdf, validate_and_prepare_image
from services.gemini_service import normalize_profile_with_gemini

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit

@router.post("/extract", response_model=ExtractionResponse)
async def extract_profile_from_document(
    file: UploadFile = File(..., description="Uploaded CV document (PDF, PNG, JPG, JPEG, or WEBP)"),
):
    """
    Accepts an uploaded resume or CV scan, executes text/OCR parsing,
    invokes Gemini 1.5 Flash to strip PII and normalize competencies into 
    canonical ESCO/O*NET entities, and returns the pre-filled ProfileIntakePayload.
    """
    filename = file.filename or "unknown"
    extension = os.path.splitext(filename)[1].lower()
    content_type = file.content_type or ""

    # Read uploaded file bytes
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of 10 MB. Current size: {len(file_bytes) / (1024 * 1024):.2f} MB",
        )

    # 1. Handle PDF Documents
    if extension == ".pdf" or "application/pdf" in content_type:
        raw_text = extract_text_from_pdf(file_bytes)
        normalized_profile, extraction_method, used_key = await normalize_profile_with_gemini(raw_text=raw_text)
        preview = (raw_text[:250] + "...") if len(raw_text) > 250 else raw_text
        method_desc = f"Gemini AI ({used_key})" if extraction_method == "gemini" else "Local Heuristic Parser"
        return ExtractionResponse(
            success=True,
            message=f"PDF resume successfully extracted and standardized via {method_desc}.",
            extractedProfile=normalized_profile,
            rawTextPreview=preview,
            extractionMethod=extraction_method,
            usedKey=used_key,
        )

    # 2. Handle Image / Photo CVs
    elif extension in [".png", ".jpg", ".jpeg", ".webp"] or "image/" in content_type:
        verified_bytes, mime_type = validate_and_prepare_image(file_bytes, content_type or f"image/{extension.lstrip('.')}")
        normalized_profile, extraction_method, used_key = await normalize_profile_with_gemini(image_bytes=verified_bytes, mime_type=mime_type)
        method_desc = f"Gemini Vision AI ({used_key})" if extraction_method == "gemini" else "Local Heuristic Parser"
        return ExtractionResponse(
            success=True,
            message=f"CV scan successfully recognized via {method_desc} and standardized into ESCO taxonomy.",
            extractedProfile=normalized_profile,
            rawTextPreview="[Image Content Processed via Vision OCR]",
            extractionMethod=extraction_method,
            usedKey=used_key,
        )

    # 3. Unsupported format
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{extension}'. Please upload a PDF or image file (PNG, JPG, WEBP).",
        )
