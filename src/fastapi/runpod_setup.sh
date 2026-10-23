#!/bin/bash
# ==============================================================================
# SkillVerse AI - RunPod GPU One-Click Setup & Launcher
# ==============================================================================

set -e

echo "=== [1/4] Checking and installing dependencies ==="
cd "$(dirname "$0")"

# Pin exact compatible versions for PyTorch 2.x
pip install --no-cache-dir "sentence-transformers<3.5.0" "transformers<4.45.0,>=4.40.0" "huggingface-hub<1.0.0"
pip install --no-cache-dir -r requirements.txt

echo "=== [2/4] Pre-caching BAAI/bge-m3 on GPU ==="
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-m3')"

echo "=== [3/4] Terminating any stale uvicorn instances ==="
pkill -f uvicorn || true

echo "=== [4/4] Starting FastAPI in background on port 8000 ==="
nohup python -m uvicorn main:app --host 0.0.0.0 --port 8000 > uvicorn.log 2>&1 &

sleep 2
echo "=== FastAPI Service Status ==="
cat uvicorn.log
echo ""
echo "=== Done! Service is listening on port 8000 ==="
