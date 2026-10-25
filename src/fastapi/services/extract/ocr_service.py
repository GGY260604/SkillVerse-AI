import io
import logging
import numpy as np
from PIL import Image
from fastapi import HTTPException

logger = logging.getLogger("ocr_service")

_ocr_engine = None
_ocr_engine_type = None


def get_ocr_engine():
    """Lazy loader for the OCR engine (RapidOCR / PaddleOCR ONNX)."""
    global _ocr_engine, _ocr_engine_type
    if _ocr_engine is not None:
        return _ocr_engine, _ocr_engine_type

    # Try RapidOCR (Official PaddleOCR PP-OCRv4 weights running on ONNX Runtime)
    try:
        from rapidocr_onnxruntime import RapidOCR
        logger.info("Initializing RapidOCR (PaddleOCR ONNX engine)...")
        _ocr_engine = RapidOCR()
        _ocr_engine_type = "rapidocr"
        return _ocr_engine, _ocr_engine_type
    except Exception as e:
        logger.debug(f"RapidOCR not available: {e}")

    # Fallback to PaddleOCR if paddlepaddle runtime is available
    try:
        from paddleocr import PaddleOCR
        logger.info("Initializing PaddleOCR...")
        _ocr_engine = PaddleOCR(use_angle_cls=False, lang="en")
        _ocr_engine_type = "paddleocr"
        return _ocr_engine, _ocr_engine_type
    except Exception as e:
        logger.warning(f"Could not initialize local OCR engine: {e}")

    _ocr_engine_type = "none"
    return None, "none"


def validate_and_prepare_image(file_bytes: bytes, content_type: str) -> tuple[bytes, str]:
    """
    Validates uploaded image bytes, verifies format integrity via PIL, 
    and returns standardized (image_bytes, mime_type).
    """
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

    allowed_types = {
        "image/png": "image/png",
        "image/jpeg": "image/jpeg",
        "image/jpg": "image/jpeg",
        "image/webp": "image/webp",
    }

    mime_type = allowed_types.get(content_type.lower())
    if not mime_type:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{content_type}'. Supported: PNG, JPG, JPEG, WEBP.",
        )

    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.verify()
        return file_bytes, mime_type
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Uploaded image is corrupted or invalid: {str(e)}",
        )


def extract_text_from_image(file_bytes: bytes) -> str:
    """
    Extracts text lines from an image file using the PaddleOCR / RapidOCR engine.
    Returns cleaned, line-separated text.
    """
    if not file_bytes:
        return ""

    ocr_engine, engine_type = get_ocr_engine()
    if not ocr_engine:
        logger.warning("No local OCR engine loaded; unable to extract text from image.")
        return ""

    try:
        # Load image via PIL and convert to RGB numpy array
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        img_np = np.array(image)

        extracted_lines = []

        if engine_type == "rapidocr":
            # RapidOCR returns (result, elapse_list)
            # where result is [[box, text, score], ...]
            ocr_result, _ = ocr_engine(img_np)
            if ocr_result:
                for item in ocr_result:
                    if len(item) >= 2 and item[1]:
                        text_line = str(item[1]).strip()
                        if text_line:
                            extracted_lines.append(text_line)

        elif engine_type == "paddleocr":
            # PaddleOCR returns [[ [[x,y], ...], (text, score) ], ...]
            ocr_result = ocr_engine.ocr(img_np, cls=False)
            if ocr_result and isinstance(ocr_result, list):
                for page in ocr_result:
                    if not page:
                        continue
                    for item in page:
                        if len(item) >= 2 and isinstance(item[1], (tuple, list)):
                            text_line = str(item[1][0]).strip()
                            if text_line:
                                extracted_lines.append(text_line)

        full_text = "\n".join(extracted_lines).strip()
        logger.info(f"Local OCR extracted {len(extracted_lines)} lines ({len(full_text)} chars) via {engine_type}.")
        return full_text

    except Exception as e:
        logger.error(f"Local OCR failed on image bytes: {e}")
        return ""


def extract_text_from_scanned_pdf(file_bytes: bytes, max_pages: int = 6) -> str:
    """
    Renders pages of a scanned PDF into high-resolution images via PyMuPDF
    and extracts text from each page using PaddleOCR/RapidOCR.
    """
    if not file_bytes:
        return ""

    try:
        import pymupdf
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        page_texts = []

        pages_to_process = min(len(doc), max_pages)
        for page_num in range(pages_to_process):
            page = doc[page_num]
            # Render page at 150 DPI for crisp OCR character recognition
            pix = page.get_pixmap(dpi=150)
            page_png_bytes = pix.tobytes("png")
            page_text = extract_text_from_image(page_png_bytes)
            if page_text.strip():
                page_texts.append(page_text.strip())

        doc.close()
        return "\n\n".join(page_texts).strip()

    except Exception as e:
        logger.error(f"Scanned PDF OCR failed: {e}")
        return ""
