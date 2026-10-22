import { PlanData, PlanPhase } from "@/components/analysis/planCard/planData";
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
// Upload a CV through the server-side extraction route.
export async function extractProfileDocument(file: File): Promise<ExtractionResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/analysis/extract", {
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
// Execute synchronous workforce profile evaluation through the server-side route.
export async function analyzeWorkforceProfile(
  payload: AnalyzeRequestPayload
): Promise<AnalyzeResponsePayload> {
  const response = await fetch("/api/analysis/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "analyze", ...payload }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Analysis failed (${response.status}): ${errText}`);
  }

  return response.json();
}

// 3. Streaming Profile Evaluation
// Stream progress events from the server-side role evaluation route.
export async function analyzeWorkforceProfileStream(
  payload: AnalyzeRequestPayload,
  onProgress: (event: StreamProgressEvent) => void,
  requestSignal?: AbortSignal
): Promise<AnalyzeResponsePayload> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  if (requestSignal?.aborted) {
    controller.abort();
  } else {
    requestSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  try {
    const response = await fetch("/api/analysis/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stream", ...payload }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Role matching failed (${response.status}): ${errorBody}`);
    }
    if (!response.body) {
      throw new Error("Role matching response did not include a progress stream.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let finalResult: AnalyzeResponsePayload | null = null;

    const processEvent = (chunk: string) => {
      const eventData = chunk
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!eventData.trim() || eventData.trim() === "[DONE]") return;

      let parsed: StreamProgressEvent & {
        result?: AnalyzeResponsePayload;
        errorCode?: string;
      };
      try {
        parsed = JSON.parse(eventData);
      } catch {
        throw new Error("Received invalid analysis progress data.");
      }

      onProgress(parsed);
      if (parsed.error) {
        throw new Error(parsed.errorCode || parsed.error);
      }
      if (parsed.result) finalResult = parsed.result;
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || "";
        for (const event of events) {
          processEvent(event);
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) processEvent(buffer);
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    } finally {
      reader.releaseLock();
    }

    if (!finalResult) {
      throw new Error("Role matching stream ended without a result.");
    }

    return finalResult;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("MATCHING_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    requestSignal?.removeEventListener("abort", abortFromCaller);
  }
}

// 4. Role Roadmap Synthesis
// Synthesize a personalized reskilling roadmap for the selected candidate role.
export async function synthesizeSelectedRoadmap(
  payload: SynthesizeRoadmapRequest
): Promise<SynthesizeRoadmapResponse> {
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
