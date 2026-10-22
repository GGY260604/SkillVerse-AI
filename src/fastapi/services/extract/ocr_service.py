import io
from PIL import Image
from fastapi import HTTPException


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

    mime_type = allowed_types.get(content_type.lower()) # Converts the content type to lowercase and gets the corresponding mime type
    if not mime_type:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{content_type}'. Supported: PNG, JPG, JPEG, WEBP.",
        )

    try:
        # Verify the image is valid and readable
        image = Image.open(io.BytesIO(file_bytes))
        image.verify()
        return file_bytes, mime_type
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Uploaded image is corrupted or invalid: {str(e)}",
        )
