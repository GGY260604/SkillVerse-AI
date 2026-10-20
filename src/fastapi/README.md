# 1. Activate the virtual environment
.\.venv\Scripts\Activate.ps1
# 2. Install the FastAPI requirements into .venv
pip install -r src/fastapi/requirements.txt
# 3. Run the FastAPI server
.\.venv\Scripts\python -m uvicorn src.fastapi.main:app --reload --port 8000
