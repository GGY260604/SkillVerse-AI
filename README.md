# SkillVerse AI: The Future-Ready Workforce & SDG Navigation Platform

**Domain 1:** The Aiversecity Future-Ready Workforce Domain  
**Organiser:** Rotaract Club of Xiamen University Malaysia  
**Domain Sponsor:** Aiversecity | **Deployment Infrastructure:** Replit & RunPod

---

## 1. Executive Summary & Problem Context

Artificial intelligence is transforming occupations faster than institutional curricula and training standards can adapt. In Malaysia, 56% of professionals currently utilize AI tools in the workplace, yet only 26% have received formal training, according to the Hays Asia Salary Guide 2025. Concurrently, the Ministry of Science, Technology and Innovation (MOSTI) estimates that over 600,000 workers will require substantial reskilling within the next three to five years.

**SkillVerse AI** is an intelligent workforce intelligence platform designed to bridge this divide. It continuously ingests dynamic labor market signals and technological shifts to forecast skill trajectories (emerging vs. declining), matches individuals from non-technical, vocational, and technical backgrounds to resilient future roles, synthesizes tailored reskilling roadmaps, and correlates every transition directly to the 17 UN Sustainable Development Goals (SDGs). Grounded in the principle that AI must partner with human workers rather than replace them, the platform guides users from "who I am today" to "where I can be in the AI era" in minutes.

### UN SDG Alignment
* **Main SDG:** **SDG 4 (Quality Education)**
  * *Target 4.3:* Equal access to affordable and quality technical, vocational, and tertiary education.
  * *Target 4.4:* Substantially increase the number of youth and adults with relevant technical and vocational skills for decent employment.
* **Secondary Core SDGs:**
  * **SDG 5 (Gender Equality):** Elimination of algorithmic bias via demographic-blind parsing.
  * **SDG 8 (Decent Work and Economic Growth):** Target 8.2 (higher levels of economic productivity through technological upgrading and innovation) and Target 8.5 (full and productive employment and decent work for all).
  * **SDG 9 (Industry, Innovation and Infrastructure):** Fostering domestic innovation and technological capabilities.
  * **SDG 10 (Reduced Inequalities):** Democratizing access to career progression insights for at-risk and TVET demographics.
* **Target Sectors:** Clean energy, healthcare, precision agriculture, and responsible AI systems.

---

## 2. Target Demographics

SkillVerse AI is designed to serve a broad range of workforce participants across operational, vocational, and knowledge-based domains:

* **Working Adults at Risk of Job Displacement:** Administrative assistants, customer support personnel, routine accountants, copywriters, and back-office staff experiencing automation pressures.
* **Fresh Graduates & Career Switchers:** Diploma and degree holders entering an AI-augmented job market and seeking future-proof career paths.
* **Corporate HR & L&D Managers:** People leaders auditing organization-wide skill deficits, designing internal mobility tracks, and planning HRD Corp-claimable reskilling initiatives.
* **TVET & University Career Guidance Centres:** Counselors and vocational advisors aligning student curricula with live market signals.

---

## 3. Product Architecture & System Features

### 3.1 Must-Have Core Features
1. **Multi-Modal Skills Profile Intake & Entity Normalization:**
   * Ingests skills, experience, and interests via PDF resume upload, photo/image CV scan (OCR), or an interactive structured questionnaire.
   * Normalizes casual user statements (e.g., "fast typer and good at talking to clients in English") into canonical **ESCO / O*NET** taxonomy nodes ("English Language Communication", "Customer Conflict Management").
   * Provides a human-in-the-loop review interface allowing users to inspect, modify, add, or delete parsed competencies before analysis.
2. **AI-Trend Signal Layer (Dynamic & Dated):**
   * Continuously pulls live indicators from open labor registries, job boards, and academic repositories (e.g., ArXiv `cs.AI` RSS, RemoteOK/Adzuna feeds, OECD AI indicators).
   * Explicitly attributes each trend indicator with its source name, URL, and capture timestamp, avoiding static hard-coded arrays.
3. **Explainable Future-Role Matching & Skills-Gap Engine:**
   * Evaluates candidate skills against prospective roles in technology, green logistics, smart agriculture, and clean healthcare.
   * Generates a deterministic match percentage alongside an itemized inventory of **Matched Strengths**, **Skills to Acquire (Gap)**, and **At-Risk Competencies**.
4. **Personalized Reskilling Pathway Generator:**
   * Synthesizes an ordered, multi-phase curriculum complete with estimated completion durations.
   * Restricts suggested learning modules to real-world, free, or low-cost resources (Coursera, edX, freeCodeCamp) and **HRD Corp-claimable programs** in Malaysia.
