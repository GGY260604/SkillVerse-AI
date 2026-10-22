import { PlanData, PlanPhase } from "@/components/analysis/planCard/planData";
import { fetchWithFastApiFallback, getFastApiTargets } from "@/lib/fastapi/client";
import {
  AnalyzeRequestPayload,
  AnalyzeResponsePayload,
  ExtractionResponse,
  MatchedRole,
  StreamProgressEvent,
  SynthesizeRoadmapRequest,
  SynthesizeRoadmapResponse,
} from "./types";

// --- Analysis Client Services ---
// Purpose: Orchestrate CV document extraction, workforce evaluation, and roadmap synthesis.

// 1. Document Profile Extraction
// Upload CV documents for OCR parsing and competency normalization with failover.
export async function extractProfileDocument(file: File): Promise<ExtractionResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchWithFastApiFallback("/api/v1/extract", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Profile extraction failed (${response.status}): ${errText}`);
  }

  return response.json();
}

// 2. Workforce Profile Evaluation
// Execute synchronous workforce profile evaluation across compute tiers.
export async function analyzeWorkforceProfile(
  payload: AnalyzeRequestPayload
): Promise<AnalyzeResponsePayload> {
  const response = await fetchWithFastApiFallback("/api/v1/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Analysis failed (${response.status}): ${errText}`);
  }

  return response.json();
}

// 3. Streaming Profile Evaluation
// Stream real-time progress events for the computational phases of role evaluation.
export async function analyzeWorkforceProfileStream(
  payload: AnalyzeRequestPayload,
  onProgress: (event: StreamProgressEvent) => void
): Promise<AnalyzeResponsePayload> {
  const isClient = typeof window !== "undefined";

  if (isClient) {
    const response = await fetch("/api/analysis/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stream", ...payload }),
    });

    if (!response.ok) {
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
            // Ignore malformed SSE chunk
          }
        }
      }
    }

    if (finalResult) {
      return finalResult;
    }

    return analyzeWorkforceProfile(payload);
  }

  // Server-side direct call: try streaming with failover
  const targets = getFastApiTargets();
  for (const target of targets) {
    try {
      const streamUrl = `${target.baseUrl}/api/v1/analyze/stream`;
      const response = await fetch(streamUrl, {
        method: "POST",
        headers: {
          ...target.headers,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
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
                if (parsed.result) finalResult = parsed.result;
              } catch {
                // Ignore malformed SSE chunk
              }
            }
          }
        }

        if (finalResult) return finalResult;
      }
    } catch {
      // Continue to next tier
    }
  }

  return analyzeWorkforceProfile(payload);
}

// 4. Role Roadmap Synthesis
// Synthesize a personalized reskilling roadmap for the selected candidate role.
export async function synthesizeSelectedRoadmap(
  payload: SynthesizeRoadmapRequest
): Promise<SynthesizeRoadmapResponse> {
  const isClient = typeof window !== "undefined";

  if (isClient) {
    const response = await fetch("/api/analysis/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "synthesize", ...payload }),
      credentials: "include",
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Roadmap synthesis failed (${response.status}): ${errText}`);
    }

    return response.json();
  }

  const response = await fetchWithFastApiFallback("/api/v1/analyze/synthesize-roadmap", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Roadmap synthesis failed (${response.status}): ${errText}`);
  }

  return response.json();
}

// 5. Plan Data Normalization
// Convert raw assessment payload into user interface PlanData structure.
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
