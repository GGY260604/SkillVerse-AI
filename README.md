# SkillVerse AI

> An intelligent workforce navigation and reskilling platform that forecasts skill trajectories, matches individuals to future-ready roles, and synthesizes personalized roadmaps aligned with UN Sustainable Development Goals.

---

## Team Information

| Field                  | Details                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| **Team Name**          | I Love You 3000                                                    |
| **Team Domain**        | Domain 1                                                           |
| **SDG Track (1–17)**   | SDG 4 — Quality Education (Supporting SDG 5, SDG 8, SDG 9, SDG 10) |
| **Team Leader**        | GUI GUANYU                                                         |
| **University**         | UNIVERSITI TEKNOLOGI MALAYSIA (UTM)                                |
| **Number of Members**  | 2                                                                  |

## Links

| Resource          | Link                                                              |
| ----------------- | ----------------------------------------------------------------- |
| GitHub Repository | https://github.com/njwongzhe/SkillVerse-AI                        |
| Replit Project    | https://replit.com/@ngjaawei/SDC-HACKATHON-2026                   |
| Live Demo         | https://www.skillverse-ai.site/                                   |
|                   | https://skill-verse-ai-git-main-ng-jaa-wei-s-projects.vercel.app/ |
| RunPod Endpoint   |                                                                   |
| Slide Deck        |                                                                   |
| Demo Video        |                                                                   |

---

## Overview

### Problem

Describe the real-world problem you are solving in 2–4 sentences. Who is affected, and why does it matter?

### Solution

Explain how your project uses AI to solve the problem and what makes it valuable.

### Key Features

- **Feature 1** — Short description.
- **Feature 2** — Short description.
- **Feature 3** — Short description.

### Tech Stack

| Layer         | Technology                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| Frontend      | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4                                        |
| Backend       | Next.js Route Handlers, Python (FastAPI microservice in `src/fastapi`)                               |
| Database      | Supabase (PostgreSQL 15 + `pgvector`), Prisma ORM                                                    |
| AI / Compute  | Google Gemini 1.5 Flash (OCR & Multimodal Synthesis), RunPod / Render (GPU with `bge-m3` Embeddings) |
| Hosting / Dev | Vercel, Replit, VSCode, Antigravity                                                                  |

---

## Project Structure

```
.
├── docs/                    # Screenshots, diagrams
├── runpod/
│   └── handler.py           # RunPod serverless handler (GPU workload)
├── src/
│   ├── main.py              # Application entry point
│   └── utils.py             # Helper functions
├── submission/              # Required submission documents
│   ├── SDC2026_TeamName_Preliminary.pdf      # Preliminary submission
│   ├── SDC2026_TeamName_TechDeclaration.pdf  # Technology declaration
│   ├── SDC2026_TeamName_Replit_POU.pdf       # Replit proof of use
│   └── SDC2026_TeamName_Runpod_POU.pdf       # RunPod proof of use
├── tests/
│   └── test_utils.py        # Unit tests
├── .env.example             # Example environment variables
├── .gitignore
├── .replit                  # Replit run configuration
├── LICENSE
├── requirements.txt         # Python dependencies
└── README.md
```

### Architecture

```
User ──► Replit / Vercel Web App (Next.js 16 App & Route Handlers)
                 │
                 ├──► Supabase (PostgreSQL + pgvector & Prisma ORM)
                 ├──► RunPod Endpoint (FastAPI + BAAI/bge-m3 GPU Inference + Google Gemini API (OCR & Pathway Synthesis))
                 └──► Render Endpoint (FastAPI + BAAI/bge-m3 GPU Inference + Google Gemini API (OCR & Pathway Synthesis))
```

---

## How to Run

### Option 1 — Run on Replit (Recommended)

1. Open the [Replit Project](https://replit.com/@your-username/your-project), or import this repository via **Create Repl → Import from GitHub**.
2. Open the **Secrets** tab (🔒) and add the variables listed in `.env.example`:
   - `RUNPOD_API_KEY`
   - `RUNPOD_ENDPOINT_ID`
3. Click **Run**. Replit uses the `.replit` file to start `python src/main.py`.

### Option 2 — Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/your-username/your-project.git
cd your-project

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env            # then fill in your values

# 5. Run the app
python src/main.py
```

### Run Tests

```bash
python -m unittest discover tests
```

---

## How We Use Replit *(Required)*

Describe how your team used Replit. For example:

- **Development:** Collaborative coding in a shared Repl using Multiplayer.
- **Hosting:** The app is deployed with Replit Deployments at the Live Demo link above.
- **Secrets:** API keys are stored in Replit Secrets, never in the code.

📄 Proof of use: [`submission/SDC2026_TeamName_Replit_POU.pdf`](submission/SDC2026_TeamName_Replit_POU.pdf)

## How We Use RunPod *(Required)*

Describe how your team used RunPod. For example:

- **Workload:** Model inference (e.g. text generation, image processing) runs on a RunPod GPU.
- **Setup:** `runpod/handler.py` is deployed as a **RunPod Serverless Endpoint**.
- **Integration:** The Replit app sends requests to the endpoint using `RUNPOD_API_KEY` and `RUNPOD_ENDPOINT_ID`.

Example request:

```bash
curl -X POST https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/runsync \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": {"prompt": "Hello"}}'
```

📄 Proof of use: [`submission/SDC2026_TeamName_Runpod_POU.pdf`](submission/SDC2026_TeamName_Runpod_POU.pdf)

---

## Challenges & Learnings

- What challenges did you face, and how did you overcome them?
- What did your team learn?

## Future Improvements

- [ ] Improvement 1
- [ ] Improvement 2

## Team

| Name        | Role                | GitHub                                     |
| ----------- | ------------------- | ------------------------------------------ |
| GUI GUANYU  | Team Lead / Backend | [@GGY260604](https://github.com/GGY260604) |
| NG JAA WEI  | Frontend            | [@njwongzhe](https://github.com/njwongzhe) |

---

## Submission Checklist

- [/] Team name, domain (Domain 1 / Domain 2) and SDG track filled in
- [ ] Slide deck link added
- [ ] Demo video link added
- [ ] Replit used, with proof of use in `submission/`
- [ ] RunPod used, with proof of use in `submission/`
- [ ] Preliminary submission completed (`SDC2026_TeamName_Preliminary.pdf`)
- [ ] Technology declaration completed (`SDC2026_TeamName_TechDeclaration.pdf`)
- [ ] Submission files renamed with your team name (replace `TeamName`)
- [ ] "How to Run" steps verified
- [ ] No API keys or secrets committed to the repository

## License

This project is licensed under the [Apache License 2.0](LICENSE).