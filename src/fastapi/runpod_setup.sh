#!/bin/bash
# ==============================================================================
# SkillVerse AI - RunPod GPU One-Click Setup & Launcher
# ==============================================================================

set -e

echo "=== [1/4] Checking and installing dependencies ==="
cd "$(dirname "$0")"

# Install system libraries for OpenCV & RapidOCR if apt-get is available
if command -v apt-get &> /dev/null; then
    apt-get update -qq && apt-get install -y -qq libgl1 libglib2.0-0 > /dev/null 2>&1 || true
fi

pip install --no-cache-dir --upgrade pip
pip install --no-cache-dir -r requirements.txt

echo "=== [2/4] Pre-caching BAAI/bge-m3 and GLiNER on GPU ==="
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-m3')"
python -c "from gliner import GLiNER; GLiNER.from_pretrained('urchade/gliner_multi-v2.1')" || true

echo "=== [3/4] Terminating any stale uvicorn instances ==="
pkill -f uvicorn || true

echo "=== [4/4] Starting FastAPI in background on port 8000 ==="
nohup python -m uvicorn main:app --host 0.0.0.0 --port 8000 > uvicorn.log 2>&1 &

sleep 2
echo "=== FastAPI Service Status ==="
cat uvicorn.log
echo ""
echo "=== Done! Service is listening on port 8000 ==="
