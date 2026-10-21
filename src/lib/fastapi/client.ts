/**
 * SkillVerse AI - FastAPI Connection Resolver
 *
 * Resolves the base access link and headers dynamically:
 * - If both RUNPOD_API_ENDPOINT and RUNPOD_API_KEY exist, routes to RunPod with auth headers.
 * - If either is missing, falls back to LOCAL_PYTHON_ENDPOINT (Dev Mode).
 */

export interface FastApiConfig {
  mode: "runpod" | "local";
  baseUrl: string;
  headers: Record<string, string>;
}

/**
 * Resolves the active FastAPI connection config (base URL and headers)
 * based on current environment variables.
 */
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

  // If BOTH RunPod endpoint and RunPod API Key are provided, route to RunPod.
  if (runpodEndpoint && runpodKey) {
    const cleanRunpodUrl = runpodEndpoint.replace(/\/+$/, "");
    return {
      mode: "runpod",
      baseUrl: cleanRunpodUrl,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${runpodKey}`,
        "x-api-key": runpodKey,
      },
    };
  }

  // Fallback to Local Python Endpoint (Dev Mode)
  const cleanLocalUrl = (localEndpoint || "http://127.0.0.1:8000").replace(/\/+$/, "");
  return {
    mode: "local",
    baseUrl: cleanLocalUrl,
    headers: {
      "Content-Type": "application/json",
    },
  };
}

/**
 * Returns the resolved base access URL for FastAPI endpoints.
 */
export function getFastApiBaseUrl(): string {
  return getFastApiConfig().baseUrl;
}
