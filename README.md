# SkillVerse AI: The Future-Ready Workforce & SDG Navigation Platform

**Domain 1:** The Aiversecity Future-Ready Workforce Domain[cite: 1]  
**Organiser:** Rotaract Club of Xiamen University Malaysia[cite: 1]  
**Domain Sponsor:** Aiversecity[cite: 2] | **Deployment Infrastructure:** Replit & RunPod[cite: 1]

---

## 1. Executive Summary & Problem Context

Artificial intelligence is transforming occupations faster than institutional curricula and training standards can adapt[cite: 3]. In Malaysia, 56% of professionals currently utilize AI tools in the workplace, yet only 26% have received formal training, according to the Hays Asia Salary Guide 2025[cite: 3]. Concurrently, the Ministry of Science, Technology and Innovation (MOSTI) estimates that over 600,000 workers will require substantial reskilling within the next three to five years[cite: 3].

**SkillVerse AI** is an intelligent workforce intelligence platform designed to bridge this divide[cite: 2, 3]. It continuously ingests dynamic labor market signals and technological shifts to forecast skill trajectories (emerging vs. declining), matches individuals from non-technical, vocational, and technical backgrounds to resilient future roles, synthesizes tailored reskilling roadmaps, and correlates every transition directly to the 17 UN Sustainable Development Goals (SDGs)[cite: 2, 3, 4]. Grounded in the principle that AI must partner with human workers rather than replace them, the platform guides users from "who I am today" to "where I can be in the AI era" in minutes[cite: 3, 4, 7].

### UN SDG Alignment
* **Main SDG:** **SDG 4 (Quality Education)**[cite: 2]
  * *Target 4.3:* Equal access to affordable and quality technical, vocational, and tertiary education[cite: 2].
  * *Target 4.4:* Substantially increase the number of youth and adults with relevant technical and vocational skills for decent employment[cite: 2].
* **Secondary Core SDGs:**
  * **SDG 5 (Gender Equality):** Elimination of algorithmic bias via demographic-blind parsing[cite: 2, 6].
  * **SDG 8 (Decent Work and Economic Growth):** Target 8.2 (higher levels of economic productivity through technological upgrading and innovation) and Target 8.5 (full and productive employment and decent work for all)[cite: 2].
  * **SDG 9 (Industry, Innovation and Infrastructure):** Fostering domestic innovation and technological capabilities[cite: 2].
  * **SDG 10 (Reduced Inequalities):** Democratizing access to career progression insights for at-risk and TVET demographics[cite: 2, 4].
* **Target Sectors:** Clean energy, healthcare, precision agriculture, and responsible AI systems[cite: 3].

---

## 2. Target Demographics

SkillVerse AI is designed to serve a broad range of workforce participants across operational, vocational, and knowledge-based domains[cite: 3, 4]:

* **Working Adults at Risk of Job Displacement:** Administrative assistants, customer support personnel, routine accountants, copywriters, and back-office staff experiencing automation pressures[cite: 4].
* **Fresh Graduates & Career Switchers:** Diploma and degree holders entering an AI-augmented job market and seeking future-proof career paths[cite: 4].
* **Corporate HR & L&D Managers:** People leaders auditing organization-wide skill deficits, designing internal mobility tracks, and planning HRD Corp-claimable reskilling initiatives[cite: 4, 5, 6].
* **TVET & University Career Guidance Centres:** Counselors and vocational advisors aligning student curricula with live market signals[cite: 4].

---

## 3. Product Architecture & System Features

### 3.1 Must-Have Core Features
1. **Multi-Modal Skills Profile Intake & Entity Normalization:**
   * Ingests skills, experience, and interests via PDF resume upload, photo/image CV scan (OCR), or an interactive structured questionnaire[cite: 4, 5].
   * Normalizes casual user statements (e.g., "fast typer and good at talking to clients in English") into canonical **ESCO / O*NET** taxonomy nodes ("English Language Communication", "Customer Conflict Management").
   * Provides a human-in-the-loop review interface allowing users to inspect, modify, add, or delete parsed competencies before analysis[cite: 4, 6, 7].
