# SkillVerse AI — Extended AI Computing Engines & Microservices Specification

**Document Version:** 1.0.0  
**Project:** SkillVerse AI (SDC-HACKATHON-2026 — Domain 1)  
**Status:** Approved for Implementation  

---

## 1. Executive Summary & Purpose

While the **Profile Intake** and **Analysis Engine** handle user entry and baseline role matching, SkillVerse AI incorporates **five specialized AI microservices** to make the platform dynamic, continuously adaptive, collaboratively engaging, and verifiable.

These microservices distribute computational tasks across:
1. **Google Gemini 1.5 Flash API:** Multilingual generative reasoning, vision OCR validation, contextual tutoring, and JSON curriculum synthesis.
2. **FastAPI GPU Service on RunPod (`BAAI/bge-m3`):** High-throughput 1024-dimensional cross-lingual embedding generation and vector clustering.
3. **Supabase Vector Engine (`pgvector` + `pg_cron`):** Vector search, scheduled background ingestion, and automated trend drift detection.

---

## 2. Global AI Infrastructure Topology

```mermaid
flowchart TD
    subgraph Data_Sources [Live Market & Academic Signals]
        ArXiv[ArXiv cs.AI RSS Feed]
        JobBoards[RemoteOK / Adzuna Job Feeds]
        OECD[OECD AI Labor Indicators]
    end

    subgraph Scheduled_AI [1. Dynamic Trend Engine]
        Cron[Supabase pg_cron + pg_net]
        BatchExtract[Gemini 1.5 Flash: Term Extraction & Sentiment]
        ClusterEngine[RunPod bge-m3: Vector Clustering & Trend Velocity]
        CatalogUpdate[(Supabase: trend_signals & emerging_skills)]
    end

    subgraph Reactive_AI [2. Drift Detection & Re-Planning Engine]
        DriftDetector[Market Shift Monitor]
        AdvisorGen[Gemini 1.5 Flash: Shift Advisory & Course Swap]
    end

    subgraph Interactive_AI [3. In-Roadmap Learning Mentor]
        RoadmapDrawer[React Flow Milestone Node Drawer]
        ContextMentor[Gemini 1.5 Flash: Contextual Tutor & Practice Prompts]
    end

    subgraph Collaborative_AI [4. Shared Synergy Engine]
        SharedPage[/[locale]/shared Dashboard]
        DeltaVector[bge-m3 Cross-Profile Vector Delta]
        SynergyGen[Gemini 1.5 Flash: Peer Synergy & Mentorship Guide]
    end

    subgraph Verification_AI [5. Proof & Credential Engine]
        CertUpload[Certificate / Project Screenshot Upload]
        VisionOCR[Gemini 1.5 Flash Vision OCR & Competency Verifier]
        BadgeGen[Dynamic SDG Micro-Credential Synthesizer]
    end

    %% Data flow connections
    Data_Sources --> Cron
    Cron --> BatchExtract
    BatchExtract --> ClusterEngine
    ClusterEngine --> CatalogUpdate

    CatalogUpdate --> DriftDetector
    DriftDetector --> AdvisorGen

    RoadmapDrawer --> ContextMentor
    SharedPage --> DeltaVector
    DeltaVector --> SynergyGen

    CertUpload --> VisionOCR
    VisionOCR --> BadgeGen
```

---

## 3. Detailed Specifications for the 5 AI Engines

---

### Module 1: Dynamic Market Signal Layer & Trend Ingestion Engine
*Runs asynchronously in the background to prevent static, hardcoded skills databases.*

