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
  extractionMethod?: "gemini" | "local" | string;
  usedKey?: string | null;
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
  titleLocalized?: { en?: string; ms?: string; zh?: string };
  platform: string;
  url: string;
  isHrdCorpClaimable: boolean;
  isFree: boolean;
  durationHours?: number;
}

export interface RoadmapMilestone {
  phaseIndex: number;
  phaseTitle: string;
  titleLocalized?: { en?: string; ms?: string; zh?: string };
  description?: string;
  descriptionLocalized?: { en?: string; ms?: string; zh?: string };
  durationWeeks: number;
  estimatedHours: number;
  learningObjectives: string[];
  objectivesLocalized?: { en?: string[]; ms?: string[]; zh?: string[] };
  recommendedCourses: RecommendedCourse[];
  sdgGoal?: string;
  sdgTitle?: string;
  sdgExplanation?: string;
  sdgExplanationLocalized?: { en?: string; ms?: string; zh?: string };
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
  scenarioRoles?: Record<"moderate" | "accelerated_ai" | "green_economy", MatchedRole[]>;
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
  const isClient = typeof window !== "undefined";
  const url = isClient ? "/api/analysis/analyze" : `${getFastApiConfig().baseUrl}/api/v1/analyze/stream`;
  const body = isClient ? JSON.stringify({ action: "stream", ...payload }) : JSON.stringify(payload);
  const headers = isClient ? { "Content-Type": "application/json" } : getFastApiConfig().headers;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
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
  const isClient = typeof window !== "undefined";
  const url = isClient ? "/api/analysis/analyze" : `${getFastApiConfig().baseUrl}/api/v1/analyze/synthesize-roadmap`;
  const body = isClient ? JSON.stringify({ action: "synthesize", ...payload }) : JSON.stringify(payload);
  const headers = isClient ? { "Content-Type": "application/json" } : getFastApiConfig().headers;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
    // Include cookies so the server-side route can resolve the authenticated user.
    credentials: isClient ? "include" : "omit",
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
    const courseDetails = (m.recommendedCourses || [])
      .map((c) => `${c.title} (${c.platform})`)
      .join(" • ");

    return {
      id: `phase-${m.phaseIndex}`,
      phaseIndex: m.phaseIndex,
      phase: `Phase ${m.phaseIndex} • ${m.durationWeeks} Weeks`,
      weeks: `${m.durationWeeks} Weeks`,
      durationWeeks: m.durationWeeks,
      estimatedHours: m.estimatedHours,
      title: m.phaseTitle,
      titleLocalized: m.titleLocalized,
      desc: m.description || m.learningObjectives?.[0] || "Foundational competency acquisition",
      descriptionLocalized: m.descriptionLocalized,
      detail: courseDetails || "Verified course track",
      tasks: m.learningObjectives || [],
      objectivesLocalized: m.objectivesLocalized,
      recommendedCourses: m.recommendedCourses,
      isCompleted: false,
      sdgGoal: m.sdgGoal,
      sdgTitle: m.sdgTitle,
      sdgExplanation: m.sdgExplanation,
      sdgExplanationLocalized: m.sdgExplanationLocalized,
    };
  });

  const totalHours = milestones.reduce((sum, m) => sum + (m.estimatedHours || 15), 0);
  const totalWeeks = roadmap?.totalWeeks || milestones.reduce((sum, m) => sum + (m.durationWeeks || 3), 0) || 10;

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const roleCodeSuffix = selectedRole.roleId.replace(/^role-|^custom-/, "").slice(0, 6).toUpperCase();

  return {
    id: assessment.assessmentId,
    isCurrent: true,
    code: `SV-${now.getFullYear()}-${roleCodeSuffix}`,
    date: dateStr,
    createdAt: dateStr,
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
    phases: phases.length > 0 ? phases : [],
  };
}
