import io
import pytest
from unittest.mock import patch, AsyncMock
from PIL import Image
from pypdf import PdfWriter
from fastapi import HTTPException
from starlette.testclient import TestClient
from services.extract.pdf_service import extract_text_from_pdf
from services.extract.ocr_service import validate_and_prepare_image
from schemas.profile import ProfileIntakePayload, ExtractionResponse, EmploymentStatus


def _create_dummy_pdf(text: str = "Candidate Profile John Doe Software Engineer") -> bytes:
    """Helper to generate an in-memory valid PDF with text."""
    writer = PdfWriter()
    page = writer.add_blank_page(width=200, height=200)
    # We can write minimal PDF or if blank page has no text, test text extraction behavior
    stream = io.BytesIO()
    writer.write(stream)
    return stream.getvalue()


def _create_dummy_png() -> bytes:
    """Helper to generate an in-memory valid PNG image."""
    img = Image.new("RGB", (64, 64), color="white")
    stream = io.BytesIO()
    img.save(stream, format="PNG")
    return stream.getvalue()


# =========================================================================
# Unit Tests for Extract Services
# =========================================================================

def test_extract_text_from_empty_pdf():
    """Verify empty PDF bytes raise 400."""
    with pytest.raises(HTTPException) as exc_info:
        extract_text_from_pdf(b"")
    assert exc_info.value.status_code == 400
    assert "empty" in exc_info.value.detail.lower()


def test_extract_text_from_blank_pdf():
    """Verify blank PDF with no readable text raises 422."""
    blank_pdf = _create_dummy_pdf("")
    with pytest.raises(HTTPException) as exc_info:
        extract_text_from_pdf(blank_pdf)
    assert exc_info.value.status_code == 422
    assert "no readable text" in exc_info.value.detail.lower()


def test_validate_and_prepare_image_valid():
    """Verify valid PNG image returns validated bytes and mime_type."""
    png_bytes = _create_dummy_png()
    bytes_out, mime_out = validate_and_prepare_image(png_bytes, "image/png")
    assert bytes_out == png_bytes
    assert mime_out == "image/png"


def test_validate_and_prepare_image_empty():
    """Verify empty image bytes raise 400."""
    with pytest.raises(HTTPException) as exc_info:
        validate_and_prepare_image(b"", "image/png")
    assert exc_info.value.status_code == 400


def test_validate_and_prepare_image_unsupported_mime():
    """Verify unsupported image mime type raises 400."""
    with pytest.raises(HTTPException) as exc_info:
        validate_and_prepare_image(b"fakebytes", "image/bmp")
    assert exc_info.value.status_code == 400
    assert "unsupported image type" in exc_info.value.detail.lower()


def test_validate_and_prepare_image_corrupted():
    """Verify corrupted image bytes raise 422."""
    with pytest.raises(HTTPException) as exc_info:
        validate_and_prepare_image(b"not-a-valid-image-format", "image/png")
    assert exc_info.value.status_code == 422
    assert "corrupted or invalid" in exc_info.value.detail.lower()


# =========================================================================
# API Integration Tests for /api/v1/extract Endpoint
# =========================================================================

def test_extract_endpoint_unsupported_extension(client: TestClient):
    """Uploading unsupported document formats (e.g. .txt, .exe) should return 400."""
    files = {"file": ("resume.txt", b"Some plain text resume", "text/plain")}
    response = client.post("/api/v1/extract", files=files)
    assert response.status_code == 400
    assert "unsupported file format" in response.json()["detail"].lower()


def test_extract_endpoint_file_too_large(client: TestClient):
    """Uploading a file exceeding 10MB limit should return 413."""
    oversized = b"0" * (10 * 1024 * 1024 + 100)
    files = {"file": ("big_resume.pdf", oversized, "application/pdf")}
    response = client.post("/api/v1/extract", files=files)
    assert response.status_code == 413
    assert "exceeds maximum allowed size" in response.json()["detail"].lower()


@patch("routers.v1.extract.extract_text_from_pdf")
@patch("routers.v1.extract.normalize_profile_with_gemini")
def test_extract_endpoint_pdf_success(mock_gemini, mock_extract_pdf, client: TestClient):
    """Test successful PDF upload and profile extraction flow."""
    mock_extract_pdf.return_value = "Candidate John Doe, Python and Cloud Developer"
    dummy_profile = ProfileIntakePayload(
        employmentStatus=EmploymentStatus.EMPLOYED_AT_RISK,
        currentJobTitle="Python Developer",
        skills=[{"name": "Python", "proficiency": "advanced"}],
    )
    mock_gemini.return_value = (dummy_profile, "gemini", "KEY_1")

    files = {"file": ("resume.pdf", b"%PDF-1.4 mock pdf content", "application/pdf")}
    response = client.post("/api/v1/extract", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "extractedProfile" in data
    assert data["extractedProfile"]["currentJobTitle"] == "Python Developer"
    assert data["extractionMethod"] == "gemini"


@patch("routers.v1.extract.normalize_profile_with_gemini")
def test_extract_endpoint_image_success(mock_gemini, client: TestClient):
    """Test successful image CV upload and OCR profile extraction flow."""
    png_bytes = _create_dummy_png()
    dummy_profile = ProfileIntakePayload(
        employmentStatus=EmploymentStatus.CAREER_SWITCHER,
        currentJobTitle="Data Entry Clerk",
        skills=[{"name": "Microsoft Excel", "proficiency": "intermediate"}],
    )
    mock_gemini.return_value = (dummy_profile, "gemini", "KEY_1")

    files = {"file": ("scan_cv.png", png_bytes, "image/png")}
    response = client.post("/api/v1/extract", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["extractedProfile"]["currentJobTitle"] == "Data Entry Clerk"
    assert "rawTextPreview" in data