2. **AI-Trend Signal Layer (Dynamic & Dated):**
   * Continuously pulls live indicators from open labor registries, job boards, and academic repositories (e.g., ArXiv `cs.AI` RSS, RemoteOK/Adzuna feeds, OECD AI indicators)[cite: 5].
   * Explicitly attributes each trend indicator with its source name, URL, and capture timestamp, avoiding static hard-coded arrays[cite: 5, 7].
3. **Explainable Future-Role Matching & Skills-Gap Engine:**
   * Evaluates candidate skills against prospective roles in technology, green logistics, smart agriculture, and clean healthcare[cite: 3, 4, 5].
   * Generates a deterministic match percentage alongside an itemized inventory of **Matched Strengths**, **Skills to Acquire (Gap)**, and **At-Risk Competencies**[cite: 4, 5].
4. **Personalized Reskilling Pathway Generator:**
   * Synthesizes an ordered, multi-phase curriculum complete with estimated completion durations[cite: 4, 5].
   * Restricts suggested learning modules to real-world, free, or low-cost resources (Coursera, edX, freeCodeCamp) and **HRD Corp-claimable programs** in Malaysia[cite: 5, 6].
5. **Semantic UN SDG Mapping:**
   * Evaluates the semantic alignment of each target role and skill against official UN SDG targets, presenting an interactive sustainability footprint for the user's selected path[cite: 4, 5].
6. **Multi-Scenario Uncertainty Engine:**
   * Incorporates interactive macro scenarios (e.g., *Scenario 1: Moderate/Phased AI Integration* vs. *Scenario 2: Accelerated Autonomous AI Disruption* vs. *Scenario 3: Green & ESG Economy Priority*)[cite: 5].
   * Dynamically alters role demand weights to demonstrate that forecasts are adaptable estimates rather than rigid absolutes[cite: 5, 7].

### 3.2 Implemented Good-to-Have Features
* **Zero-Friction Anonymous Persistence & Automatic Re-Planning:** Maintains user state via browser `localStorage` UUID keys against Supabase, enabling automated roadmap recalculation when background trend data updates[cite: 6, 7].
* **Inclusive Multi-Language Support:** Comprehensive three-language localization spanning **English (`en`)**, **Bahasa Malaysia (`ms`)**, and **Chinese (`zh`)**[cite: 6].
* **Low-Bandwidth Mobile Optimization:** Lightweight DOM tree rendering under 120 KB, tailored for regional mobile connectivity[cite: 6].
* **Employer / HR Workforce Dashboard:** Company-level aggregation revealing team-wide skill gaps and cross-functional reskilling pathways[cite: 6].
* **Fairness & Bias Mitigations:** Strips personal identifiers (gender, age, ethnicity, full names) prior to embedding generation[cite: 6].
* **Learner Motivation System:** Tracks module progression with exportable achievement badges[cite: 6].

---

## 4. End-to-End Tech Stack

| Domain Layer | Technology Selected | Purpose & Architectural Justification |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router, TypeScript) | Server components, low-latency client rendering, deployed on Replit[cite: 1, 6]. |
| **Styling & Components** | Tailwind CSS + `shadcn/ui` | Fully accessible UI primitives, responsive modal drawers, and data tables[cite: 6]. |
| **Visualizations** | `Recharts` & `@xyflow/react` | Powers the Future Skills Radar and interactive node-based learning timeline[cite: 4, 5]. |
| **Localization (i18n)** | `next-intl` | Dynamic locale routing for English, Bahasa Malaysia, and Chinese[cite: 6]. |
| **Relational Database** | Supabase (PostgreSQL 15) | Manages anonymous sessions, trend signals, and cached course catalogs[cite: 5, 6]. |
| **Vector Engine** | Supabase `pgvector` | Indexes 13,000+ ESCO competencies and all 169 UN SDG target vectors[cite: 2, 5]. |
| **Automation Pipeline** | Supabase `pg_cron` + `pg_net` | Executes scheduled cron requests to ingest fresh job market and AI signals[cite: 5, 6]. |
| **GPU Inference Service** | FastAPI (Python 3.11) on RunPod | Executes open-source embedding models and document extraction on GPU compute[cite: 1]. |
| **Embedding Model** | `BAAI/bge-large-en-v1.5` | Generates 1024-dimensional semantic vectors for deterministic metric matching[cite: 7, 8]. |
| **Generative LLM Engine** | Google Gemini 1.5 Flash API | Fast vision OCR for image CVs and structured Pydantic JSON pathway synthesis[cite: 5, 6]. |

