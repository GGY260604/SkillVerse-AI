/**
 * SkillVerse AI - FastAPI Client & Connection Resolver
 *
 * Resolves the base access link and headers dynamically:
 * - If both RUNPOD_API_ENDPOINT and RUNPOD_API_KEY exist, routes to RunPod with auth headers.
 * - If either is missing, falls back to LOCAL_PYTHON_ENDPOINT (Dev Mode).
 */

import { PlanData, PlanPhase } from "@/components/analysis/planCard/planData";

export interface FastApiConfig {
  mode: "runpod" | "local";
  baseUrl: string;
  headers: Record<string, string>;
}

export function getFastApiConfig(): FastApiConfig {
  const runpodEndpoint = (
    process.env.RUNPOD_API_ENDPOINT ||
    process.env.NEXT_PUBLIC_RUNPOD_API_ENDPOINT ||
    ""
  ).trim();

  const runpodKey = (
    process.env.RUNPOD_API_KEY ||
    process.env.NEXT_PUBLIC_RUNPOD_API_KEY ||
    ""
  ).trim();

  const localEndpoint = (
    process.env.LOCAL_PYTHON_ENDPOINT ||
    process.env.NEXT_PUBLIC_LOCAL_PYTHON_ENDPOINT ||
    "http://127.0.0.1:8000"
  ).trim();

  if (runpodEndpoint && runpodKey) {
    const cleanRunpodUrl = runpodEndpoint.replace(/\/+$/, "");
    return {
      mode: "runpod",
      baseUrl: cleanRunpodUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${runpodKey}`,
        "x-api-key": runpodKey,
      },
    };
  }

  const cleanLocalUrl = (localEndpoint || "http://127.0.0.1:8000").replace(/\/+$/, "");
  return {
    mode: "local",
    baseUrl: cleanLocalUrl,
    headers: {
      "Content-Type": "application/json",
    },
  };
}

export function getFastApiBaseUrl(): string {
  return getFastApiConfig().baseUrl;
}

// ============================================================================
// Data Contracts
// ============================================================================

export interface UserSkillItem {
  id: string;
  name: string;
  escoUri?: string;
  proficiency?: "beginner" | "intermediate" | "advanced";
  isAiExtracted?: boolean;
  localized_labels?: Record<string, string>;
}

export interface ProfileIntakePayload {
  employmentStatus: string;
  currentJobTitle?: string;
  industry?: string;
  educationLevel?: string;
  yearsOfExperience?: string;
  skills: UserSkillItem[];
  toolsAndSoftware?: string[];
  casualDescription?: string;
  languages?: string[];
  careerGoal?: string;
  targetSectors?: string[];
  targetJobTitle?: string;
  workArrangement?: string;
  weeklyCommitmentHours?: string;
  learningProviders?: string[];
  outputLanguage?: string;
}

export interface ExtractionResponse {
  success: boolean;
  message: string;
  extractedProfile: ProfileIntakePayload;
  rawTextPreview?: string;
}

export interface SdgAlignmentItem {
  targetCode: string;
  targetTitle: string;
  affinityScore: number;
  impactExplanation?: string;
}

export interface AtRiskSkillItem {
  skillName: string;
  velocityScore: number;
  riskReason: string;
}

export interface MatchedRole {
  roleId: string;
  title: string;
  titleLocalized: string;
  industry: string;
  matchScore: number;
  scenarioMultiplierApplied: number;
  sdgAlignments: SdgAlignmentItem[];
  matchedStrengths: string[];
  skillsGap: string[];
  atRiskCompetencies: AtRiskSkillItem[];
}

export interface RecommendedCourse {
  title: string;
  platform: string;
  url: string;
  isHrdCorpClaimable: boolean;
  isFree: boolean;
  durationHours?: number;
}

export interface RoadmapMilestone {
  phaseIndex: number;
  phaseTitle: string;
  durationWeeks: number;
  estimatedHours: number;
  learningObjectives: string[];
  recommendedCourses: RecommendedCourse[];
}

export interface SelectedRoleRoadmap {
  targetRoleId: string;
  totalWeeks: number;
  milestones: RoadmapMilestone[];
}

export interface RadarAxisItem {
  category: string;
  userLevel: number;
  requiredLevel: number;
}

export interface AnalyzeRequestPayload {
  sessionId?: string;
  userId?: string;
  locale?: string;
  macroScenario?: "moderate" | "accelerated_ai" | "green_economy";
  profile: ProfileIntakePayload;
  targetRoleId?: string;
  autoSynthesizeRoadmap?: boolean;
}

export interface AnalyzeResponsePayload {
  assessmentId: string;
  sessionId: string;
  generatedAt: string;
  activeScenario: "moderate" | "accelerated_ai" | "green_economy";
  radarData: RadarAxisItem[];
  topRoles: MatchedRole[];
  selectedRoleRoadmap?: SelectedRoleRoadmap | null;
}

export interface SynthesizeRoadmapRequest {
  assessmentId?: string;
  sessionId?: string;
  userId?: string;
  locale?: string;
  macroScenario?: "moderate" | "accelerated_ai" | "green_economy";
  targetRoleId: string;
  profile: ProfileIntakePayload;
  topRoles?: MatchedRole[];
  radarData?: RadarAxisItem[];
}

export interface SynthesizeRoadmapResponse {
  assessmentId: string;
  sessionId: string;
  generatedAt: string;
  activeScenario: "moderate" | "accelerated_ai" | "green_economy";
  targetRoleId: string;
  targetRoleTitle: string;
  radarData: RadarAxisItem[];
  topRoles: MatchedRole[];
  selectedRoleRoadmap: SelectedRoleRoadmap;
}

export interface StreamProgressEvent {
  phase: number;
  title?: string;
  detail?: string;
  percent?: number;
  result?: AnalyzeResponsePayload;
  error?: string;
}

// ============================================================================
// API Ingestion & Inference Methods
// ============================================================================

/**
 * Uploads a CV document (PDF, PNG, JPG, WEBP) to FastAPI for PII scrubbing,
 * OCR parsing, and canonical ESCO competency normalization.
 */
export async function extractProfileDocument(file: File): Promise<ExtractionResponse> {
  const config = getFastApiConfig();
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (config.mode === "runpod") {
    const authHeader = config.headers["Authorization"];
    if (authHeader) headers["Authorization"] = authHeader;
    const apiKey = config.headers["x-api-key"];
    if (apiKey) headers["x-api-key"] = apiKey;
  }

  const response = await fetch(`${config.baseUrl}/api/v1/extract`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Profile extraction failed (${response.status}): ${errText}`);
  }

  return response.json();
}

