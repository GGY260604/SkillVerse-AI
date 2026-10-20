// Mock Data for Shared Peer Roadmaps and Community Profiles
// Provides realistic telemetry datasets for peer review and shared plan exploration.

import type { PlanData } from "@/components/analysis/planCard/planData";

export interface SharedUser {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarColor: string;
  initials: string;
  sharedAt: string;
  department: string;
  currentPlan: PlanData;
  historyPlans: PlanData[];
}

export const MOCK_SHARED_USERS: SharedUser[] = [
  {
    id: "user-sarah-chen",
    name: "Sarah Chen",
    role: "Cloud Security & FinOps Engineer",
    email: "sarah.chen@asean-cloud.org",
    avatarColor: "from-cyan-500 to-blue-600",
    initials: "SC",
    sharedAt: "Oct 18, 2026",
    department: "Cloud Infrastructure & SecOps",
    currentPlan: {
      id: "shared-plan-sarah-current",
      isCurrent: true,
      code: "SV-2026-SECOPS-03",
      date: "Oct 2026 • Live Telemetry Active",
      targetRole: "Enterprise Zero-Trust & FinOps Architect",
      roleCategory: "Cloud Security Horizon",
      description:
        "Orchestrate enterprise zero-trust microsegmentation, eBPF kernel observability, and automated multi-cloud FinOps governance across regional Kubernetes clusters.",
      scenario: "ASEAN Enterprise Cloud Compliance & Resilient FinOps Framework",
      sdgs: ["SDG 9: Industry & Infrastructure", "SDG 12: Responsible Consumption"],
      matchScore: 91.2,
      matchScoreBasis: "Strict Cryptographic & FinOps Skill Vector Cosine",
      matchedStrengths: [
        "Kubernetes Hardening & RBAC",
        "Terraform & Multi-Region IaC",
        "AWS / GCP FinOps Tagging",
        "Network Security & TLS 1.3",
      ],
      skillsGap: [
        "eBPF Kernel Network Tracing (Cilium)",
        "Zero-Trust Identity Governance (SPIFFE/SPIRE)",
        "Automated Cloud Cost Anomalies Detection",
      ],
      atRiskSkills: [
        "Manual Firewall Rule Provisioning",
        "Static IP Whitelisting Architectures",
      ],
      roadmapWeeks: "10 Weeks",
      roadmapHours: "160 Hours",
      phases: [
        {
          id: "sarah-p1",
          phase: "Phase 1 • Weeks 1–3",
          weeks: "Weeks 1–3",
          badge: "Completed",
          badgeType: "completed",
          title: "eBPF Observability & Network Hardening",
          desc: "Kernel-level packet filtering and deep security inspection with Cilium.",
          detail: "Credential: Linux Foundation Cilium Certified Specialist",
          isCompleted: true,
          verifiedArtifact: {
            name: "ebpf_network_audit_report.pdf",
            score: 96.5,
            timestamp: "Oct 12, 2026",
          },
          tasks: [
            "Deploy Cilium service mesh with mutual TLS encryption across test pods",
            "Generate network flow metrics and trace packet latency via Hubble UI",
          ],
        },
        {
          id: "sarah-p2",
          phase: "Phase 2 • Weeks 4–6",
          weeks: "Weeks 4–6",
          badge: "In Progress",
          badgeType: "claimable",
          title: "Zero-Trust Identity Federation (SPIRE)",
          desc: "Cryptographic workload attestation and short-lived certificate issuance.",
          detail: "Course: CNCF Zero Trust Security Masterclass",
          isCompleted: false,
          tasks: [
            "Configure SPIRE server agent pair on bare-metal and AWS EKS nodes",
            "Enforce automated workload attestation for microservice communications",
          ],
        },
        {
          id: "sarah-p3",
          phase: "Phase 3 • Weeks 7–10",
          weeks: "Weeks 7–10",
          badge: "Upcoming Capstone",
          badgeType: "capstone",
          title: "Autonomous FinOps Anomaly Pipeline",
          desc: "Build AI-driven cloud billing spike detection and self-healing budget policies.",
          detail: "Project: FinOps Foundation Certified Practitioner Portfolio",
          isCompleted: false,
          tasks: [
            "Ingest hourly FOCUS 1.0 multi-cloud billing exports to BigQuery warehouse",
            "Train an isolation forest model for real-time spend spike alerting",
          ],
        },
      ],
    },
    historyPlans: [
      {
        id: "shared-plan-sarah-hist-1",
        isCurrent: false,
        code: "SV-2025-DEVOPS-01",
        date: "May 2025 • Preserved Snapshot",
        targetRole: "Senior DevOps Infrastructure Engineer",
        roleCategory: "Infrastructure Operations",
        description:
          "Containerized CI/CD pipeline automation and multi-region infrastructure provisioning using GitLab CI and Terraform.",
        scenario: "Rapid ASEAN E-Commerce Expansion Architecture",
        sdgs: ["SDG 9: Industry & Infrastructure"],
        matchScore: 78.4,
        matchScoreBasis: "Basic CI/CD & Linux Administration Vector",
        matchedStrengths: [
          "Docker Containerization",
          "GitLab CI Pipeline Writing",
          "Bash & Shell Scripting",
        ],
        skillsGap: [
          "Kubernetes Cluster Operators",
          "Observability with Prometheus & Grafana",
        ],
        atRiskSkills: ["Manual Ansible Playbook Executions"],
        roadmapWeeks: "8 Weeks",
        roadmapHours: "120 Hours",
        historyNote:
          "Superseded upon completing senior certification and transitioning to security-first FinOps architecture.",
        phases: [
          {
            id: "sarah-hist-p1",
            phase: "Phase 1 • Weeks 1–4",
            weeks: "Weeks 1–4",
            badge: "Completed",
            badgeType: "completed",
            title: "CI/CD Pipeline Hardening",
            desc: "GitLab runners and Docker image multi-stage layer caching.",
            detail: "Course: Udemy GitLab CI Masterclass",
            isCompleted: true,
            verifiedArtifact: {
              name: "gitlab_pipeline_optimization.pdf",
              score: 91.0,
              timestamp: "Jun 15, 2025",
            },
            tasks: [
              "Implement Kaniko caching for daemonless container image builds",
              "Integrate SonarQube static code quality gateway into staging branches",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "user-haziq-razak",
    name: "Muhammad Haziq Bin Razak",
    role: "Senior ESG Data Analyst",
    email: "haziq.razak@eco-analytics.my",
    avatarColor: "from-emerald-500 to-teal-700",
    initials: "HR",
    sharedAt: "Oct 15, 2026",
    department: "Sustainability Intelligence & ESG",
    currentPlan: {
      id: "shared-plan-haziq-current",
      isCurrent: true,
      code: "SV-2026-ESG-02",
      date: "Oct 2026 • Live Telemetry Active",
      targetRole: "ESG & Sustainable Supply Chain Intelligence Lead",
      roleCategory: "Green Economy Horizon",
      description:
        "Architect end-to-end Scope 1, 2, and 3 greenhouse gas carbon telemetry pipelines, Life Cycle Assessment (LCA) models, and regulatory CBAM compliance intelligence.",
      scenario: "ASEAN Green Taxonomy & Cross-Border Carbon Border Adjustment",
      sdgs: [
        "SDG 12: Responsible Consumption & Production",
        "SDG 13: Climate Action",
        "SDG 7: Affordable & Clean Energy",
      ],
      matchScore: 86.8,
      matchScoreBasis: "Green Economy Standards & Python Analytics Cosine",
      matchedStrengths: [
        "SQL & Data Warehouse Modeling",
        "GHG Protocol Corporate Standard",
        "PowerBI ESG Executive Dashboards",
        "Supply Chain Tier-1 Mapping",
      ],
      skillsGap: [
        "Scope 3 Category 1-15 Emissions Calculation",
        "OpenLCA & Ecoinvent Database Scripting",
        "EU CBAM & Bursa Malaysia ESG Disclosure Rules",
      ],
      atRiskSkills: [
        "Spreadsheet-based Carbon Auditing",
        "Manual Annual PDF Sustainability Reports",
      ],
      roadmapWeeks: "12 Weeks",
      roadmapHours: "180 Hours",
      phases: [
        {
          id: "haziq-p1",
          phase: "Phase 1 • Weeks 1–4",
          weeks: "Weeks 1–4",
          badge: "Completed",
          badgeType: "completed",
          title: "Scope 3 Supply Chain Telemetry",
          desc: "Quantify upstream supplier freight and purchased goods emissions factors.",
          detail: "Certification: GHG Protocol Scope 3 Standard Course",
          isCompleted: true,
          verifiedArtifact: {
            name: "scope3_emissions_audit_model.xlsx",
            score: 95.0,
            timestamp: "Oct 05, 2026",
          },
          tasks: [
            "Map 15 Scope 3 categories to ERP procurement transaction datasets",
            "Automate emission factor lookups against DEFRA and IPCC databases",
          ],
        },
        {
          id: "haziq-p2",
          phase: "Phase 2 • Weeks 5–8",
          weeks: "Weeks 5–8",
          badge: "In Progress",
          badgeType: "claimable",
          title: "LCA Modeling with OpenLCA & Python",
          desc: "Cradle-to-gate environmental footprint simulations for manufactured goods.",
          detail: "Course: ISO 14044 Life Cycle Assessment Specialization",
          isCompleted: false,
          tasks: [
            "Build parameter-driven LCA inventory model for regional packaging export",
            "Generate carbon footprint per SKU comparison visualizations in Python",
          ],
        },
        {
          id: "haziq-p3",
          phase: "Phase 3 • Weeks 9–12",
          weeks: "Weeks 9–12",
          badge: "Upcoming Capstone",
          badgeType: "capstone",
          title: "Autonomous CBAM Regulatory Engine",
          desc: "Automated carbon tax verification report generator for international customs.",
          detail: "Capstone: Verified ASEAN-EU Green Trade Telemetry Pipeline",
          isCompleted: false,
          tasks: [
            "Construct automated validation schema matching EU CBAM transitional templates",
            "Build real-time anomaly alerts for supplier emission variance shifts",
          ],
        },
      ],
    },
    historyPlans: [
      {
        id: "shared-plan-haziq-hist-1",
        isCurrent: false,
        code: "SV-2025-BI-01",
        date: "Dec 2024 • Preserved Snapshot",
        targetRole: "Business Intelligence Analyst",
        roleCategory: "Corporate Analytics",
        description:
          "Corporate sales forecasting and customer retention dashboard engineering using Tableau and PostgreSQL.",
        scenario: "Regional Enterprise Retail Intelligence",
        sdgs: ["SDG 8: Decent Work & Economic Growth"],
        matchScore: 80.2,
        matchScoreBasis: "Relational SQL & BI Analytics Vector",
        matchedStrengths: ["SQL Joins & CTEs", "Tableau Dashboarding"],
        skillsGap: ["Python Data Science", "Predictive Time-series Models"],
        atRiskSkills: ["Static Excel Macro Reporting"],
        roadmapWeeks: "6 Weeks",
        roadmapHours: "90 Hours",
        historyNote:
          "Preserved prior to specializing in sustainability and green taxonomy analytics.",
        phases: [
          {
            id: "haziq-hist-p1",
            phase: "Phase 1 • Weeks 1–3",
            weeks: "Weeks 1–3",
            badge: "Completed",
            badgeType: "completed",
            title: "Advanced SQL Aggregations",
            desc: "Window functions, partitioning, and automated data extract refreshes.",
            detail: "Course: DataCamp SQL Track",
            isCompleted: true,
            verifiedArtifact: {
              name: "sql_performance_tuning.pdf",
              score: 93.4,
              timestamp: "Jan 10, 2025",
            },
            tasks: [
              "Optimize complex multi-table analytical joins",
              "Automate scheduled materialized view refreshes in PostgreSQL",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "user-priya-raman",
    name: "Priya Ramanathan",
    role: "Full-Stack AI Application Engineer",
    email: "priya.raman@neurotech.sg",
    avatarColor: "from-purple-500 to-indigo-700",
    initials: "PR",
    sharedAt: "Oct 10, 2026",
    department: "Applied AI & Foundation Models",
    currentPlan: {
      id: "shared-plan-priya-current",
      isCurrent: true,
      code: "SV-2026-GENAI-04",
      date: "Oct 2026 • Live Telemetry Active",
      targetRole: "GenAI Agent Systems & LLMOps Specialist",
      roleCategory: "Generative AI Systems",
      description:
        "Engineer scalable multi-agent systems, hybrid dense-sparse vector RAG architectures, model evaluation guardrails, and low-latency continuous deployment pipelines.",
      scenario: "Next-Gen Multi-Agent Enterprise Autonomous Assistant Fleet",
      sdgs: [
        "SDG 4: Quality Education",
        "SDG 8: Decent Work & Economic Growth",
        "SDG 9: Industry & Infrastructure",
      ],
      matchScore: 92.5,
      matchScoreBasis: "LLMOps & Agentic Reasoning Cosine Match",
      matchedStrengths: [
        "TypeScript & Next.js Architecture",
        "Python FastAPI Services",
        "Vector Databases (Qdrant & Pinecone)",
        "Prompt Engineering & Few-Shot Evaluation",
      ],
      skillsGap: [
        "Multi-Agent Graph Workflows (LangGraph)",
        "Semantic Caching & Prompt Compression",
        "Automated Red Teaming & Guardrails (Giskard / NeMo)",
      ],
      atRiskSkills: [
        "Synchronous Monolithic REST APIs",
        "Static Keyword Rule-Based Chatbots",
      ],
      roadmapWeeks: "10 Weeks",
      roadmapHours: "150 Hours",
      phases: [
        {
          id: "priya-p1",
          phase: "Phase 1 • Weeks 1–3",
          weeks: "Weeks 1–3",
          badge: "Completed",
          badgeType: "completed",
          title: "Hybrid RAG & Reciprocal Rank Fusion",
          desc: "BM25 keyword search combined with multilingual dense embeddings.",
          detail: "Credential: DeepLearning.AI Advanced RAG Certificate",
          isCompleted: true,
          verifiedArtifact: {
            name: "hybrid_rag_benchmark_metrics.pdf",
            score: 98.2,
            timestamp: "Sep 28, 2026",
          },
          tasks: [
            "Implement Cohere reranking layer atop Qdrant vector collection",
            "Evaluate RAG retrieval precision using Ragas metrics framework",
          ],
        },
        {
          id: "priya-p2",
          phase: "Phase 2 • Weeks 4–6",
          weeks: "Weeks 4–6",
          badge: "In Progress",
          badgeType: "claimable",
          title: "Multi-Agent Collaboration with LangGraph",
          desc: "Stateful agent graphs with human-in-the-loop validation and tool routing.",
          detail: "Project: Autonomous Code Reviewer & Security Auditing Swarm",
          isCompleted: false,
          tasks: [
            "Design cyclic agent workflow graph with supervisor routing node",
            "Implement durable checkpoint storage backed by Redis for paused agent state",
          ],
        },
        {
          id: "priya-p3",
          phase: "Phase 3 • Weeks 7–10",
          weeks: "Weeks 7–10",
          badge: "Upcoming Capstone",
          badgeType: "capstone",
          title: "Production LLMOps & Guardrails Fleet",
          desc: "Latency monitoring, token cost budgets, PII redaction, and prompt injection defense.",
          detail: "Capstone: Enterprise Resilient Agent Production Gateway",
          isCompleted: false,
          tasks: [
            "Integrate NeMo Guardrails policy layer for input/output toxic content filtration",
            "Set up Langfuse telemetry dashboards tracking latency percentiles and token spend",
          ],
        },
      ],
    },
    historyPlans: [
      {
        id: "shared-plan-priya-hist-1",
        isCurrent: false,
        code: "SV-2025-WEB-01",
        date: "Nov 2024 • Preserved Snapshot",
        targetRole: "Frontend React Developer",
        roleCategory: "Web Applications",
        description:
          "Modern responsive web application development with React, Tailwind CSS, and state management.",
        scenario: "Consumer SaaS Frontend Modernization",
        sdgs: ["SDG 8: Decent Work & Economic Growth"],
        matchScore: 82.0,
        matchScoreBasis: "Frontend React & Modern JS Standards",
        matchedStrengths: [
          "React 18 & Hooks",
          "Tailwind CSS Layouts",
          "TypeScript Typing",
        ],
        skillsGap: ["Backend API Design", "Microservices & Cloud Deployments"],
        atRiskSkills: ["Legacy Redux Boilerplate Management"],
        roadmapWeeks: "8 Weeks",
        roadmapHours: "110 Hours",
        historyNote:
          "Completed before transitioning into Generative AI and LLM application engineering.",
        phases: [
          {
            id: "priya-hist-p1",
            phase: "Phase 1 • Weeks 1–4",
            weeks: "Weeks 1–4",
            badge: "Completed",
            badgeType: "completed",
            title: "React Component Optimization",
            desc: "Memoization, SSR data hydration, and bundle splitting.",
            detail: "Course: Frontend Masters Advanced React",
            isCompleted: true,
            verifiedArtifact: {
              name: "react_web_vitals_report.pdf",
              score: 94.0,
              timestamp: "Dec 02, 2024",
            },
            tasks: [
              "Reduce initial JavaScript bundle size by 45% via dynamic imports",
              "Implement custom hooks for optimistic server action mutations",
            ],
          },
        ],
      },
    ],
  },
];