---

## 5. Mathematical & Algorithmic Methodology

### 5.1 Trend Velocity Calculation
Nightly scheduled cron routines extract terminology frequency from public labor databases and research feeds[cite: 5]. The signal velocity ($V_s$) for any given skill $s$ across current window $C_t$ and past window $C_{t-1}$ is defined as:

```text
V_s = (C_t - C_t-1) / max(C_t-1, 1)
```

* **Emerging Skill:** $V_s > +0.25$ (Demand multiplier $> 1.0$)
* **Stable Skill:** $-0.15 \le V_s \le +0.25$ (Demand multiplier $= 1.0$)
* **Declining Skill:** $V_s < -0.15$ (Demand multiplier $< 1.0$)

### 5.2 Deterministic Explainable Role Matching
To prevent black-box hallucinations, matching is computed via a transparent hybrid formula combining vector similarity and explicit set overlap[cite: 6, 7, 8]:

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
The official text definitions of all 169 UN SDG targets are converted into high-density vectors[cite: 2]. The alignment score for any occupational role $R$ against target $T_i$ is determined mathematically:

```text
SDG_Affinity(R, T_i) = (Vector_R • Vector_Ti) / (||Vector_R|| * ||Vector_Ti||)
```

This ensures that linkages to goals such as SDG 4, SDG 8, and SDG 9 reflect semantic overlap rather than static labels[cite: 2, 7].

---

## 6. User Interface Design & User Flow

```text
[Landing Page / Live Market Signals]
                 │
                 ├──► [Option 1: Upload CV (PDF / Image)]
                 └──► [Option 2: Plain-Text Manual Questionnaire]
                                 │
                                 ▼
         [Human-in-the-Loop Skill Verification Drawer]
                                 │
                                 ▼
                 [Future-Ready Dashboard Workspace]
                 ├── Top Bar: Scenario Selector (Moderate / Rapid AI / Green)
                 ├── Left Panel: Future Skills Radar (Recharts Spider Graph)
                 ├── Right Panel: Ranked Emerging Roles & Explicit Gaps
                 └── Bottom Panel: Step-by-Step Learning Pathway (React Flow)
```

### Screen Descriptions
* **View 1: Landing Page & Live Market Pulse:**
  * Displays regional workforce context, citing MOSTI projections and Hays Asia data[cite: 3].
  * Features a prominent **Live Trend Sync Badge** showing the latest ingestion timestamp and data sources (ArXiv `cs.AI`, RemoteOK)[cite: 5, 7].
  * Visualizes top macro emerging and declining capabilities on a public radar chart[cite: 4, 5].
  * Provides dual entry pathways: drag-and-drop document upload or an accessible guided form[cite: 4].
* **View 2: Human-in-the-Loop Verification Drawer:**
  * Presents extracted competencies grouped into Technical, Operational, and Transferable categories[cite: 4].
  * Displays interactive tag chips with delete (`×`) buttons and an autocomplete field for users to modify detected skills[cite: 6, 7].
* **View 3: The Future-Ready Workspace:**
  * **Interactive Scenario Toggle:** Radio control allowing users to switch between Moderate AI adoption, Rapid Disruption, and Green Focus, triggering dynamic re-ranking of role cards[cite: 5].
  * **Simulation Button:** Includes a "Simulate Market Shift" action allowing hackathon judges to verify real-time pathway re-planning[cite: 6, 7, 8].
  * **Role Detail Cards:** Highlights transparent match scores, missing skill requirements, and official UN SDG badges[cite: 4, 5].
  * **Interactive Milestone Timeline:** Renders learning steps partitioned into Foundation, Applied Tools, and Capstone Project modules, linking directly to verified Coursera, edX, or HRD Corp claimable programs[cite: 4, 5, 6].