/**
 * Executes workforce profile evaluation (Stage 1 matching or Stage 1+2).
 */
export async function analyzeWorkforceProfile(
  payload: AnalyzeRequestPayload
): Promise<AnalyzeResponsePayload> {
  const config = getFastApiConfig();
  const response = await fetch(`${config.baseUrl}/api/v1/analyze`, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Analysis failed (${response.status}): ${errText}`);
  }

  return response.json();
}

/**
 * Streams real-time progress events for the 4 computational phases of role evaluation.
 */
export async function analyzeWorkforceProfileStream(
  payload: AnalyzeRequestPayload,
  onProgress: (event: StreamProgressEvent) => void
): Promise<AnalyzeResponsePayload> {
  const config = getFastApiConfig();
  const response = await fetch(`${config.baseUrl}/api/v1/analyze/stream`, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // Fallback to synchronous endpoint if streaming fails or is buffered
    return analyzeWorkforceProfile(payload);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return analyzeWorkforceProfile(payload);
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let finalResult: AnalyzeResponsePayload | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const chunk of lines) {
      const match = chunk.match(/^data:\s*(.*)$/m);
      if (match && match[1]) {
        try {
          const parsed = JSON.parse(match[1]);
          onProgress(parsed);
          if (parsed.result) {
            finalResult = parsed.result;
          }
        } catch {
          // ignore malformed SSE
        }
      }
    }
  }

  if (finalResult) {
    return finalResult;
  }

  // Fallback to synchronous analyze if stream ended without final payload
  return analyzeWorkforceProfile(payload);
}

/**
 * Synthesizes a personalized 3-phase reskilling roadmap specifically for
 * the role selected by the user from the Top 5 candidates.
 */
export async function synthesizeSelectedRoadmap(
  payload: SynthesizeRoadmapRequest
): Promise<SynthesizeRoadmapResponse> {
  const config = getFastApiConfig();
  const response = await fetch(`${config.baseUrl}/api/v1/analyze/synthesize-roadmap`, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Roadmap synthesis failed (${response.status}): ${errText}`);
  }

  return response.json();
}

