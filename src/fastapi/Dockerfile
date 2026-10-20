FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV ENABLE_LOCAL_BGE_M3=true

# Copy dependency definition and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code into package structure
COPY . /app/src/fastapi

# Expose port (default 8000)
EXPOSE 8000

# Start Uvicorn ASGI server with full module path
CMD ["python", "-m", "uvicorn", "src.fastapi.main:app", "--host", "0.0.0.0", "--port", "8000"]

