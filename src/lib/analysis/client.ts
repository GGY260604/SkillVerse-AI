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
  const timeout = setTimeout(() => controller.abort(), 90_000);

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
        const errorMsg =
          typeof parsed.error === "string"
            ? parsed.error
            : parsed.errorCode || "Role matching failed";
        const err = new Error(errorMsg);
        if (parsed.errorCode) {
          (err as any).code = parsed.errorCode;
        }
        throw err;
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
          if (finalResult) break;
        }
        if (finalResult) {
          void reader.cancel().catch(() => {});
          break;
        }
      }

      if (!finalResult) {
        buffer += decoder.decode();
        if (buffer.trim()) processEvent(buffer);
      }
    } catch (error) {
      void reader.cancel().catch(() => {});
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

  const createdRoadmap = (assessment as any).createdRoadmap;

  const matchedStrengthsLocalized =
    selectedRole.matchedStrengthsLocalized ||
    createdRoadmap?.matchedStrengthsLocalized ||
    createdRoadmap?.matched_strengths_localized;

  const matchedStrengthsMs =
    (selectedRole as any).matchedStrengthsMs ||
    createdRoadmap?.matchedStrengthsMs ||
    createdRoadmap?.matched_strengths_ms ||
    matchedStrengthsLocalized?.ms ||
    [];

  const matchedStrengthsZh =
    (selectedRole as any).matchedStrengthsZh ||
    createdRoadmap?.matchedStrengthsZh ||
    createdRoadmap?.matched_strengths_zh ||
    matchedStrengthsLocalized?.zh ||
    [];

  const skillsGapLocalized =
    selectedRole.skillsGapLocalized ||
    createdRoadmap?.skillsGapLocalized ||
    createdRoadmap?.skills_gap_localized;

  const skillsGapMs =
    (selectedRole as any).skillsGapMs ||
    createdRoadmap?.skillsGapMs ||
    createdRoadmap?.skills_gap_ms ||
    skillsGapLocalized?.ms ||
    [];

  const skillsGapZh =
    (selectedRole as any).skillsGapZh ||
    createdRoadmap?.skillsGapZh ||
    createdRoadmap?.skills_gap_zh ||
    skillsGapLocalized?.zh ||
    [];

  const atRiskSkillsLocalized =
    selectedRole.atRiskSkillsLocalized ||
    createdRoadmap?.atRiskSkillsLocalized ||
    createdRoadmap?.at_risk_skills_localized;

  const atRiskSkillsMs =
    (selectedRole as any).atRiskSkillsMs ||
    createdRoadmap?.atRiskSkillsMs ||
    createdRoadmap?.at_risk_skills_ms ||
    atRiskSkillsLocalized?.ms ||
    [];

  const atRiskSkillsZh =
    (selectedRole as any).atRiskSkillsZh ||
    createdRoadmap?.atRiskSkillsZh ||
    createdRoadmap?.at_risk_skills_zh ||
    atRiskSkillsLocalized?.zh ||
    [];

  let finalSkillsGap = selectedRole.skillsGap || [];
  let finalSkillsGapMs = skillsGapMs;
  let finalSkillsGapZh = skillsGapZh;
  let finalSkillsGapLocalized = skillsGapLocalized;

  // If candidate already mastered all baseline skills in the catalog (skillsGap is empty),
  // dynamically populate Skills to Acquire from the forward-looking skills synthesized across the roadmap phases!
  if (finalSkillsGap.length === 0 && phases.length > 0) {
    const extractedEn: string[] = [];
    const extractedMs: string[] = [];
    const extractedZh: string[] = [];

    phases.forEach((p) => {
      const enObj = p.tasks?.[0] || p.title;
      const msObj = p.objectivesLocalized?.ms?.[0] || p.titleLocalized?.ms || enObj;
      const zhObj = p.objectivesLocalized?.zh?.[0] || p.titleLocalized?.zh || enObj;

      if (enObj && !extractedEn.includes(enObj)) extractedEn.push(enObj);
      if (msObj && !extractedMs.includes(msObj)) extractedMs.push(msObj);
      if (zhObj && !extractedZh.includes(zhObj)) extractedZh.push(zhObj);
    });

    if (extractedEn.length > 0) {
      finalSkillsGap = extractedEn.slice(0, 4);
      finalSkillsGapMs = extractedMs.slice(0, 4);
      finalSkillsGapZh = extractedZh.slice(0, 4);
      finalSkillsGapLocalized = {
        en: finalSkillsGap,
        ms: finalSkillsGapMs,
        zh: finalSkillsGapZh,
      };
    }
  }

  return {
    id: assessment.assessmentId,
    isCurrent: true,
    code: `SV-${now.getFullYear()}-${roleCodeSuffix}`,
    date: dateStr,
    createdAt: dateStr,
    targetRole: selectedRole.titleLocalized || selectedRole.title,
    targetTitleLocalized: (selectedRole as any).targetTitleLocalized || createdRoadmap?.targetTitleLocalized || undefined,
    roleCategory: selectedRole.industry || "Target Horizon Role",
    description: `Targeting ${selectedRole.titleLocalized || selectedRole.title} in ${selectedRole.industry}. Aligned with UN ${selectedRole.sdgAlignments?.map((s) => s.targetCode).join(", ") || "SDG 8.2"}.`,
    descriptionLocalized: (selectedRole as any).descriptionLocalized || createdRoadmap?.descriptionLocalized || undefined,
    scenario: assessment.activeScenario,
    sdgs: selectedRole.sdgAlignments?.map((s) => s.targetCode) || ["SDG 8.2"],
    matchScore: Math.round(selectedRole.matchScore * 1000) / 10,
    matchScoreBasis: selectedRole.scenarioMultiplierApplied > 1 ? "BGE-M3 Vector + Scenario Multiplier" : "Soft Overlap + BGE-M3 Cosine",
    matchedStrengths: selectedRole.matchedStrengths || [],
    matchedStrengthsMs,
    matchedStrengthsZh,
    matchedStrengthsLocalized,
    skillsGap: finalSkillsGap,
    skillsGapMs: finalSkillsGapMs,
    skillsGapZh: finalSkillsGapZh,
    skillsGapLocalized: finalSkillsGapLocalized,
    atRiskSkills: selectedRole.atRiskCompetencies?.map((a) => a.skillName) || [],
    atRiskSkillsMs,
    atRiskSkillsZh,
    atRiskSkillsLocalized,
    roadmapWeeks: `${totalWeeks} Weeks`,
    roadmapHours: `${totalHours} Total Hours`,
    phases: phases.length > 0 ? phases : [],
  };
}
