Ensure your current directory is under "fastapi" ("fastapi" directory as the root of the project)

# 1. Create a virtual environment for first time setup
python -m venv .venv
# 2. Activate the virtual environment
.\.venv\Scripts\Activate.ps1
# 3. Install the FastAPI requirements into .venv
pip install -r requirements.txt
# 4. Run the FastAPI server (from src/fastapi directory)
.\.venv\Scripts\python -m uvicorn main:app --reload --port 8000

python 3.14.3 above
check through python --version

