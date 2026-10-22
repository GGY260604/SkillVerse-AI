// --- Schema ---
// Purpose: Type definitions for workforce profiling, ESCO competencies, and AI synthesis.

export interface UserSkillItem {
  id: string;
  name: string;
  escoUri?: string | null;
  proficiency?: "beginner" | "intermediate" | "advanced";
  isAiExtracted?: boolean;
  localized_labels?: Record<string, string>;
}

export interface ProfileIntakePayload {
  employmentStatus: string;
  currentJobTitle?: string | null;
  industry?: string | null;
  educationLevel?: string | null;
  yearsOfExperience?: string | null;
  skills: UserSkillItem[];
  toolsAndSoftware?: string[];
  casualDescription?: string | null;
  languages?: string[];
  careerGoal?: string;
  targetSectors?: string[];
  targetJobTitle?: string | null;
  workArrangement?: string;
  weeklyCommitmentHours?: string;
  learningProviders?: string[];
  outputLanguage?: string;
}

export interface ExtractionResponse {
  success: boolean;
  message?: string;
  error?: string;
  extractedProfile?: ProfileIntakePayload;
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
  targetTitleLocalized?: { en?: string; ms?: string; zh?: string };
  descriptionLocalized?: { en?: string; ms?: string; zh?: string };
  industry: string;
  matchScore: number;
  scenarioMultiplierApplied: number;
  sdgAlignments: SdgAlignmentItem[];
  matchedStrengths: string[];
  matchedStrengthsMs?: string[];
  matchedStrengthsZh?: string[];
  matchedStrengthsLocalized?: { en?: string[]; ms?: string[]; zh?: string[] };
  skillsGap: string[];
  skillsGapMs?: string[];
  skillsGapZh?: string[];
  skillsGapLocalized?: { en?: string[]; ms?: string[]; zh?: string[] };
  atRiskCompetencies: AtRiskSkillItem[];
  atRiskSkillsMs?: string[];
  atRiskSkillsZh?: string[];
  atRiskSkillsLocalized?: { en?: string[]; ms?: string[]; zh?: string[] };
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
  errorCode?: string;
}
