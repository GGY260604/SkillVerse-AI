// --- FastAPI Service Client ---
// Target Service: FastAPI Backend (Compute & Inference Engine)
// Primary Tier: Local Python FastAPI (LOCAL_PYTHON_ENDPOINT, default dev: http://127.0.0.1:8000)
// Secondary Tier: RunPod GPU Microservice (RUNPOD_API_ENDPOINT with RUNPOD_API_KEY)
// Tertiary Tier: Render Hosted FastAPI Service (RENDER_API_ENDPOINT)

// --- Schema ---
export type FastApiTier = "local" | "runpod" | "render";

export interface FastApiTarget {
  tier: FastApiTier;
  baseUrl: string;
  headers: Record<string, string>;
}

export interface FastApiConfig {
  mode: FastApiTier;
  baseUrl: string;
  headers: Record<string, string>;
}

// 1. Target Endpoints Resolver
// Resolve all configured endpoints and build prioritized fallback hierarchy:
// LOCAL_PYTHON_ENDPOINT -> RUNPOD_API_ENDPOINT -> RENDER_API_ENDPOINT.
export function getFastApiTargets(): FastApiTarget[] {
  const targets: FastApiTarget[] = [];

  const localEndpoint = (
    process.env.LOCAL_PYTHON_ENDPOINT ||
    process.env.NEXT_PUBLIC_LOCAL_PYTHON_ENDPOINT ||
    ""
  ).trim();

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

  const renderEndpoint = (
    process.env.RENDER_API_ENDPOINT ||
    process.env.NEXT_PUBLIC_RENDER_API_ENDPOINT ||
    ""
  ).trim();

  // Tier 1: Local Python Endpoint
  if (localEndpoint) {
    targets.push({
      tier: "local",
      baseUrl: localEndpoint.replace(/\/+$/, ""),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Tier 2: RunPod GPU Endpoint
  if (runpodEndpoint) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (runpodKey) {
      headers["Authorization"] = `Bearer ${runpodKey}`;
      headers["x-api-key"] = runpodKey;
    }
    targets.push({
      tier: "runpod",
      baseUrl: runpodEndpoint.replace(/\/+$/, ""),
      headers,
    });
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

  // Tier 3: Render Hosted Endpoint
  if (renderEndpoint) {
    targets.push({
      tier: "render",
      baseUrl: renderEndpoint.replace(/\/+$/, ""),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Default fallback if no environment variables are defined: local default
  if (targets.length === 0) {
    targets.push({
      tier: "local",
      baseUrl: "http://127.0.0.1:8000",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  return targets;
}

// 2. Default Config Resolver
// Return highest-priority target for backwards compatibility.
export function getFastApiConfig(): FastApiConfig {
  const targets = getFastApiTargets();
  const primary = targets[0];
  return {
    mode: primary.tier,
    baseUrl: primary.baseUrl,
    headers: primary.headers,
  };
}

// 3. Base URL Getter
// Retrieve base URL from active primary configuration.
export function getFastApiBaseUrl(): string {
  return getFastApiConfig().baseUrl;
}

// 4. Multi-Tier Failover Fetcher
// Execute HTTP request across prioritized endpoints with automatic tier fallback.
export async function fetchWithFastApiFallback(
  subPath: string,
  init?: RequestInit,
  options?: { timeoutMs?: number }
): Promise<Response> {
  const targets = getFastApiTargets();
  const cleanSubPath = subPath.startsWith("/") ? subPath : `/${subPath}`;
  const timeoutMs = options?.timeoutMs ?? 15000;
  const errors: string[] = [];

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const targetUrl = `${target.baseUrl}${cleanSubPath}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const mergedHeaders = {
        ...target.headers,
        ...(init?.headers as Record<string, string> | undefined),
      };

      const response = await fetch(targetUrl, {
        ...init,
        headers: mergedHeaders,
        signal: init?.signal || controller.signal,
      });

      clearTimeout(timer);

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      errors.push(`Tier ${target.tier} (${targetUrl}) returned status ${response.status}`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`Tier ${target.tier} (${targetUrl}) failed: ${errMsg}`);
    }
  }

  throw new Error(`All FastAPI endpoints failed. Failover trace: ${errors.join(" -> ")}`);
}
