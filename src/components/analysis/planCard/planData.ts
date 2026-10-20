// Plan Data Interfaces and Default Telemetry Datasets
// Provides typed representation for current active plans and archived historical plans.

export interface PlanPhase {
  id: string;
  phase: string;
  weeks: string;
  badge: string;
  badgeType?: "free" | "claimable" | "capstone" | "completed" | "superseded";
  title: string;
  desc: string;
  detail: string;
  tasks: string[];
  isCompleted?: boolean;
  verifiedArtifact?: {
    name: string;
    score: number;
    timestamp: string;
  };
}

export interface PlanData {
  id: string;
  isCurrent: boolean;
  code: string;
  date: string;
  targetRole: string;
  roleCategory: string;
  description: string;
  scenario?: string;
  sdgs?: string[];
  matchScore: number;
  matchScoreBasis: string;
  matchedStrengths: string[];
  skillsGap: string[];
  atRiskSkills: string[];
  roadmapWeeks: string;
  roadmapHours: string;
  phases: PlanPhase[];
  historyNote?: string;
}

// Current Active Plan
export const CURRENT_PLAN: PlanData = {
  id: "current-plan",
  isCurrent: true,
  code: "SV-2026-ARCH-01",
  date: "Oct 2026 • Live Telemetry Active",
  targetRole: "AI Systems & Solutions Architect",
  roleCategory: "Target Horizon Role",
  description:
    "Design and orchestrate enterprise generative AI pipelines, vector retrieval architectures, and resilient autonomous microservices across ASEAN cloud networks.",
  matchScore: 88.5,
  matchScoreBasis: "Soft Overlap + Vector Cosine",
  matchedStrengths: [
    "Python Systems Programming",
    "Cloud Microservices Design",
    "Vector Search & Embeddings",
    "REST & gRPC API Engineering",
  ],
  skillsGap: [
    "Distributed Model Serving (TensorRT)",
    "LangChain & Multi-Agent Logic",
    "Prompt Calibration & Evaluators",
    "Kubernetes GPU Scheduling",
  ],
  atRiskSkills: [
    "Manual Data Entry & Parsing",
    "Monolithic Shell Scripting",
  ],
  roadmapWeeks: "12 Weeks",
  roadmapHours: "60 Total Hours",
  phases: [
    {
      id: "phase-1",
      phase: "Phase 1 • Weeks 1–4",
      weeks: "Weeks 1–4",
      badge: "Free Audit",
      badgeType: "free",
      title: "Foundation Core & LLM Internals",
      desc: "Master transformer mathematics, semantic chunking algorithms, and vector embedding topologies.",
      detail: "Course: DeepLearning.AI / Coursera (Free)",
      isCompleted: true,
      verifiedArtifact: {
        name: "deeplearning_ai_transformers_cert.pdf",
        score: 98.4,
        timestamp: "Oct 12, 2026",
      },
      tasks: [
        "Complete Transformer Mathematics & Attention Head Architecture Modules",
        "Implement Semantic Chunking and Vector Embeddings Benchmarks in Python",
        "Upload Coursera Certificate or Colab Notebook for AI Rubric Verification",
      ],
    },
    {
      id: "phase-2",
      phase: "Phase 2 • Weeks 5–8",
      weeks: "Weeks 5–8",
      badge: "HRD Corp Claimable",
      badgeType: "claimable",
      title: "Applied Toolchains & Vector RAG",
      desc: "Implement hybrid lexical/vector search with Supabase pgvector and build LangChain agents.",
      detail: "Course: MDEC / HRD Corp Certified Track",
      isCompleted: false,
      tasks: [
        "Build Hybrid Lexical & Cosine Vector Retrieval Engine using pgvector",
        "Develop Multi-Agent Orchestration Workflow with LangChain & LangSmith",
        "Upload Source Code Archive (.zip) or Completion Proof for AI Certification",
      ],
    },
    {
      id: "phase-3",
      phase: "Phase 3 • Weeks 9–12",
      weeks: "Weeks 9–12",
      badge: "Capstone Defense",
      badgeType: "capstone",
      title: "Capstone Portfolio & SDG Alignment",
      desc: "Deploy high-concurrency microservices delivering real-time labor market telemetry.",
      detail: "Deliverable: End-to-End System Deployment",
      isCompleted: false,
      tasks: [
        "Containerize and Deploy Microservices Architecture on Kubernetes GPU Cluster",
        "Execute Live Latency (<50ms P95) & High-Concurrency Load Testing",
        "Upload Architecture Defense Artifact & Live System Telemetry Report",
      ],
    },
  ],
};