* **Trigger:** Nightly automated cron job (`Supabase pg_cron` calling `/api/cron/sync-trends`).
* **Input:** Raw unformatted RSS items from ArXiv (`cs.AI`), job description dumps from Adzuna / RemoteOK, and OECD policy indices.
* **AI Computing Pipeline:**
  1. **Gemini 1.5 Flash (Batch Extraction):** Receives 30–50 raw job/abstract snippets per batch.
     * Identifies technical terminology and methodologies.
     * Classifies context: Is the technology *emerging*, *stable*, or *being phased out*?
  2. **RunPod GPU (`BAAI/bge-m3`):** Converts novel terms into 1024-dim dense vectors.
  3. **Trend Velocity ($V_s$) Update:** Computes signal velocity across 30-day windows:
     $$V_s = \frac{C_t - C_{t-1}}{\max(C_{t-1}, 1)}$$
  4. **Database Persistence:** Inserts newly discovered competencies into `custom_emerging_skills` and updates velocity multipliers in `trend_signals`.

---

### Module 2: Autonomous Roadmap Re-Planning Engine ("Market Drift Alert")
*Continuously verifies that user career pathways do not become obsolete.*

* **Trigger:** 
  1. Triggered in background when a target role's required skills experience a major trend shift ($\Delta V_s \ge 0.30$).
  2. Triggered client-side when a user logs back in after >14 days of inactivity.
* **AI Computing Pipeline:**
  1. **Vector Drift Evaluation:** Calculates the cosine distance between the skills in the user's stored roadmap and the updated live market vectors for their target role.
  2. **Adaptive Course Replacement:** If a module covers an obsolete tool, Gemini 1.5 Flash queries the verified course catalog and swaps it with an active, trending alternative (prioritizing HRD Corp-claimable programs in Malaysia).
  3. **"AI Shift Advisory" Synthesis:** Generates a human-friendly notification:
     > *"💡 Market Alert: Demand for Tool A surged by +42% in Malaysia over the past month. We have automatically updated Phase 2 of your roadmap to include an HRD Corp certified module on Tool A."*

---

### Module 3: In-Roadmap Contextual Learning Mentor ("Ask AI Mentor")
*Embedded directly in the interactive React Flow roadmap drawer on `/[locale]/analysis`.*

* **The Problem:** Non-technical or at-risk workers often struggle to connect abstract syllabus topics (e.g. *"Data Pipelines with Python"*) to their past work experience.
* **AI Computing Pipeline (Gemini 1.5 Flash Streaming):**
  1. **Background Bridging:** Ingests the user's past job context (e.g., *5 years as an inventory clerk*) and the active course module, explaining how the concepts directly relate:
     * *Example Output:* *"Think of Python Pandas DataFrames as Excel sheets that can update themselves automatically every midnight without you copying and pasting inventory numbers."*
  2. **Personalized Practice Prompts:** Generates 2–3 bite-sized mini-scenarios customized to the user’s exact industry baseline.
  3. **SDG Purpose Alignment:** Explains how mastering this specific module directly contributes to UN SDG 8 (Decent Work) and SDG 9 (Innovation).

---

### Module 4: Shared Page: Peer-to-Peer & Mentor Skill Synergy Engine
*Powers collaborative learning and mentorship on `/[locale]/shared`.*

* **The Problem:** Simply displaying a static copy of another user's roadmap provides little collaborative value.
* **AI Computing Pipeline:**
  1. **Cross-Profile Vector Delta (`bge-m3` on RunPod):**
     * Computes the semantic distance between the viewer’s skill vector ($V_{\text{viewer}}$) and the shared roadmap owner’s vector ($V_{\text{owner}}$).
  2. **Gemini 1.5 Flash Synergy Generation:**
     * **Complementary Strengths:** Identifies where the two individuals complement each other (e.g., *"User A has high customer conflict skills; User B has strong analytical tools. Recommend pair-learning on Capstone Milestone 3"*).
     * **Mentor Action Guide:** If the viewer is in "Mentor / Lead" mode, generates a tailored mentorship checklist highlighting potential learning roadblocks for the mentee.

---

### Module 5: Milestone Proof Verification & Achievement Credentialing
*Powers the Learner Motivation System and verified skill badges.*