// ============================================================================
// Converter: Map Synthesized Assessment to UI PlanData
// ============================================================================

export function convertAssessmentToPlanData(
  assessment: SynthesizeRoadmapResponse | AnalyzeResponsePayload,
  selectedRole: MatchedRole
): PlanData {
  const roadmap = assessment.selectedRoleRoadmap;
  const milestones = roadmap?.milestones || [];

  const phases: PlanPhase[] = milestones.map((m) => {
    const hasClaimable = m.recommendedCourses?.some((c) => c.isHrdCorpClaimable);
    const badge = hasClaimable
      ? "HRD Corp Claimable"
      : m.phaseIndex === 3
      ? "Capstone Defense"
      : "Free Audit";
    const badgeType = hasClaimable
      ? ("claimable" as const)
      : m.phaseIndex === 3
      ? ("capstone" as const)
      : ("free" as const);

    const courseDetails = (m.recommendedCourses || [])
      .map((c) => `${c.title} (${c.platform})`)
      .join(" • ");

    return {
      id: `phase-${m.phaseIndex}`,
      phase: `Phase ${m.phaseIndex} • ${m.durationWeeks} Weeks`,
      weeks: `${m.durationWeeks} Weeks`,
      badge,
      badgeType,
      title: m.phaseTitle,
      desc: m.learningObjectives?.[0] || "Foundational competency acquisition",
      detail: courseDetails || "Verified course track",
      tasks: m.learningObjectives || [],
      isCompleted: false,
    };
  });

  const totalHours = milestones.reduce((sum, m) => sum + (m.estimatedHours || 15), 0);
  const totalWeeks = roadmap?.totalWeeks || milestones.reduce((sum, m) => sum + (m.durationWeeks || 3), 0) || 10;

  const now = new Date();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dateStr = `${monthNames[now.getMonth()]} ${now.getFullYear()} • Live Telemetry Active`;

  const roleCodeSuffix = selectedRole.roleId.replace(/^role-|^custom-/, "").slice(0, 6).toUpperCase();

  return {
    id: assessment.assessmentId,
    isCurrent: true,
    code: `SV-${now.getFullYear()}-${roleCodeSuffix}`,
    date: dateStr,
    targetRole: selectedRole.titleLocalized || selectedRole.title,
    roleCategory: selectedRole.industry || "Target Horizon Role",
    description: `Targeting ${selectedRole.titleLocalized || selectedRole.title} in ${selectedRole.industry}. Aligned with UN ${selectedRole.sdgAlignments?.map((s) => s.targetCode).join(", ") || "SDG 8.2"}.`,
    scenario: assessment.activeScenario,
    sdgs: selectedRole.sdgAlignments?.map((s) => s.targetCode) || ["SDG 8.2"],
    matchScore: Math.round(selectedRole.matchScore * 1000) / 10,
    matchScoreBasis: selectedRole.scenarioMultiplierApplied > 1 ? "BGE-M3 Vector + Scenario Multiplier" : "Soft Overlap + BGE-M3 Cosine",
    matchedStrengths: selectedRole.matchedStrengths || [],
    skillsGap: selectedRole.skillsGap || [],
    atRiskSkills: selectedRole.atRiskCompetencies?.map((a) => a.skillName) || [],
    roadmapWeeks: `${totalWeeks} Weeks`,
    roadmapHours: `${totalHours} Total Hours`,
    phases: phases.length > 0 ? phases : [
      {
        id: "phase-1",
        phase: "Phase 1 • 3 Weeks",
        weeks: "3 Weeks",
        badge: "Free Audit",
        badgeType: "free",
        title: "Foundation Core",
        desc: "Master essential concepts and digital workflows.",
        detail: "Course: Coursera (Free Audit)",
        tasks: ["Complete core competency modules", "Demonstrate basic workflow skills"],
        isCompleted: false,
      }
    ],
  };
}