5. **Semantic UN SDG Mapping:**
   * Evaluates the semantic alignment of each target role and skill against official UN SDG targets, presenting an interactive sustainability footprint for the user's selected path.
6. **Multi-Scenario Uncertainty Engine:**
   * Incorporates interactive macro scenarios (e.g., *Scenario 1: Moderate/Phased AI Integration* vs. *Scenario 2: Accelerated Autonomous AI Disruption* vs. *Scenario 3: Green & ESG Economy Priority*).
   * Dynamically alters role demand weights to demonstrate that forecasts are adaptable estimates rather than rigid absolutes.

### 3.2 Implemented Good-to-Have Features
* **Zero-Friction Anonymous Persistence & Automatic Re-Planning:** Maintains user state via browser `localStorage` UUID keys against Supabase, enabling automated roadmap recalculation when background trend data updates.
* **Inclusive Multi-Language Support:** Comprehensive three-language localization spanning **English (`en`)**, **Bahasa Malaysia (`ms`)**, and **Chinese (`zh`)**.
* **Low-Bandwidth Mobile Optimization:** Lightweight DOM tree rendering under 120 KB, tailored for regional mobile connectivity.
* **Employer / HR Workforce Dashboard:** Company-level aggregation revealing team-wide skill gaps and cross-functional reskilling pathways.
* **Fairness & Bias Mitigations:** Strips personal identifiers (gender, age, ethnicity, full names) prior to embedding generation.
* **Learner Motivation System:** Tracks module progression with exportable achievement badges.

---

## 4. End-to-End Tech Stack

| Domain Layer | Technology Selected | Purpose & Architectural Justification |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router, TypeScript) | Server components, low-latency client rendering, deployed on Replit. |
| **Styling & Components** | Tailwind CSS + `shadcn/ui` | Fully accessible UI primitives, responsive modal drawers, and data tables. |
| **Visualizations** | `Recharts` & `@xyflow/react` | Powers the Future Skills Radar and interactive node-based learning timeline. |
| **Localization (i18n)** | `next-intl` | Dynamic locale routing for English, Bahasa Malaysia, and Chinese. |
| **Relational Database** | Supabase (PostgreSQL 15) | Manages anonymous sessions, trend signals, and cached course catalogs. |
| **Vector Engine** | Supabase `pgvector` | Indexes 13,000+ ESCO competencies and all 169 UN SDG target vectors. |
| **Automation Pipeline** | Supabase `pg_cron` + `pg_net` | Executes scheduled cron requests to ingest fresh job market and AI signals. |
| **GPU Inference Service** | FastAPI (Python 3.11) on RunPod | Executes open-source embedding models and document extraction on GPU compute. |
| **Embedding Model** | `BAAI/bge-m3` | Multi-lingual (EN/MS/ZH) dense & sparse 1024-dimensional semantic vectors for cross-lingual metric matching. |
| **Generative LLM Engine** | Google Gemini 1.5 Flash API | Fast vision OCR for image CVs and structured Pydantic JSON pathway synthesis. |

---

## 5. Mathematical & Algorithmic Methodology

### 5.1 Trend Velocity Calculation
Nightly scheduled cron routines extract terminology frequency from public labor databases and research feeds. The signal velocity ($V_s$) for any given skill $s$ across current window $C_t$ and past window $C_{t-1}$ is defined as:

```text
V_s = (C_t - C_t-1) / max(C_t-1, 1)
```

* **Emerging Skill:** $V_s > +0.25$ (Demand multiplier $> 1.0$)
* **Stable Skill:** $-0.15 \le V_s \le +0.25$ (Demand multiplier $= 1.0$)
* **Declining Skill:** $V_s < -0.15$ (Demand multiplier $< 1.0$)

### 5.2 Deterministic Explainable Role Matching
To prevent black-box hallucinations, matching is computed via a transparent hybrid formula combining vector similarity and explicit set overlap:

```text
BaseMatch = 0.60 * CosineSimilarity(Vector_User, Vector_Role) + 0.40 * (|Skills_User ∩ Skills_Role| / |Skills_Role|)
```

```text
FinalScore = Clip(BaseMatch * ScenarioMultiplier, 0.0, 1.0)
```

```text
SkillsGap = Skills_Role \ Skills_User
```

### 5.3 Objective UN SDG Target Mapping
The official text definitions of all 169 UN SDG targets are converted into high-density vectors. The alignment score for any occupational role $R$ against target $T_i$ is determined mathematically:

```text
SDG_Affinity(R, T_i) = (Vector_R • Vector_Ti) / (||Vector_R|| * ||Vector_Ti||)
```

This ensures that linkages to goals such as SDG 4, SDG 8, and SDG 9 reflect semantic overlap rather than static labels.

---

## 6. User Interface Design & User Flow

