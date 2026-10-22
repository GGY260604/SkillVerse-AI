import { PlanData, PlanPhase, CourseItem } from "@/components/analysis/planCard/planData";

export interface DatabaseRoadmap {
  id: string;
  userId?: string | null;
  sessionId?: string | null;
  status: string;
  targetRoleId: string;
  targetRoleTitle: string;
  targetTitleLocalized?: any;
  roleCategory?: string | null;
  description?: string | null;
  descriptionLocalized?: any;
  scenario?: string;
  matchScore: number;
  matchScoreBasis?: string | null;
  sdgs: string[];
  matchedStrengths: string[];
  skillsGap: string[];
  atRiskSkills: string[];
  totalWeeks?: number | null;
  totalHours?: number | null;
  certificatesEarned?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  phases: Array<{
    id: string;
    phaseIndex: number;
    phaseTitle: string;
    titleLocalized?: any;
    durationWeeks: number;
    estimatedHours: number;
    badge?: string | null;
    badgeType?: string | null;
    description?: string | null;
    descriptionLocalized?: any;
    detail?: string | null;
    learningObjectives: string[];
    objectivesLocalized?: any;
    recommendedCourses?: any;
    isCompleted: boolean;
  }>;
}

/**
 * Transforms a Prisma/Database Roadmap record into the frontend typed PlanData.
 */
export function formatRoadmapToPlanData(roadmap: DatabaseRoadmap): PlanData {
  const isCurrent = roadmap.status === "current";
  const createdDate = new Date(roadmap.createdAt);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const formattedDate = !isNaN(createdDate.getTime())
    ? `${createdDate.getFullYear()}-${pad(createdDate.getMonth() + 1)}-${pad(createdDate.getDate())}`
    : String(roadmap.createdAt || "").split("T")[0].split(" ")[0];
  const dateStr = formattedDate;

  const roleCodeSuffix = (roadmap.targetRoleId || "ROLE")
    .replace(/^role-|^custom-/, "")
    .slice(0, 6)
    .toUpperCase();

  const sortedPhases = (roadmap.phases || []).sort(
    (a, b) => a.phaseIndex - b.phaseIndex
  );

  const phases: PlanPhase[] = sortedPhases.map((p) => {
    // Parse recommended courses array
    let courses: CourseItem[] = [];
    if (Array.isArray(p.recommendedCourses)) {
      courses = p.recommendedCourses;
    } else if (typeof p.recommendedCourses === "string") {
      try {
        courses = JSON.parse(p.recommendedCourses);
      } catch {
        courses = [];
      }
    }

    const courseDetails = courses
      .map((c) => `${c.title} (${c.platform})`)
      .join(" • ");

    return {
      id: p.id,
      phaseIndex: p.phaseIndex,
      phase: `Phase ${p.phaseIndex} • ${p.durationWeeks} Weeks`,
      weeks: `${p.durationWeeks} Weeks`,
      durationWeeks: p.durationWeeks,
      estimatedHours: p.estimatedHours,
      badge: p.badge || undefined,
      badgeType: (p.badgeType as any) || undefined,
      title: p.phaseTitle,
      titleLocalized: p.titleLocalized || undefined,
      desc: p.description || p.learningObjectives?.[0] || "Core Competency Acquisition",
      descriptionLocalized: p.descriptionLocalized || undefined,
      detail: courseDetails || p.detail || "Verified Course Track",
      tasks: p.learningObjectives || [],
      objectivesLocalized: p.objectivesLocalized || undefined,
      recommendedCourses: courses,
      isCompleted: Boolean(p.isCompleted),
      sdgGoal: (p.descriptionLocalized as Record<string, unknown> | null)?.sdgGoal as string | undefined,
      sdgTitle: (p.descriptionLocalized as Record<string, unknown> | null)?.sdgTitle as string | undefined,
      sdgExplanation: (p.descriptionLocalized as Record<string, unknown> | null)?.sdgExplanation as string | undefined,
      sdgExplanationLocalized: (p.descriptionLocalized as Record<string, unknown> | null)?.sdgExplanationLocalized as Record<string, string> | undefined,
    };
  });

  return {
    id: roadmap.id,
    isCurrent,
    code: `SV-${createdDate.getFullYear()}-${roleCodeSuffix}`,
    date: dateStr,
    createdAt: formattedDate,
    targetRole: roadmap.targetRoleTitle,
    targetTitleLocalized: roadmap.targetTitleLocalized || undefined,
    roleCategory: roadmap.roleCategory || "Target Horizon Role",
    description: roadmap.description || "",
    descriptionLocalized: roadmap.descriptionLocalized || undefined,
    scenario: roadmap.scenario,
    sdgs: roadmap.sdgs || ["SDG 8.2"],
    matchScore: Math.round(roadmap.matchScore * 1000) / 10,
    matchScoreBasis:
      roadmap.matchScoreBasis || "BGE-M3 Vector + Soft Overlap",
    matchedStrengths: roadmap.matchedStrengths || [],
    skillsGap: roadmap.skillsGap || [],
    atRiskSkills: roadmap.atRiskSkills || [],
    roadmapWeeks: `${roadmap.totalWeeks || 10} Weeks`,
    roadmapHours: `${roadmap.totalHours || 45} Total Hours`,
    phases,
    historyNote: !isCurrent ? "Archived previous milestone iteration." : undefined,
  };
}
