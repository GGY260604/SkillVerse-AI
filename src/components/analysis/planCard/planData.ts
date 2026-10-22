// Shared type contracts for persisted roadmap data.

export interface LocalizedStringMap {
  en?: string;
  ms?: string;
  zh?: string;
  [key: string]: string | undefined;
}

export interface LocalizedListMap {
  en?: string[];
  ms?: string[];
  zh?: string[];
  [key: string]: string[] | undefined;
}

export interface CourseItem {
  title: string;
  titleLocalized?: LocalizedStringMap;
  platform: string;
  url: string;
  isHrdCorpClaimable?: boolean;
  isFree?: boolean;
  durationHours?: number;
}

export interface PlanPhase {
  id: string;
  phaseIndex?: number;
  phase: string;
  weeks: string;
  durationWeeks?: number;
  estimatedHours?: number;
  badge?: string;
  badgeType?: "free" | "claimable" | "capstone" | "completed" | "superseded";
  title: string;
  titleLocalized?: LocalizedStringMap;
  desc: string;
  descriptionLocalized?: LocalizedStringMap;
  detail?: string;
  tasks: string[];
  objectivesLocalized?: LocalizedListMap;
  recommendedCourses?: CourseItem[];
  isCompleted?: boolean;
  sdgGoal?: string;
  sdgTitle?: string;
  sdgExplanation?: string;
  sdgExplanationLocalized?: LocalizedStringMap;
  verifiedArtifact?: {
    name: string;
    score: number;
    timestamp: string;
  };
}

export interface PlanData {
  id: string;
  isCurrent: boolean;
  code: string;
  date: string;
  createdAt?: string;
  targetRole: string;
  targetTitleLocalized?: LocalizedStringMap;
  roleCategory: string;
  description: string;
  descriptionLocalized?: LocalizedStringMap;
  scenario?: string;
  sdgs?: string[];
  matchScore: number;
  matchScoreBasis: string;
  matchedStrengths: string[];
  skillsGap: string[];
  atRiskSkills: string[];
  roadmapWeeks: string;
  roadmapHours: string;
  phases: PlanPhase[];
  historyNote?: string;
}