* **Trigger:** User completes a roadmap module and uploads proof (e.g., Coursera/edX completion PDF, Malaysian HRD Corp training certificate photo, or a GitHub repo link).
* **AI Computing Pipeline:**
  1. **Gemini 1.5 Flash Vision OCR:**
     * Ingests the image/PDF scan.
     * Verifies that the recipient name matches the session, and extracts course name, issuing provider, and completion date.
     * Confirms that the syllabus matches the competencies declared in that roadmap milestone.
  2. **Dynamic Micro-Credential Badge Synthesis:**
     * Generates an exportable achievement object with verifiable JSON-LD metadata.
     * Badges include UN SDG target tags (e.g., *"SDG 4.4 & 9.4 Certified: Applied Machine Learning Specialist"*).
     * Provides ready-to-share export snippets for LinkedIn and corporate HR audits.

---

## 4. Architectural Summary Matrix

| Engine Module | AI Model & Compute Location | Input Trigger | Primary Output / Deliverable | SDG Alignment |
| :--- | :--- | :--- | :--- | :--- |
| **1. Dynamic Signal Ingestion** | Gemini 1.5 Flash + RunPod `bge-m3` | Nightly cron (`pg_cron`) | Live Trend Velocities ($V_s$) & new emerging skills catalog | **SDG 8 & 9** |
| **2. Drift & Re-Planning** | Supabase `pgvector` + Gemini 1.5 Flash | Market shift ($\Delta V_s \ge 0.30$) or user login | Updated milestone courses + AI Shift Advisory banner | **SDG 4 & 8** |
| **3. In-Roadmap Mentor** | Gemini 1.5 Flash (Streaming) | User clicks "Ask AI Mentor" in React Flow node | Contextualized analogies, mini-quizzes, and study tips | **SDG 4** |
| **4. Peer Synergy Engine** | RunPod `bge-m3` + Gemini 1.5 Flash | User views a shared plan at `/[locale]/shared` | Complementary skill matrix & mentor discussion points | **SDG 8 & 10** |
| **5. Proof & Credentialing** | Gemini 1.5 Flash Vision | User uploads completion certificate / project link | Verified competency status + exportable SDG badge metadata | **SDG 4 & 8** |

---

## 5. TypeScript API Interfaces for Extended AI Engines

```typescript
// Module 2: Re-Planning Engine
export interface ShiftAdvisoryPayload {
  roadmapId: string;
  hasDriftDetected: boolean;
  driftMagnitude: number; // 0.0 - 1.0
  updatedAt: string;
  advisoryMessage: string;
  modifiedMilestones: Array<{
    phaseIndex: number;
    previousCourseTitle: string;
    newCourseTitle: string;
    newCourseUrl: string;
    replacementReason: string;
  }>;
}

// Module 3: Contextual Learning Mentor
export interface MentorQueryPayload {
  roadmapId: string;
  milestonePhase: number;
  userQuestion: string;
  userPastJobTitle: string;
  courseTopic: string;
  locale: 'en' | 'ms' | 'zh';
}

export interface MentorResponsePayload {
  explanation: string;
  practicalAnalogy: string;
  quickCheckQuiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  sdgImpactSummary: string;
}

// Module 4: Peer Synergy Engine
export interface PeerSynergyPayload {
  viewerProfileId: string;
  targetProfileId: string;
  synergyScore: number; // 0.0 - 1.0
  complementarySkills: Array<{
    viewerStrength: string;
    ownerStrength: string;
    collaborationPotential: string;
  }>;
  mentorTalkingPoints?: string[];
}

// Module 5: Milestone Proof Verification
export interface CertificateVerificationResult {
  isValid: boolean;
  confidenceScore: number;
  extractedDetails: {
    learnerName: string;
    courseName: string;
    issuingOrganization: string;
    completionDate: string;
  };
  verifiedCompetencies: string[];
  issuedBadge: {
    badgeId: string;
    badgeTitle: string;
    badgeIconUrl: string;
    alignedSdgs: string[]; // e.g. ["SDG 4.4", "SDG 8.2"]
    verificationHash: string;
  };
}
```
