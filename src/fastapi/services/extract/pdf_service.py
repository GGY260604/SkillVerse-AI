import io
import re
from fastapi import HTTPException
from pypdf import PdfReader


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extracts raw text content from uploaded PDF bytes using pypdf.
    Cleans excessive whitespace and newlines for LLM processing.
    """
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded PDF file is empty.")

    try:
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

        extracted_pages = []
        for index, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_pages.append(page_text.strip())

        full_text = "\n\n".join(extracted_pages) # Concatenates all pages with 2 newlines 
        
        # Normalize multiple spaces and linebreaks
        cleaned_text = re.sub(r"[ \t]+", " ", full_text) # Replaces multiple spaces and tabs with a single space 
        cleaned_text = re.sub(r"\n{3,}", "\n\n", cleaned_text).strip() # Replaces multiple newlines with 2 newlines

        if not cleaned_text:
            raise HTTPException(
                status_code=422,
                detail="No readable text found in PDF. If this is a scanned document/image, please upload as an image (PNG/JPG) for OCR processing.",
            )

        return cleaned_text

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse PDF document: {str(e)}",
        )