---

## 7. Multi-Language & Internationalization (i18n)

The platform incorporates full interface and data localization via `next-intl` to support Malaysia's multilingual workforce[cite: 6]:

* **English (`en`):** Default working interface across all technical and operational dashboards[cite: 6].
* **Bahasa Malaysia (`ms`):** Comprehensive translations for TVET learners, public sector employees, and career switchers[cite: 4, 6].
* **Chinese (`zh`):** Complete localization covering navigation, intake forms, and curriculum guides[cite: 6].

### Multilingual Data Intake Handling
Users can submit resumes or describe their past experience in any of the three supported languages[cite: 6]. The extraction layer normalizes incoming terminology into standardized ESCO taxonomy identifiers while rendering the resulting dashboard, gap analysis, and reskilling steps in the user's chosen display language[cite: 5, 6].

---

## 8. Guardrails, Safety & Compliance

* **Synthetic Data Standard:** Adheres strictly to hackathon regulations by processing only public, open, or synthetic demonstration profiles[cite: 6].
* **PII Redaction:** The document intake pipeline automatically scrubs phone numbers, emails, identification numbers, and residential addresses prior to processing[cite: 6].
* **Anti-Hallucination RAG Verification:** Roles are strictly retrieved from our indexed ESCO/O*NET catalog, and course links are matched against a verified educational database to prevent invented certifications or dead URLs[cite: 6, 8].
* **Human-Centred Focus:** Acts as a decision-support advisory system, leaving career selection and skill confirmation under the user's direction[cite: 6, 7].

---

## 9. Project Structure

```text
skillverse-ai/
├── apps/
│   ├── web-replit/                     # Next.js 14 Frontend & Client API (Replit Node)
│   │   ├── messages/                   # i18n JSON files
│   │   │   ├── en.json                 # English locale dictionary
│   │   │   ├── ms.json                 # Bahasa Malaysia dictionary
│   │   │   └── zh.json                 # Chinese dictionary
│   │   ├── src/
│   │   │   ├── app/                    # Next.js App Router
│   │   │   │   └── [locale]/           # Dynamic localization wrapper
│   │   │   │       ├── page.tsx        # Landing Page & Intake
│   │   │   │       ├── dashboard/      # Radar, Matching, & Pathway View
│   │   │   │       └── hr-view/        # Team Heatmap View
│   │   │   ├── components/             # Reusable UI Blocks
│   │   │   │   ├── SkillsRadar.tsx     # Recharts Future Skills Radar
│   │   │   │   ├── PathwayFlow.tsx     # React Flow Learning Timeline
│   │   │   │   ├── SdgBadgeList.tsx    # UN SDG Target Visualizers
│   │   │   │   └── ScenarioToggle.tsx  # Uncertainty Scenario Selector
│   │   │   └── lib/                    # Supabase client, Math Helpers, Vector APIs
│   │   └── package.json
│   │
│   └── ml-runpod/                      # FastAPI GPU Processing Microservice (RunPod)
│       ├── main.py                     # /embed, /parse-cv, /normalize-skills
│       ├── model_loader.py             # HuggingFace BAAI/bge-large-en-v1.5 loader
│       ├── Dockerfile                  # CUDA 12.1 runtime image
│       └── requirements.txt
│
├── supabase/
│   ├── migrations/
│   │   ├── 01_vector_schema.sql        # pgvector extension, roles & taxonomy tables
│   │   └── 02_cron_jobs.sql            # pg_cron setup for daily RSS trend ingestion
│   └── seed/                           # Seed datasets for ESCO, SDGs, and verified courses
└── README.md
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
3. Deploy the container to a **RunPod GPU Pod** (NVIDIA RTX 3090 / A4000 or Serverless Endpoint)[cite: 1].
4. Note the exposed URL for integration (`RUNPOD_API_ENDPOINT`).

### 3. Web Application Deployment (Replit)
1. Clone or import the repository into **Replit** with root directory set to `apps/web-replit`[cite: 1].
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