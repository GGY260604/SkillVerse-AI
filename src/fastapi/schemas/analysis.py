from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from .profile import UserSkillItem


class MacroScenario(str, Enum):
    MODERATE = "moderate"
    ACCELERATED_AI = "accelerated_ai"
    GREEN_ECONOMY = "green_economy"


class AnalyzeProfileData(BaseModel):
    employmentStatus: str = Field(default="employed_at_risk")
    currentJobTitle: Optional[str] = None
    industry: Optional[str] = None
    educationLevel: Optional[str] = None
    yearsOfExperience: Optional[str] = None
    skills: List[UserSkillItem] = Field(default_factory=list)
    toolsAndSoftware: Optional[List[str]] = Field(default_factory=list)
    languages: Optional[List[str]] = Field(default_factory=list)
    careerGoal: Optional[str] = Field(default="explore")
    targetSectors: Optional[List[str]] = Field(default_factory=list)
    targetJobTitle: Optional[str] = None
    workArrangement: Optional[str] = Field(default="any")
    weeklyCommitmentHours: Optional[str] = Field(default="3-5")
    learningProviders: Optional[List[str]] = Field(default_factory=lambda: ["free_open", "hrd_corp"])
    outputLanguage: Optional[str] = Field(default="en")


class AnalyzeRequestPayload(BaseModel):
    sessionId: Optional[str] = Field(default=None, description="Client session UUID or local storage key")
    userId: Optional[str] = Field(default=None, description="Authenticated Supabase user ID if logged in")
    locale: str = Field(default="en", description="Active user interface language (en, ms, zh)")
    macroScenario: MacroScenario = Field(
        default=MacroScenario.MODERATE,
        description="Macro scenario toggle: moderate, accelerated_ai, or green_economy",
    )
    profile: AnalyzeProfileData = Field(..., description="Verified profile intake payload")
    targetRoleId: Optional[str] = Field(default=None, description="Optional specific role ID chosen by the user")
    autoSynthesizeRoadmap: bool = Field(default=True, description="Whether to immediately synthesize the roadmap")


class SdgAlignmentItem(BaseModel):
    targetCode: str = Field(default="SDG 8.2", description="UN SDG target identifier, e.g. SDG 8.2")
    targetTitle: str = Field(default="Technological upgrading & economic productivity", description="Descriptive title of the target")
    affinityScore: float = Field(default=0.85, description="Semantic affinity score (0.0 - 1.0)")
    impactExplanation: Optional[str] = Field(
        default=None,
        description="Clear explanation of how pursuing this role advances this UN SDG target",
    )


class AtRiskSkillItem(BaseModel):
    skillName: str = Field(description="Name of the skill facing automation pressure")
    velocityScore: float = Field(description="Trend velocity Vs (negative indicates declining)")
    riskReason: str = Field(description="Explanation of why this skill is at risk of displacement")


class MatchedRole(BaseModel):
    roleId: str = Field(description="Unique identifier for the prospective role")
    title: str = Field(description="Canonical English role title")
    titleLocalized: str = Field(description="Role title translated to user locale")
    industry: str = Field(description="Industry sector, e.g. Clean Energy, Responsible AI")
    matchScore: float = Field(description="Calculated deterministic match score (0.0 - 1.0)")
    scenarioMultiplierApplied: float = Field(default=1.0, description="Multiplier from the active macro scenario")
    sdgAlignments: List[SdgAlignmentItem] = Field(default_factory=list)
    matchedStrengths: List[str] = Field(default_factory=list, description="Overlapping skills already possessed")
    skillsGap: List[str] = Field(default_factory=list, description="Missing competencies required for role")
    atRiskCompetencies: List[AtRiskSkillItem] = Field(default_factory=list)


class RecommendedCourse(BaseModel):
    title: str = Field(description="Course or certification title")
    titleLocalized: Optional[Dict[str, str]] = Field(default=None, description="Trilingual course title: en, ms, zh")
    platform: str = Field(description="Provider platform, e.g. Coursera, edX, freeCodeCamp, HRD Corp")
    url: str = Field(description="Direct URL to course details or enrollment")
    isHrdCorpClaimable: bool = Field(default=False, description="Whether claimable under HRD Corp Malaysia")
    isFree: bool = Field(default=True, description="Whether free / audit track is available")
    durationHours: Optional[int] = Field(default=None, description="Estimated total study hours")


