// ==========================================
// FastAPI Service Client and Multi-Tier Fallback Engine
// ==========================================

// This module connects the Next.js application to FastAPI AI and ML microservices.
// The backend handles compute-heavy tasks including BGE-M3 vector embeddings, ESCO role matching, and roadmap synthesis.
// It manages automatic failover across local, RunPod GPU, and Render cloud deployments.

// Deployment tier classification indicating where the FastAPI instance is hosted.
export type FastApiTier = "local" | "runpod" | "render";

// Resolved target endpoint specifications including authentication headers and base URL.
export interface FastApiTarget {
  tier: FastApiTier;
  baseUrl: string;
  headers: Record<string, string>;
}

// Active configuration structure representing the highest-priority target endpoint.
export interface FastApiConfig {
  mode: FastApiTier;
  baseUrl: string;
  headers: Record<string, string>;
}

// ==========================================
// Target Endpoints Resolver
// ==========================================

// Build a prioritized hierarchy of all configured FastAPI backend targets.
// The resolution order prioritizes low-latency local execution before cloud GPU and hosted fallbacks.
export function getFastApiTargets(): FastApiTarget[] {
  const targets: FastApiTarget[] = [];

  // Read local development endpoint from server-side or public environment variables.
  const localEndpoint = (
    process.env.LOCAL_PYTHON_ENDPOINT ||
    process.env.NEXT_PUBLIC_LOCAL_PYTHON_ENDPOINT ||
    ""
  ).trim();

  // Read RunPod serverless GPU endpoint URL.
  const runpodEndpoint = (
    process.env.RUNPOD_API_ENDPOINT ||
    process.env.NEXT_PUBLIC_RUNPOD_API_ENDPOINT ||
    ""
  ).trim();

  // Read RunPod API key for bearer authentication and proxy validation.
  const runpodKey = (
    process.env.RUNPOD_API_KEY ||
    process.env.NEXT_PUBLIC_RUNPOD_API_KEY ||
    ""
  ).trim();

  // Read Render cloud-hosted backup service endpoint.
  const renderEndpoint = (
    process.env.RENDER_API_ENDPOINT ||
    process.env.NEXT_PUBLIC_RENDER_API_ENDPOINT ||
    ""
  ).trim();

  // Tier 1: Local Development Server
  // Local Uvicorn server is preferred during development to avoid cloud round-trip latency.
  if (localEndpoint) {
    targets.push({
      tier: "local",
      baseUrl: localEndpoint.replace(/\/+$/, ""),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Tier 2: RunPod Serverless GPU Endpoint
  // RunPod provides GPU acceleration for vector embedding and LLM inference when local server is unavailable.
  if (runpodEndpoint) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    // Attach authorization headers when an API key is configured.
    if (runpodKey) {
      headers["Authorization"] = `Bearer ${runpodKey}`;
      headers["x-api-key"] = runpodKey;
    }
    targets.push({
      tier: "runpod",
      baseUrl: runpodEndpoint.replace(/\/+$/, ""),
      headers,
    });
  }

  // Tier 3: Render Hosted Cloud Backup
  // Render serves as an always-on CPU fallback if both local and RunPod instances are unreachable.
  if (renderEndpoint) {
    targets.push({
      tier: "render",
      baseUrl: renderEndpoint.replace(/\/+$/, ""),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Default Fallback
  // Provide a default local address when no environment variables are present in the environment.
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

// ==========================================
// Re-Exported Analysis Contracts
// ==========================================

// Re-export shared analysis and roadmap payload contracts for convenient consumer imports.
export type {
  UserSkillItem,
  ProfileIntakePayload,
  ExtractionResponse,
  SdgAlignmentItem,
  AtRiskSkillItem,
  MatchedRole,
  RecommendedCourse,
  RoadmapMilestone,
  SelectedRoleRoadmap,
  RadarAxisItem,
  AnalyzeRequestPayload,
  AnalyzeResponsePayload,
  SynthesizeRoadmapRequest,
  SynthesizeRoadmapResponse,
  StreamProgressEvent,
} from "@/lib/analysis/types";

// ==========================================
// Default Configuration Resolver
// ==========================================

// Retrieve the highest-priority active FastAPI configuration for backwards compatibility.
export function getFastApiConfig(): FastApiConfig {
  const targets = getFastApiTargets();
  const primary = targets[0];
  return {
    mode: primary.tier,
    baseUrl: primary.baseUrl,
    headers: primary.headers,
  };
}

// Retrieve the base URL of the active primary FastAPI endpoint.
export function getFastApiBaseUrl(): string {
  return getFastApiConfig().baseUrl;
}

// ==========================================
// Multi-Tier Failover Fetcher
// ==========================================

// Dispatch an HTTP request with automatic sequential failover across all configured backend tiers.
// If a tier encounters network timeouts or 5xx server errors, the next tier is automatically contacted.
export async function fetchWithFastApiFallback(
  subPath: string,
  init?: RequestInit,
  options?: { timeoutMs?: number }
): Promise<Response> {
  const targets = getFastApiTargets();
  // Ensure the request path always begins with a single leading slash.
  const cleanSubPath = subPath.startsWith("/") ? subPath : `/${subPath}`;
  // Default to a 60-second timeout to accommodate compute-intensive embedding generation.
  const timeoutMs = options?.timeoutMs ?? 60000;
  const errors: string[] = [];

  // Iterate through tiers in order of priority until a valid response is returned.
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const targetUrl = `${target.baseUrl}${cleanSubPath}`;
    try {
      const controller = new AbortController();
      const effectiveTimeout = timeoutMs;
      // Abort connection if backend fails to respond within the designated timeout window.
      const timer = setTimeout(() => controller.abort(), effectiveTimeout);

      // Merge base tier headers with caller-supplied request headers.
      const mergedHeaders = {
        ...target.headers,
        ...(init?.headers as Record<string, string> | undefined),
      };
      // Remove Content-Type header on FormData payloads so fetch automatically sets the multipart boundary.
      if (init?.body instanceof FormData) {
        delete mergedHeaders["Content-Type"];
        delete mergedHeaders["content-type"];
      }

      let response: Response;
      try {
        response = await fetch(targetUrl, {
          ...init,
          headers: mergedHeaders,
          signal: init?.signal || controller.signal,
        });
      } finally {
        // Guarantee timer cleanup to prevent memory leaks and premature aborts.
        clearTimeout(timer);
      }

      // Accept successful 2xx responses and genuine client validation errors.
      // A 404 indicates missing endpoint implementation on that tier, which should trigger failover.
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 404)) {
        return response;
      }

      // Record non-successful status code before falling back to the next tier.
      errors.push(`Tier ${target.tier} (${targetUrl}) returned status ${response.status}`);
    } catch (err: unknown) {
      // Capture network drops, DNS failures, or timeout abort errors.
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`Tier ${target.tier} (${targetUrl}) failed: ${errMsg}`);
    }
  }

  // Raise comprehensive error containing failover journey if every available endpoint failed.
  throw new Error(`All FastAPI endpoints failed. Failover trace: ${errors.join(" -> ")}`);
}