// Historical Archived Plans
export const HISTORY_PLANS: PlanData[] = [
  {
    id: "history-plan-01",
    isCurrent: false,
    code: "SV-2026-DEV-00",
    date: "Aug 2026 • Superseded",
    targetRole: "Junior Full-Stack Web Developer",
    roleCategory: "Previous Target Role (Superseded)",
    description:
      "Build full-stack web applications using Node.js, Express, and React with standard relational database management.",
    matchScore: 64.2,
    matchScoreBasis: "Baseline Model v0.8",
    historyNote:
      "This plan was discarded in favor of a newer roadmap, but is retained for historical skill telemetry.",
    matchedStrengths: [
      "HTML5 & Responsive CSS3",
      "JavaScript ES6 Core",
      "Git Version Control",
      "Basic Express Routing",
    ],
    skillsGap: [
      "Microservices Architecture",
      "PostgreSQL Query Optimization",
      "State Management (Redux/Zustand)",
      "Automated CI/CD Pipelines",
    ],
    atRiskSkills: [
      "Manual FTP File Transfers",
      "Static Web Design Methods",
    ],
    roadmapWeeks: "10 Weeks",
    roadmapHours: "48 Total Hours",
    phases: [
      {
        id: "hist-1-phase-1",
        phase: "Phase 1 • Weeks 1–3",
        weeks: "Weeks 1–3",
        badge: "Completed",
        badgeType: "completed",
        title: "HTML5, CSS3 & JavaScript ES6 Fundamentals",
        desc: "Semantic markups, responsive layout techniques, and modern JavaScript primitives.",
        detail: "Course: freeCodeCamp Full Stack Track",
        isCompleted: true,
        verifiedArtifact: {
          name: "fcc_fullstack_module1.pdf",
          score: 95.0,
          timestamp: "Jul 18, 2026",
        },
        tasks: [
          "Complete Responsive Web Design & CSS Grid/Flexbox certification",
          "Build portfolio web project demonstrating ES6 asynchronous fetch",
        ],
      },
      {
        id: "hist-1-phase-2",
        phase: "Phase 2 • Weeks 4–7",
        weeks: "Weeks 4–7",
        badge: "Superseded",
        badgeType: "superseded",
        title: "Express.js & Monolithic CRUD Architecture",
        desc: "Relational database schema modeling with MySQL and basic RESTful endpoints.",
        detail: "Course: Udemy Node.js Bootcamp",
        isCompleted: false,
        tasks: [
          "Build REST API endpoints with authentication middleware",
          "Connect backend server to MySQL relational database",
        ],
      },
      {
        id: "hist-1-phase-3",
        phase: "Phase 3 • Weeks 8–10",
        weeks: "Weeks 8–10",
        badge: "Replaced by AI Plan",
        badgeType: "superseded",
        title: "Basic Docker Containerization & Deployment",
        desc: "Container packaging and Nginx reverse proxy configuration on cloud servers.",
        detail: "Course: Full Stack Open",
        isCompleted: false,
        tasks: [
          "Dockerize monolithic Node.js application",
          "Configure cloud virtual machine and reverse proxy routing",
        ],
      },
    ],
  },
  {
    id: "history-plan-02",
    isCurrent: false,
    code: "SV-2026-DATA-PRE",
    date: "Jun 2026 • Archived",
    targetRole: "Data & BI Reporting Analyst",
    roleCategory: "Initial Target Role (Archived)",
    description:
      "Transform transactional operational databases into business intelligence dashboards and automated management reports.",
    matchScore: 52.0,
    matchScoreBasis: "Initial Assessment v0.5",
    historyNote:
      "Early diagnostic archived prior to transitioning focus toward AI engineering and system orchestration.",
    matchedStrengths: [
      "Excel Advanced Pivot Tables",
      "SQL Queries & Aggregations",
      "Tableau Reporting & Charts",
      "Cross-Functional Data Audits",
    ],
    skillsGap: [
      "Python Data Science Stack (Pandas/NumPy)",
      "Automated ETL Pipelines",
      "Statistical Machine Learning",
      "Cloud Data Warehousing (BigQuery)",
    ],
    atRiskSkills: [
      "Manual Spreadsheet Reporting",
      "Legacy VBA Macro Maintenance",
    ],
    roadmapWeeks: "8 Weeks",
    roadmapHours: "40 Total Hours",
    phases: [
      {
        id: "hist-2-phase-1",
        phase: "Phase 1 • Weeks 1–2",
        weeks: "Weeks 1–2",
        badge: "Completed",
        badgeType: "completed",
        title: "SQL & Relational Warehouses",
        desc: "Complex SQL joins, window functions, and schema normalization.",
        detail: "Course: DataCamp SQL Track",
        isCompleted: true,
        verifiedArtifact: {
          name: "datacamp_sql_certification.pdf",
          score: 92.0,
          timestamp: "Jun 10, 2026",
        },
        tasks: [
          "Complete SQL Joins, CTEs, and Window Functions",
          "Submit SQL database performance benchmark queries",
        ],
      },
      {
        id: "hist-2-phase-2",
        phase: "Phase 2 • Weeks 3–5",
        weeks: "Weeks 3–5",
        badge: "Archived",
        badgeType: "superseded",
        title: "BI Dashboard Development",
        desc: "Interactive dashboard design with Tableau and PowerBI.",
        detail: "Course: Coursera BI Specialization",
        isCompleted: false,
        tasks: [
          "Build executive KPI dashboard with automated filters",
          "Connect Tableau to remote PostgreSQL data warehouse",
        ],
      },
      {
        id: "hist-2-phase-3",
        phase: "Phase 3 • Weeks 6–8",
        weeks: "Weeks 6–8",
        badge: "Archived",
        badgeType: "superseded",
        title: "Data Pipelines Basics",
        desc: "Python scripting for automated data extraction and cleaning.",
        detail: "Course: DataCamp Python",
        isCompleted: false,
        tasks: [
          "Write Python scripts for ETL data cleansing",
          "Automate weekly data pipeline extraction runs",
        ],
      },
    ],
  },
];