```text
[Home Page / Live Market Pulse] (Select Language: zh / ms / en)
       │
       ├──► [Login / Sign Up Overlay Modal] ──► [User Authenticated Session]
       ├──► [Profile Overlay Modal] (Account settings, credentials, preferences)
       │
       ├──► [Input Profile: CV Upload (PDF/Image) or Guided Questionnaire]
       │         │
       │         ▼
       │    [AI-Powered Intelligent Processing Pipeline]
       │         │
       │         ├─► [Step 1: Multilingual Multimodal Parsing (Gemini 1.5 Flash)]
       │         │     * OCR recognition & PII redaction across zh / ms / en.
       │         │     * Extracts unstructured data into standardized JSON structures.
       │         │         │
       │         │         ▼
       │         ├─► [Step 2: Cross-Lingual Vector Alignment (bge-m3 + Supabase pgvector)]
       │         │     * Converts skills into 1024-dim vectors via RunPod GPU.
       │         │     * Aligns arbitrary languages to global ESCO/O*NET taxonomy.
       │         │         │
       │         │         ▼
       │         ├─► [Step 3: Deterministic Matching & Gap Calculation (Explainable Engine)]
       │         │     * Merges dynamic trend signals (ArXiv/Job feeds) & macro scenarios.
       │         │     * Computes match scores, matched strengths, and skills gaps.
       │         │         │
       │         │         ▼
       │         └─► [Step 4: Trilingual Solution Synthesis (Gemini 1.5 Flash)]
       │               * Synthesizes phased pathways & local compliant courses (HRD Corp).
       │               * Generates simultaneous trilingual outputs (zh, ms, en).
       │         │
       │         ▼
       │    [Human-in-the-Loop Skill Verification] (User inspects & confirms parsed skills)
       │         │
       │         ▼
       ├──► [Analysis Page (After Login)]
       │    ├── Current Plan: Live Skill Match, Future Skills Radar, & Dynamic Pathway (React Flow)
       │    └── History Plan: Saved analyses, previous career roadmaps, and progress tracking
       │
       └──► [Shared Page (After Login)]
            └── Plan Shared by Other People to You: Read-only & collaborative roadmaps shared by peers/mentors
```

### Screen Descriptions & Overlay Windows
- **Screen View 1: Home Page -> Live Market Pulse**
  * Displays regional workforce context, citing MOSTI projections and Hays Asia data.
  * Features a prominent **Live Trend Sync Badge** showing the latest ingestion timestamp and live data sources (ArXiv `cs.AI`, RemoteOK).
  * Visualizes top macro emerging and declining capabilities on a public radar chart.
  * Includes a **Language Switcher (`en` / `ms` / `zh`)** powered by `next-intl` for seamless interface localization.
  * Provides quick-access entry pathways: drag-and-drop document upload (PDF/image CV scan) or an accessible guided form.
- **Screen View 2: Analysis Page (After Login) -> Current Plan / History Plan**
  * **Current Plan:**
    * **Interactive Scenario Toggle:** Switch between Moderate AI adoption, Rapid Disruption, and Green Focus, triggering dynamic re-ranking of role cards.
    * **Simulation & Shift Actions:** Instant pathway re-planning based on market shifts and updated demand vectors.
    * **Visualizations & Role Cards:** Future Skills Radar (`Recharts`), transparent match scores, skill gap breakdowns, and UN SDG alignment badges.
    * **Interactive Milestone Timeline:** Step-by-step learning modules (Foundation, Applied Tools, Capstone) with links to verified Coursera, edX, or HRD Corp claimable programs.
  * **History Plan:**
    * Archives past assessments and career pathways, enabling users to review historical skill baselines, compare trajectory changes over time, and revisit previous milestones.
- **Screen View 3: Shared Page (After Login) -> Plan Shared by Other People to You**
    * Displays career reskilling roadmaps and learning trajectories shared with the user by peers, mentors, team leads, or HR managers.
    * Allows reviewing shared milestones, comparing skill sets, and tracking collaborative learning pathways with fine-grained access permissions.
- **Overlay Windows:**
  * **Login / Sign Up Overlay Window:** Accessible modal dialog supporting credential authentication and OAuth login, allowing seamless transition from anonymous exploration to authenticated cloud persistence.
  * **Profile Overlay Window:** Modal drawer for managing user profile details, language preferences, notification settings, and exported achievement badges.
  * **User Upload & Input Overlay Window:** Dedicated interactive modal triggered from the homepage entry, supporting **multimodal ingestion** (drag-and-drop PDF/image CV upload with client-side format validation, or an interactive multi-step guided questionnaire). It includes automatic PII pre-scrubbing notices and language auto-detection (`en`, `ms`, `zh`).
  * **AI Processing & Analysis Overlay Window:** A modal loading dialog triggered instantly when a user submits the upload form or resume. It displays live, step-by-step progress feedback reflecting the backend pipeline (**Step 1:** Multimodal OCR parsing via Gemini 1.5 Flash -> **Step 2:** Cross-lingual vector alignment via `bge-m3` & Supabase `pgvector` -> **Step 3:** Gap analysis & trilingual pathway synthesis) before redirecting the user to the Analysis Page with **human-in-the-loop skill verification** (allowing users to inspect, edit, or confirm parsed competencies).

