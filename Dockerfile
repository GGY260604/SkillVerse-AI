FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (including libgomp1, libgl1, libglib2.0-0 for OpenCV / PaddleOCR / PyTorch)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    ENABLE_LOCAL_BGE_M3=true \
    ENABLE_LOCAL_GLINER=true \
    HF_HOME=/app/cache/huggingface \
    PORT=8000

# Copy dependency definition and install
COPY src/fastapi/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download BAAI/bge-m3 and GLiNER model weights into container image to eliminate runtime cold-start timeouts
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-m3')"
RUN python -c "from gliner import GLiNER; GLiNER.from_pretrained('urchade/gliner_multi-v2.1')"

# Copy FastAPI application source code into app root
COPY src/fastapi /app

# Expose port (default 8000)
EXPOSE 8000

# Container healthcheck monitoring endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:${PORT}/ping || exit 1

# Start Uvicorn ASGI server explicitly bound to 0.0.0.0:8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