class RoadmapMilestone(BaseModel):
    phaseIndex: int = Field(description="Phase sequence (1 = Foundation, 2 = Applied, 3 = Capstone)")
    phaseTitle: str = Field(description="Canonical milestone title")
    titleLocalized: Optional[Dict[str, str]] = Field(default=None, description="Trilingual phase title: en, ms, zh")
    description: Optional[str] = Field(default=None, description="Phase overview description")
    descriptionLocalized: Optional[Dict[str, str]] = Field(default=None, description="Trilingual phase description: en, ms, zh")
    durationWeeks: int = Field(description="Estimated duration in weeks")
    estimatedHours: int = Field(description="Total estimated learning hours")
    learningObjectives: List[str] = Field(default_factory=list, description="Canonical objectives")
    objectivesLocalized: Optional[Dict[str, List[str]]] = Field(default=None, description="Trilingual objectives: en, ms, zh")
    recommendedCourses: List[RecommendedCourse] = Field(default_factory=list)
    sdgGoal: Optional[str] = Field(default="SDG 8.2", description="Associated UN SDG target code, e.g. SDG 4.4, SDG 8.2, SDG 9.4")
    sdgTitle: Optional[str] = Field(default="Decent Work & Economic Productivity", description="Title of the associated UN SDG goal")
    sdgExplanation: Optional[str] = Field(default=None, description="Explanation of how this phase connects to the UN SDG goal and protects from automation")
    sdgExplanationLocalized: Optional[Dict[str, str]] = Field(default=None, description="Trilingual SDG explanation: en, ms, zh")


class SelectedRoleRoadmap(BaseModel):
    targetRoleId: str = Field(description="Role ID this roadmap was synthesized for")
    totalWeeks: int = Field(description="Total estimated roadmap completion time in weeks")
    milestones: List[RoadmapMilestone] = Field(default_factory=list)


class RadarAxisItem(BaseModel):
    category: str = Field(description="Competency domain axis (e.g. AI & Digital, Data Literacy)")
    userLevel: int = Field(description="User score out of 100")
    requiredLevel: int = Field(description="Required role score out of 100")


class AnalyzeResponsePayload(BaseModel):
    assessmentId: str = Field(description="Unique assessment identifier")
    sessionId: str = Field(description="Associated session UUID")
    generatedAt: str = Field(description="ISO timestamp of analysis generation")
    activeScenario: MacroScenario = Field(description="Active macro scenario")
    radarData: List[RadarAxisItem] = Field(default_factory=list, description="Data points for Recharts radar chart")
    topRoles: List[MatchedRole] = Field(default_factory=list, description="Ranked top 3-5 resilient future roles")
    scenarioRoles: Optional[Dict[str, List[MatchedRole]]] = Field(
        default=None,
        description="Top matched roles evaluated across all macro scenarios (moderate, accelerated_ai, green_economy)",
    )
    selectedRoleRoadmap: Optional[SelectedRoleRoadmap] = Field(
        default=None,
        description="Synthesized reskilling roadmap for the chosen role",
    )


class SynthesizeRoadmapRequest(BaseModel):
    assessmentId: Optional[str] = Field(default=None, description="Existing assessment UUID if updating")
    sessionId: Optional[str] = Field(default=None, description="Client session UUID")
    userId: Optional[str] = Field(default=None, description="Authenticated user UUID if logged in")
    locale: str = Field(default="en", description="Target locale (en, ms, zh)")
    macroScenario: MacroScenario = Field(default=MacroScenario.MODERATE)
    targetRoleId: str = Field(..., description="Role ID selected by the user")
    profile: AnalyzeProfileData = Field(..., description="Candidate profile data")
    topRoles: Optional[List[MatchedRole]] = Field(default=None, description="Previously evaluated top roles")
    radarData: Optional[List[RadarAxisItem]] = Field(default=None, description="Previously calibrated radar data")


class SynthesizeRoadmapResponse(BaseModel):
    assessmentId: str = Field(description="Saved assessment UUID in Supabase")
    sessionId: str = Field(description="Associated session UUID")
    generatedAt: str = Field(description="ISO timestamp")
    activeScenario: MacroScenario = Field(description="Active macro scenario")
    targetRoleId: str = Field(description="Target role ID")
    targetRoleTitle: str = Field(description="Target role canonical title")
    radarData: List[RadarAxisItem] = Field(default_factory=list)
    topRoles: List[MatchedRole] = Field(default_factory=list)
    selectedRoleRoadmap: SelectedRoleRoadmap = Field(description="Synthesized 3-phase reskilling roadmap")

