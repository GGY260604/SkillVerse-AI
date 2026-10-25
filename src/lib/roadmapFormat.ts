/**
 * Roadmap Data Formatter Utilities
 * Transform database roadmap records and associated phase milestones into typed frontend PlanData structures.
 *
 * Requirements:
 * - Attribute mapping: Normalize database fields into camelCase frontend PlanData schema.
 * - Trilingual preservation: Propagate localized role titles, descriptions, and skill taxonomies.
 *
 * Workflow:
 * 1. Convert database entity attributes and timestamps into standard date representations.
 * 2. Parse recommended learning courses and normalize chronological phase milestones.
 * 3. Assemble and return formatted PlanData object consumed by frontend components.
 */
import { PlanData, PlanPhase, CourseItem } from "@/components/page-analysis/planCard/planData";

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
  matchedStrengthsMs?: string[];
  matchedStrengthsZh?: string[];
  matchedStrengthsLocalized?: any;
  skillsGap: string[];
  skillsGapMs?: string[];
  skillsGapZh?: string[];
  skillsGapLocalized?: any;
  atRiskSkills: string[];
  atRiskSkillsMs?: string[];
  atRiskSkillsZh?: string[];
  atRiskSkillsLocalized?: any;
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

// ==========================================
// Step 1: Format Database Entity Attributes and Timestamps
// ==========================================
export function formatRoadmapToPlanData(roadmap: DatabaseRoadmap): PlanData {
  const isCurrent = roadmap.status === "current";
  const createdRaw = roadmap.createdAt || (roadmap as any).created_at;
  const createdDate = new Date(createdRaw);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const formattedDate = !isNaN(createdDate.getTime())
    ? `${createdDate.getFullYear()}-${pad(createdDate.getMonth() + 1)}-${pad(createdDate.getDate())}`
    : String(createdRaw || "").split("T")[0].split(" ")[0];
  const dateStr = formattedDate;

  // Generate standardized plan code identifier based on year and target role suffix.
  const roleCodeSuffix = (roadmap.targetRoleId || (roadmap as any).target_role_id || "ROLE")
    .replace(/^role-|^custom-/, "")
    .slice(0, 6)
    .toUpperCase();

  // Sort learning phases sequentially by designated phase index.
  const rawPhases = (roadmap.phases || (roadmap as any).roadmap_phases || []) as any[];
  const sortedPhases = rawPhases.sort(
    (a, b) => (a.phaseIndex ?? a.phase_index ?? 0) - (b.phaseIndex ?? b.phase_index ?? 0)
  );

  // ==========================================
  // Step 2: Phase Normalization and Recommended Course Parsing
  // ==========================================
  const phases: PlanPhase[] = sortedPhases.map((p: any) => {
    // Parse recommended courses array from JSON or direct object array.
    let courses: CourseItem[] = [];
    const rawCourses = p.recommendedCourses ?? p.recommended_courses;
    if (Array.isArray(rawCourses)) {
      courses = rawCourses;
    } else if (typeof rawCourses === "string") {
      try {
        courses = JSON.parse(rawCourses);
      } catch {
        courses = [];
      }
    }

    const courseDetails = courses
      .map((c) => `${c.title} (${c.platform})`)
      .join(" • ");

    const phaseIndex = p.phaseIndex ?? p.phase_index ?? 1;
    const durationWeeks = p.durationWeeks ?? p.duration_weeks ?? 3;
    const phaseTitle = p.phaseTitle ?? p.phase_title ?? `Phase ${phaseIndex}`;
    const descLocalized = p.descriptionLocalized ?? p.description_localized;
    const titleLocalized = p.titleLocalized ?? p.title_localized;
    const learningObjs = p.learningObjectives ?? p.learning_objectives ?? [];
    const objLocalized = p.objectivesLocalized ?? p.objectives_localized;

    return {
      id: p.id,
      phaseIndex,
      phase: `Phase ${phaseIndex} • ${durationWeeks} Weeks`,
      weeks: `${durationWeeks} Weeks`,
      durationWeeks,
      estimatedHours: p.estimatedHours ?? p.estimated_hours ?? 15,
      badge: p.badge || undefined,
      badgeType: (p.badgeType ?? p.badge_type) || undefined,
      title: phaseTitle,
      titleLocalized: titleLocalized || undefined,
      desc: p.description || learningObjs[0] || "Core Competency Acquisition",
      descriptionLocalized: descLocalized || undefined,
      detail: courseDetails || p.detail || p.course_detail || "Verified Course Track",
      tasks: learningObjs,
      objectivesLocalized: objLocalized || undefined,
      recommendedCourses: courses,
      isCompleted: Boolean(p.isCompleted ?? p.is_completed),
      sdgGoal: (descLocalized as Record<string, unknown> | null)?.sdgGoal as string | undefined,
      sdgTitle: (descLocalized as Record<string, unknown> | null)?.sdgTitle as string | undefined,
      sdgExplanation: (descLocalized as Record<string, unknown> | null)?.sdgExplanation as string | undefined,
      sdgExplanationLocalized: (descLocalized as Record<string, unknown> | null)?.sdgExplanationLocalized as Record<string, string> | undefined,
    };
  });

function pickArray(...candidates: any[]): string[] {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  return [];
}

  // ==========================================
  // Step 3: Assemble Formatted Plan Data Structure
  // ==========================================
  // Build and return final plan data object consumed by frontend components.
  return {
    id: roadmap.id,
    isCurrent,

    code: `SV-${createdDate.getFullYear()}-${roleCodeSuffix}`,
    date: dateStr,
    createdAt: formattedDate,
    targetRole: roadmap.targetRoleTitle || (roadmap as any).target_role_title || "Target Horizon Role",
    targetTitleLocalized: roadmap.targetTitleLocalized || (roadmap as any).target_title_localized || undefined,
    roleCategory: roadmap.roleCategory || (roadmap as any).role_category || "Target Horizon Role",
    description: roadmap.description || "",
    descriptionLocalized: roadmap.descriptionLocalized || (roadmap as any).description_localized || undefined,
    scenario: roadmap.scenario,
    sdgs: roadmap.sdgs || ["SDG 8.2"],
    matchScore: Math.round(((roadmap.matchScore ?? (roadmap as any).match_score) || 0) * 1000) / 10,
    matchScoreBasis:
      roadmap.matchScoreBasis || (roadmap as any).match_score_basis || "BGE-M3 Vector + Soft Overlap",
    matchedStrengths: pickArray(roadmap.matchedStrengths, (roadmap as any).matched_strengths),
    matchedStrengthsMs: pickArray(
      roadmap.matchedStrengthsMs,
      (roadmap as any).matched_strengths_ms,
      roadmap.matchedStrengthsLocalized?.ms,
      (roadmap as any).matched_strengths_localized?.ms
    ),
    matchedStrengthsZh: pickArray(
      roadmap.matchedStrengthsZh,
      (roadmap as any).matched_strengths_zh,
      roadmap.matchedStrengthsLocalized?.zh,
      (roadmap as any).matched_strengths_localized?.zh
    ),
    matchedStrengthsLocalized:
      roadmap.matchedStrengthsLocalized || (roadmap as any).matched_strengths_localized || undefined,
    skillsGap: pickArray(roadmap.skillsGap, (roadmap as any).skills_gap),
    skillsGapMs: pickArray(
      roadmap.skillsGapMs,
      (roadmap as any).skills_gap_ms,
      roadmap.skillsGapLocalized?.ms,
      (roadmap as any).skills_gap_localized?.ms
    ),
    skillsGapZh: pickArray(
      roadmap.skillsGapZh,
      (roadmap as any).skills_gap_zh,
      roadmap.skillsGapLocalized?.zh,
      (roadmap as any).skills_gap_localized?.zh
    ),
    skillsGapLocalized:
      roadmap.skillsGapLocalized || (roadmap as any).skills_gap_localized || undefined,
    atRiskSkills: pickArray(roadmap.atRiskSkills, (roadmap as any).at_risk_skills),
    atRiskSkillsMs: pickArray(
      roadmap.atRiskSkillsMs,
      (roadmap as any).at_risk_skills_ms,
      roadmap.atRiskSkillsLocalized?.ms,
      (roadmap as any).at_risk_skills_localized?.ms
    ),
    atRiskSkillsZh: pickArray(
      roadmap.atRiskSkillsZh,
      (roadmap as any).at_risk_skills_zh,
      roadmap.atRiskSkillsLocalized?.zh,
      (roadmap as any).at_risk_skills_localized?.zh
    ),
    atRiskSkillsLocalized:
      roadmap.atRiskSkillsLocalized || (roadmap as any).at_risk_skills_localized || undefined,
    roadmapWeeks: `${roadmap.totalWeeks || (roadmap as any).total_weeks || 10} Weeks`,
    roadmapHours: `${roadmap.totalHours || (roadmap as any).total_hours || 45} Total Hours`,
    phases,
    historyNote: !isCurrent ? "Archived previous milestone iteration." : undefined,
  };
}
