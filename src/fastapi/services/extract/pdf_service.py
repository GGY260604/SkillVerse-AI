import io
import re
import logging
from fastapi import HTTPException
from .ocr_service import extract_text_from_scanned_pdf

logger = logging.getLogger("pdf_service")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extracts raw text content from uploaded PDF bytes.
    1. Uses high-performance PyMuPDF as the primary text extractor (10x faster, preserving layouts).
    2. Automatically detects scanned/image PDFs (low text yield) and runs PaddleOCR/RapidOCR.
    3. Falls back to pypdf if PyMuPDF encounters an unexpected document structure.
    """
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded PDF file is empty.")

    extracted_pages = []
    total_chars = 0
    used_engine = "pymupdf"

    # --- 1. Primary: PyMuPDF ---
    try:
        import pymupdf
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")

        if doc.is_encrypted:
            if not doc.authenticate(""):
                raise HTTPException(
                    status_code=400,
                    detail="PDF is encrypted with a password. Please provide an unencrypted document.",
                )

        for page in doc:
            page_text = page.get_text("text") or ""
            cleaned_page = page_text.strip()
            if cleaned_page:
                extracted_pages.append(cleaned_page)
                total_chars += len(cleaned_page)

        doc.close()

    except HTTPException:
        raise
    except Exception as mupdf_err:
        logger.warning(f"PyMuPDF failed ({mupdf_err}). Falling back to pypdf...")
        extracted_pages = []
        total_chars = 0
        used_engine = "pypdf"

        # --- 2. Fallback: pypdf ---
        try:
            from pypdf import PdfReader
            pdf_stream = io.BytesIO(file_bytes)
            reader = PdfReader(pdf_stream)

            if reader.is_encrypted:
                try:
                    reader.decrypt("")
                except Exception:
                    raise HTTPException(
                        status_code=400,
                        detail="PDF is encrypted with a password. Please provide an unencrypted document.",
                    )

            for page in reader.pages:
                page_text = page.extract_text() or ""
                if page_text.strip():
                    extracted_pages.append(page_text.strip())
                    total_chars += len(page_text.strip())

        except HTTPException:
            raise
        except Exception as pypdf_err:
            logger.error(f"Both PyMuPDF and pypdf failed to parse PDF: {pypdf_err}")

    # --- 3. Scanned PDF Detection & OCR Fallback ---
    # If the document has pages but less than 60 characters total, it is a scanned bitmap PDF
    if total_chars < 60:
        logger.info(f"PDF yielded only {total_chars} text chars. Invoking PaddleOCR on scanned pages...")
        ocr_text = extract_text_from_scanned_pdf(file_bytes)
        if ocr_text.strip():
            logger.info(f"PaddleOCR successfully extracted {len(ocr_text)} characters from scanned PDF.")
            return clean_extracted_text(ocr_text)

    full_text = "\n\n".join(extracted_pages)
    cleaned_text = clean_extracted_text(full_text)

    if not cleaned_text:
        raise HTTPException(
            status_code=422,
            detail="No readable text found in PDF. If this is a photo or scanned document, please upload as an image (PNG/JPG).",
        )

    logger.info(f"Extracted {len(cleaned_text)} characters from PDF via {used_engine}.")
    return cleaned_text


def clean_extracted_text(text: str) -> str:
    """Normalizes whitespace and multiple newlines for LLM entity extraction."""
    cleaned = re.sub(r"[ \t]+", " ", text)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned
