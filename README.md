# SkillVerse AI

> SkillVerse AI is an AI-powered workforce reskilling engine that bridges education and modern industry demands. It turns raw resumes into actionable, future-proof career plans with transparent skill gap analysis, interactive roadmaps and milestone quizzes.

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
| Live Demo         | • **Custom Domain:** https://www.skillverse-ai.site/<br>• **Vercel Mirror:** https://skill-verse-ai-gray.vercel.app/<br>• **Replit Mirror:** https://skill-verse-ai.replit.app |
| RunPod Endpoint   | https://g83nqi9mdolu2h-8000.proxy.runpod.net/                     |
| Slide Deck        | https://github.com/njwongzhe/SkillVerse-AI/blob/main/docs/Slide%20Deck/ |
| Demo Video        | • **Youtube Link:** https://youtu.be/s7jrfcFnFH4<br>• **Backup Drive Link:** https://tinyurl.com/42by65y2 |

---

## Overview

### Problem

Artificial intelligence is restructuring global employment faster than educational curricula can adapt. In Malaysia, the Hays Asia Salary Guide 2025 reveals that while 56% of professionals already utilize AI tools at work, only 26% have received structured institutional training. Concurrently, Malaysia's Ministry of Science, Technology and Innovation (MOSTI) projects that over 600,000 workers face displacement risks within 3 to 5 years, concentrated in clerical administration, customer triage and basic accounting. Current career advisory tools fail because they deliver static, one-time snapshots that become obsolete immediately, widening socioeconomic and gender divides.

### Solution

SkillVerse AI is an adaptive workforce intelligence platform engineered to transition vulnerable workers into high-value, AI-augmented roles. Profile intake (PDF, image scans or text questionnaires) passes through an automated PII-scrubbing engine to sanitize demographic variables in accordance with UN SDGs 5 and 10. Rather than relying on ungrounded LLM guessing, the system calculates career alignment through a deterministic hybrid formula:

$$\text{Match Score} = 0.60 \times \text{Macro Vector Proximity} + 0.40 \times \text{Micro Itemized Skill Overlap}$$

Anchored against European ESCO standards, the platform evaluates macro scenario shifts, dynamically tracks labor market skill velocities ($V_s$) and generates actionable 3-phase reskilling roadmaps linking open-access courses with Malaysian HRD Corp-claimable credentials.

### Key Features

- **AI-Trend Signal Layer (Live Market & Academic Telemetry)** — Aggregates real-time signals from ArXiv cs.AI abstracts and RemoteOK job feeds to track emerging skill velocity ($V_s$).
- **Skill Trend & Trajectory Diagnostics (Trend Velocity Vectoring)** — Computes Skill Trend Velocity ($V_s = \Delta\text{Market Demand} / \Delta t$) to uncover emerging niches, project 12-month trajectories, and evaluate commoditization risks.
- **Skills Profile Intake (Multi-Modal & Zero-Retention)** — Ingests resumes (PDF, images) or text questionnaires with automatic in-memory PII scrubbing and zero permanent data retention.
- **Future-Role Matching (Deterministic Dual-Track Engine)** — Evaluates career fit via a deterministic hybrid formula ($0.60 \times \text{Macro Vector Proximity} + 0.40 \times \text{Micro Skill Overlap}$) anchored on European ESCO taxonomy.
- **Personalised Reskilling Pathway (Dynamic 3-Phase Roadmaps)** — Generates structured 3-phase progression roadmaps with actionable milestones, open-access courses, HRD Corp credentials, and UN SDG alignments.
- **Handling Uncertainty (Dynamic Frontier Skill Expansion)** — Dynamically standardizes and vectorizes unindexed frontier skills (e.g., Agentic Workflows) in real-time, preventing taxonomy obsolescence.
- **Dynamic Replanning (Real-Time Trend Integration)** — Enables on-demand pathway recalculation driven by latest live market velocities ($V_s$) and telemetry feeds rather than static snapshots.
- **Interactive Milestone Quizzes & Gamified XP Leveling** — Validates phase competency with AI-generated quizzes, awarding Experience Points (XP) and level-ups to drive sustained learning momentum.
- **Plan Sharing & Collaborative Upskilling** — Allows secure sharing of personalized roadmaps with registered peers and mentors for collaborative benchmarking and feedback.
- **Deficit Heatmap (Canvas-Rendered Visual Analytics)** — Visualizes individual and team competency gaps using high-density Canvas heatmaps, complete with publication-ready PDF report export.
- **Multi-Language Accessibility (Trilingual Architecture)** — Full-platform native localization across English, Bahasa Melayu, and Simplified Chinese (中文) powered by next-intl.
- **Mobile-Friendly & Theme Customization (Dark / Light Mode)** — Responsive mobile-first interface with persistent Dark/Light mode toggling optimized for low-latency smartphones and tablets.
- **Fairness Checks (Demographic Neutrality & Bias Mitigation)** — Eliminates demographic markers (name, gender, age, location) prior to evaluation, ensuring strictly merit-based algorithmic neutrality (SDGs 5 & 10).
- **Data Transparency & User Autonomy Disclosure** — Grounded on verified data foundations (European ESCO, ArXiv, RemoteOK) with persistent source attribution and transparent user autonomy notices.

### Tech Stack

| Layer            | Technology                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Frontend         | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4                                                                    |
| Backend & ML     | Next.js Route Handlers, Python (FastAPI microservice in `src/fastapi`), PyTorch (`torch`), Hugging Face Transformers (`transformers`, `sentence-transformers`) |
| Database         | Supabase (PostgreSQL 15 + `pgvector`), Prisma ORM                                                                                |
| AI & ML Compute  | Google Gemini APIs (OCR & Multimodal Synthesis), PyTorch & Transformers on RunPod / Render GPU (`bge-m3` 1024-dim Embeddings)      |
| Hosting / Dev    | Vercel, Replit, VSCode, Antigravity                                                                                              |

---

## Project Structure

```
.
├── docs/                                # All documents related to the project.
│   ├── Simple Project Box Diagram.png   # System architecture diagram.
│   └── Slide Deck/                      # Slide deck of the project.
│       ├── Slide Deck.html              # HTML version of slide deck.
│       ├── Slide Deck.pdf               # PDF version of slide deck.
│       └── Slide Deck.pptx              # PowerPoint version of slide deck.
├── messages/                            # Internationalization dictionaries (next-intl).
│   ├── en.json                          # English translations.
│   ├── ms.json                          # Bahasa Melayu translations.
│   └── zh.json                          # Simplified Chinese translations.
├── prisma/                              # Database schema & migrations.
│   ├── schema.prisma                    # Prisma ORM schema with PostgreSQL + pgvector.
│   ├── migrations/                      # SQL migration history.
│   └── seed.sql                         # ESCO skills & taxonomy seed records.
├── public/                              # Static public assets, branding & icons.
├── src/                                 # All source code.
│   ├── app/                             # Next.js 16 App Router.
│   │   ├── [locale]/                    # Localized page routes (home, analysis, shared).
│   │   │   ├── error.tsx                # Error boundary.
│   │   │   ├── layout.tsx               # Layout.
│   │   │   ├── loading.tsx              # Loading state.
│   │   │   ├── not-found.tsx            # 404 Not Found page.
│   │   │   ├── page.tsx                 # Landing page & labor market telemetry.
│   │   │   ├── analysis/page.tsx        # Career analysis & reskilling dashboard.
│   │   │   └── shared/page.tsx          # Team competency heatmap & shared plans.
│   │   ├── api/                         # Next.js server route handlers.
│   │   ├   │── _lib/                    # Library functions for route handlers.
│   │   │   ├── analysis/                # Roadmap creation, update & verification APIs.
│   │   │   ├── auth/                    # User authentication & session endpoints.
│   │   │   ├── home/                    # Live labor market telemetry proxy.
│   │   │   ├── profile/                 # User profile management APIs.
│   │   │   └── shared/                  # Roadmap sharing & team matrix benchmarking.
│   │   ├── globals.css                  # Tailwind CSS v4 design tokens & theme layers.
│   │   ├── layout.tsx                   # Layout.
│   │   └── not-found.tsx                # 404 Not Found page.
│   ├── components/                      # Modular UI component tree.
│   │   ├── DarkLightSwitche.tsx         # Dark/Light mode switcher.
│   │   ├── Footer.tsx                   # Footer component.
│   │   ├── Header.tsx                   # Header component.
│   │   ├── LoadingSpinner.tsx           # Loading spinner component.
│   │   ├── Logo.tsx                     # Logo component.
│   │   ├── analysis/                    # Career roadmap cards, quizzes & flow details.
│   │   ├── auth/                        # Login, registration & user profile modals.
│   │   ├── home/                        # Labor market trends & trajectory charts.
│   │   └── shared/                      # Heatmap matrix visualization & PDF exporter.
│   ├── constants/                       # System configuration & platform constants.
│   ├── context/                         # Client-side React context providers (Auth, EXP, Theme).
│   ├── lib/                             # Core utilities (i18n, Supabase, PDF generation).
│   ├── middleware.ts                    # Routing middleware for next-intl & auth protection.
│   └── fastapi/                         # Python AI & GPU Microservice.
│       ├── .dockerignore                # Dockerignore file for .env protection.
│       ├── .env.example                 # Example environment variables template.
│       ├── config.py                    # 26-key circular Gemini rotation & env config.
│       ├── Dockerfile                   # Container build for GPU cloud deployment.
│       ├── main.py                      # FastAPI application entry point.
│       ├── README.md                    # FastAPI application documentation.
│       ├── requirements.txt             # Python dependencies (PyTorch, FastAPI, etc.).
│       ├── runpod_setup.sh              # RunPod serverless GPU environment initialization.
│       ├── routers/                     # API endpoints (analyze, extract, trends, quiz).
│       ├── schemas/                     # Pydantic validation schemas.
│       └── services/                    # Core AI & inference services.
├── submission/                          # Competition deliverables.
│   ├── SDC2026_TeamName_Preliminary.pdf      # Preliminary submission.
│   ├── SDC2026_TeamName_TechDeclaration.pdf  # Technology declaration.
│   ├── SDC2026_TeamName_Replit_POU.pdf       # Replit proof of use.
│   └── SDC2026_TeamName_Runpod_POU.pdf       # RunPod proof of use.
├── .dockerignore                        # Dockerignore file for .env protection.
├── .env.example                         # Example environment variables template.
├── .gitignore                           # Git ignore file.
├── eslint.config.mjs                    # ESLint configuration.
├── LICENSE                              # Project license.
├── next.config.ts                       # Next.js configuration.
├── package-lock.json                    # Node.js dependencies and run scripts.
├── package.json                         # Node.js dependencies and run scripts.
├── README.md                            # Comprehensive project documentation.
└── tsconfig.json                        # TypeScript compiler configuration.
```

### Architecture

```
User
 │
 ├──► Web Frontend (Dual-Hosted Client)
 │     ├── [Primary / Sponsor] Replit Web App
 │     └── [Edge Failover Mirror] Vercel Web App
 │
 └──► Next.js 16 Gateway & Route Handlers
       │
       ├──► 3-Tier Backend Compute Failover
       │     ├── [Tier 1 - Local] Local FastAPI Engine (localhost:8000)
       │     ├── [Tier 2 - Primary Cloud] RunPod GPU Endpoint (FastAPI + BAAI/bge-m3 Tensor Acceleration)
       │     └── [Tier 3 - Backup Cloud] Render Cloud Service (FastAPI Hot Standby Mirror)
       │
       ├──► Database & Semantic Vector Storage
       │     └── Supabase PostgreSQL 15 (pgvector HNSW Index + ESCO Taxonomies + Prisma ORM)
       │
       ├──► Zero-Budget LLM Engine (PII Stripping, Mentorship, Pathway Synthesis)
       │     └── Circular 26-Key Rotation Pool ──► 5-Model Gemini Waterfall
       │
       └──► Live Telemetry & Trend Ingestion
             ├── ArXiv API (cs.AI Research Velocity Calculation)
             └── RemoteOK API (Live Job Market Demand Signals)
```

![SkillVerse AI System Architecture & Pipeline](docs/Simple%20Project%20Box%20Diagram.png)

---

## How to Run

### Prerequisites

- **Node.js**: v20.x or higher (with `npm`)
- **Python**: 3.10 or higher (for local FastAPI inference engine)
- **Supabase**: Active PostgreSQL 15 instance with `pgvector` enabled
- **Google Gemini API Key**: At least one key for multimodal OCR & roadmap synthesis
- *(Optional)* **RunPod Endpoint**: Serverless GPU endpoint for offloaded `bge-m3` tensor acceleration

---

### Option 1 — Run on Replit (Recommended)

1. Open the [Replit Project](https://replit.com/@ngjaawei/SDC-HACKATHON-2026) or import the repository into your Replit workspace.
2. In the **Secrets** tab (🔒), configure the environment variables defined in `.env.example`:
   - `NEXT_PUBLIC_APP_URL`
   - `RUNPOD_API_ENDPOINT` *(points to the cloud GPU endpoint for tensor inference)*
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`, `DIRECT_URL`
3. Click **Run**. Replit installs dependencies and starts the Next.js web application.

---

### Option 2 — Run Locally

#### 1. Clone the Repository

```bash
git clone https://github.com/njwongzhe/SkillVerse-AI.git
cd SkillVerse-AI
```

#### 2. Configure Environment Variables

```bash
# 1. Root environment (for Next.js & Supabase)
cp .env.example .env

# 2. FastAPI microservice environment (for local Python backend)
cp src/fastapi/.env.example src/fastapi/.env
```
> Fill in your Supabase credentials, database URLs, and Gemini API key(s) in both `.env` files.

#### 3. Start Next.js Frontend (Terminal 1)

```bash
# Install Node.js dependencies
npm install

# Push database schema & generate Prisma client
npm run db:push
npm run db:generate

# (Optional) Seed initial ESCO taxonomy skills
npm run db:seed

# Launch Next.js development server
npm run dev
```
> The web interface will be available at [http://localhost:3000](http://localhost:3000).

#### 4. Start FastAPI AI Engine (Terminal 2)

*Note: If you configured `RUNPOD_API_ENDPOINT` or `RENDER_API_ENDPOINT` in root `.env`, Next.js will automatically route vector embedding and synthesis workloads to the cloud GPU endpoint. To run inference locally:*

```bash
cd src/fastapi

# Create and activate Python virtual environment
python -m venv .venv
# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On Linux / macOS:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8000
.\.venv\Scripts\python -m uvicorn main:app --reload --port 8000
```
> The FastAPI service and interactive Swagger documentation will be accessible at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### Run Tests

```bash
# There is no test in this project.
```

---

## How We Use Replit *(Required)*

In accordance with our official technology declaration, our team utilized the sponsor-provided Replit platform across three key phases:

- **Cloud Development & Configuration:** Used Replit as a collaborative cloud development environment to assist with workspace configuration and prototype API integration routines.
- **Frontend Hosting & Deployment:** Automated deployment routines via Replit Deployments to host the live interactive frontend prototype at [https://skill-verse-ai.replit.app](https://skill-verse-ai.replit.app) (mirrored with Vercel for high-availability dual-edge hosting).
- **Presentation Deck Generation:** Leveraged Replit AI tooling to scaffold, layout and render our hackathon slide deck.
- **Secrets Management:** Kept sensitive keys (database strings, API tokens) strictly managed via Replit Secrets.

📄 Proof of use: [`submission/SDC2026_ILoveYou3000_Replit_POU.pdf`](submission/SDC2026_ILoveYou3000_Replit_POU.pdf)

---

## How We Use RunPod *(Required)*

RunPod was deployed as our primary sponsor-provided cloud GPU acceleration platform for intensive NLP tensor workloads:

- **Workload:** Hosted high-throughput GPU Pod instances executing `BAAI/bge-m3` batch tensor calculations for dense vector matching.
- **Latency Acceleration:** Reduced candidate profile and European ESCO macro semantic matching latency from ~0.4s (CPU baseline) down to ~0.05s on GPU.
- **Endpoint Setup:** Deployed as a dedicated FastAPI inference microservice accessible via our authenticated proxy gateway:
  `[https://l4ljrq2b0cwesb-8000.proxy.runpod.net/](https://l4ljrq2b0cwesb-8000.proxy.runpod.net/)`
- **Resilient 3-Tier Failover:** While RunPod GPU compute substantially cuts vector latency, it is not a single point of failure. If RunPod becomes unavailable or hits credit exhaustion, our 3-tier gateway automatically routes requests to our Render cloud compute mirror or local PyTorch inference.

Example request:

```bash
curl -X POST https://l4ljrq2b0cwesb-8000.proxy.runpod.net/embed \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Machine learning engineer with PyTorch and NLP experience", "European ESCO Data Scientist standard"]}'
```

📄 Proof of use: [`submission/SDC2026_ILoveYou3000_Runpod_POU.pdf`](submission/SDC2026_ILoveYou3000_Runpod_POU.pdf)

---

## Challenges & Learnings

- What challenges did you face, and how did you overcome them?
  - **Zero-Budget & Rate Limits (HTTP 429):** Sustaining high-throughput CV parsing entirely on free-tier API quotas required engineering a 26-key circular rotation pool across a 5-tier Gemini model waterfall to eliminate rate limits without commercial costs.
  - **Eliminating AI Scoring Hallucinations:** Generative LLMs introduce bias and unpredictability in career evaluation, making purely generative scoring unreliable for high-stakes career navigation.
  - **Multi-Cloud Failover Coordination:** Orchestrating sub-second traffic routing and failover across five heterogeneous environments (Replit, Vercel, RunPod GPU, Render, and Supabase) without service interruption.
  - **Zero-Retention PII Scrubbing:** Ensuring complete demographic neutrality by sanitizing all personal identifiers in volatile memory before embedding or analysis without corrupting skill context.
  - **Taxonomy Obsolescence:** Overcoming the static multi-year update cycles of traditional databases (like ESCO) to capture fast-moving AI skills in real time.

- What did your team learn?
    - **Frugal Architecture Over Paid Hardware:** Software-level scheduling (26-key rotation and multi-tier model waterfalls) can fully resolve hardware and budget ceilings under zero-budget constraints.
    - **Deterministic Math Over Generative Guesswork:** Implementing a mathematical dual-track formula ($0.60 \times \text{Macro} + 0.40 \text{Micro}$) provides objective, explainable, and hallucination-free matching.
    - **Multi-Tier Redundancy:** Dual frontend hosting (Replit + Vercel) and 3-tier backend fallback (Local $\rightarrow$ RunPod GPU $\rightarrow$ Render) proved critical for production-grade resilience.
    - **Agentic Tool Specialization:** Assigning focused roles to AI tools (Antigravity for implementation/testing, Gemini for algorithms, Replit for deployment/slides, Copilot for completion) paired with mandatory human code audits ensures accountability.
    - **Ethical AI by Design:** Enforcing transient, demographic-neutral data ingestion from day one is essential to operationalize UN SDG equity and bias mitigation.

## Future Improvements

- [ ] **Live Open-Course & Micro-Credential Integration**: Partner directly with MOOC platforms (Coursera, edX, TVET Malaysia) to enable direct enrollment and real-time completion tracking directly inside the React Flow roadmap.
- [ ] **On-Chain / W3C Verifiable Credentials (VCs)**: Upgrade client-side PDF credential exports into cryptographic, tamper-proof W3C Verifiable Credentials or blockchain badges to facilitate trusted institutional verification.
- [ ] **Dynamic Enterprise Workforce Simulator**: Expand the permission-based deficit heatmap into an organizational "what-if" scenario simulator, forecasting talent surplus/deficits and calculating reskilling ROI for HR teams.
- [ ] **Edge-Native Inference via WebGPU / ONNX**: Migrate the lightweight tokenization and dense embedding stages to run locally on client devices via WebGPU/Wasm, reducing cloud compute dependencies and zeroing backend inference latency.
- [ ] **Autonomous Labor Telemetry Ingestion (Multi-Platform)**: Broaden real-time labor velocity signals ($V_s$) beyond ArXiv and RemoteOK to include GitHub trending repositories, LinkedIn economic graphs, and government TVET registries.

## Team

| Name        | Role                | GitHub                                     |
| ----------- | ------------------- | ------------------------------------------ |
| GUI GUANYU  | Team Lead / Backend | [@GGY260604](https://github.com/GGY260604) |
| NG JAA WEI  | Frontend            | [@njwongzhe](https://github.com/njwongzhe) |

---

## Submission Checklist

- [x] Team name, domain (Domain 1 / Domain 2) and SDG track filled in
- [x] Slide deck link added
- [x] Demo video link added
- [x] Replit used, with proof of use in `submission/`
- [x] RunPod used, with proof of use in `submission/`
- [x] Preliminary submission completed (`SDC2026_TeamName_Preliminary.pdf`)
- [x] Technology declaration completed (`SDC2026_TeamName_TechDeclaration.pdf`)
- [x] Submission files renamed with your team name (replace `TeamName`)
- [x] "How to Run" steps verified
- [x] No API keys or secrets committed to the repository

## License

This project is licensed under the [Apache License 2.0](LICENSE).