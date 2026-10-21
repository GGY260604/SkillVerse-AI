import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from schemas.profile import ExtractionResponse
from services.pdf_service import extract_text_from_pdf
from services.ocr_service import validate_and_prepare_image
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
        normalized_profile = await normalize_profile_with_gemini(raw_text=raw_text)
        preview = (raw_text[:250] + "...") if len(raw_text) > 250 else raw_text
        return ExtractionResponse(
            success=True,
            message="PDF resume successfully extracted and standardized into ESCO taxonomy.",
            extractedProfile=normalized_profile,
            rawTextPreview=preview,
        )

    # 2. Handle Image / Photo CVs
    elif extension in [".png", ".jpg", ".jpeg", ".webp"] or "image/" in content_type:
        verified_bytes, mime_type = validate_and_prepare_image(file_bytes, content_type or f"image/{extension.lstrip('.')}")
        normalized_profile = await normalize_profile_with_gemini(image_bytes=verified_bytes, mime_type=mime_type)
        return ExtractionResponse(
            success=True,
            message="CV scan successfully recognized via Vision OCR and standardized into ESCO taxonomy.",
            extractedProfile=normalized_profile,
            rawTextPreview="[Image Content Processed via Gemini Vision OCR]",
        )

    # 3. Unsupported format
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{extension}'. Please upload a PDF or image file (PNG, JPG, WEBP).",
        )