---

## 7. Multi-Language & Internationalization (i18n)

The platform incorporates full interface and data localization via `next-intl` to support Malaysia's multilingual workforce:

* **English (`en`):** Default working interface across all technical and operational dashboards.
* **Bahasa Malaysia (`ms`):** Comprehensive translations for TVET learners, public sector employees, and career switchers.
* **Chinese (`zh`):** Complete localization covering navigation, intake forms, and curriculum guides.

### Multilingual Data Intake Handling
Users can submit resumes or describe their past experience in any of the three supported languages. The extraction layer normalizes incoming terminology into standardized ESCO taxonomy identifiers while rendering the resulting dashboard, gap analysis, and reskilling steps in the user's chosen display language.

---

## 8. Guardrails, Safety & Compliance

* **Synthetic Data Standard:** Adheres strictly to hackathon regulations by processing only public, open, or synthetic demonstration profiles.
* **PII Redaction:** The document intake pipeline automatically scrubs phone numbers, emails, identification numbers, and residential addresses prior to processing.
* **Anti-Hallucination RAG Verification:** Roles are strictly retrieved from our indexed ESCO/O*NET catalog, and course links are matched against a verified educational database to prevent invented certifications or dead URLs.
* **Human-Centred Focus:** Acts as a decision-support advisory system, leaving career selection and skill confirmation under the user's direction.

---

## 9. Project Structure

```text
SDC-HACKATHON-2026/
├── .env
├── .env.example
├── .gitignore
├── eslint.config.mjs
├── LICENSE
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.json
├── messages/
│   ├── en.json
│   ├── ms.json
│   └── zh.json
├── prisma/
├── public/
├── src/
│   ├── middleware.ts
│   ├── i18n/
│   │   ├── routing.ts
│   │   └── request.ts
│   ├── app/
│   │   ├── api/
│   │   └── [locale]/
│   │       ├── favicon.ico
│   │       ├── globals.css
│   │       ├── layout.tsx
│   │       ├── loading.tsx
│   │       ├── not-found.tsx
│   │       ├── error.tsx
│   │       ├── page.tsx
│   │       ├── analysis/
│   │       │   └── page.tsx
│   │       └── shared/
│   │           └── page.tsx
│   ├── components/
│   ├── constants/
│   ├── fastapi/
│   │   ├── main.py
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   ├── routers/
│   │   │   └── v1/
│   │   ├── schemas/
│   │   └── services/
│   └── lib/
└── submission/
```

---

## 10. Local Setup & Deployment Guide

### Prerequisites
* Node.js v18.17+ or v20+
* Python 3.11+
* Docker (for RunPod GPU containerization)
* Supabase Account with `pgvector` enabled

### 1. Database Configuration (Supabase)
1. Initialize a new project on Supabase.
2. Navigate to the SQL Editor and run `supabase/migrations/01_vector_schema.sql` to initialize `pgvector` and the necessary data schemas.
3. Run `supabase/migrations/02_cron_jobs.sql` to activate the automated signal collection cron jobs.
4. Populate the base catalog via:
   ```bash
   npm run db:seed
   ```

### 2. GPU Microservice Deployment (RunPod)
1. Navigate to `/apps/ml-runpod`.
2. Build and publish the Docker container to your container registry:
   ```bash
   docker build -t your-registry/skillverse-ml:latest .
   docker push your-registry/skillverse-ml:latest
   ```
3. Deploy the container to a **RunPod GPU Pod** (NVIDIA RTX 3090 / A4000 or Serverless Endpoint).
4. Note the exposed URL for integration (`RUNPOD_API_ENDPOINT`).

### 3. Web Application Deployment (Replit)
1. Clone or import the repository into **Replit** with root directory set to `apps/web-replit`.
2. Add the following environment keys under Replit Secrets:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GEMINI_API_KEY=your_google_gemini_flash_key
   RUNPOD_API_ENDPOINT=[https://your-runpod-pod-id.runpod.net](https://your-runpod-pod-id.runpod.net)
   CRON_SECRET=your_scheduled_webhook_secret
   ```
3. Install dependencies and start the production build:
   ```bash
   npm install
   npm run build
   npm run start
   ```