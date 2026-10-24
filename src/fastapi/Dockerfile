FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (including libgomp1 for PyTorch / ONNX Runtime)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    ENABLE_LOCAL_BGE_M3=true \
    HF_HOME=/app/cache/huggingface \
    PORT=8000

# Copy dependency definition and install
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download BAAI/bge-m3 model weights into container image to eliminate runtime cold-start timeouts
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-m3')"

# Copy source code into app root (excluded .venv and cache via .dockerignore)
COPY . /app

# Expose port (default 8000)
EXPOSE 8000

# Container healthcheck monitoring endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/v1/health || exit 1

# Start Uvicorn ASGI server explicitly bound to 0.0.0.0:8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

