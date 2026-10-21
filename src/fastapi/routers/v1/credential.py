from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from schemas.credential import CertificateVerificationResult
from services.credential_service import verify_certificate_document

router = APIRouter(prefix="/verify-certificate", tags=["Module 5: Milestone Proof & Credential Verification"])


@router.post(
    "",
    response_model=CertificateVerificationResult,
    status_code=status.HTTP_200_OK,
    summary="Verify course completion certificate and issue UN SDG badge",
    description=(
        "Ingests an uploaded certificate document (PDF, PNG, JPG, or WEBP), performs Gemini Vision OCR "
        "and syllabus authenticity auditing, verifies learner details, and issues a cryptographic "
        "UN SDG micro-credential badge."
    ),
)
async def verify_certificate(
    file: UploadFile = File(..., description="Certificate image (PNG/JPG/WEBP) or PDF file"),
    expectedLearnerName: Optional[str] = Form(None, description="Optional name of the candidate for verification match"),
    expectedCourseTopic: Optional[str] = Form(None, description="Optional milestone course topic for syllabus alignment"),
    milestonePhase: Optional[int] = Form(None, description="Optional phase sequence (1, 2, or 3)"),
    locale: Optional[str] = Form("en", description="User locale (en, ms, zh)"),
):
    """
    Module 5: Milestone Proof Verification & Achievement Credentialing.
    Multimodal Vision OCR auditing for certificates and SDG badge generation.
    """
    try:
        file_bytes = await file.read()
        content_type = file.content_type or "application/octet-stream"

        result = await verify_certificate_document(
            file_bytes=file_bytes,
            content_type=content_type,
            expected_learner_name=expectedLearnerName,
            expected_course_topic=expectedCourseTopic,
            milestone_phase=milestonePhase,
            locale=locale or "en",
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Certificate verification audit failed: {str(e)}",
        )
