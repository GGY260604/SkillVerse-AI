from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from .profile import UserSkillItem
from .analysis import MacroScenario


class SkillMatchStatus(str, Enum):
    MASTERED = "mastered"
    GAP = "gap"
    CRITICAL_DEFICIT = "critical_deficit"


class SkillEvaluationItem(BaseModel):
    skillName: str = Field(description="Canonical required skill name for the target benchmark role")
    skillNameLocalized: Optional[Dict[str, str]] = Field(
        default=None,
        description="Multilingual localized label for the skill across en, ms, zh",
    )
    status: SkillMatchStatus = Field(
        description="Mastery classification: mastered (>=75%), gap (40-74%), critical_deficit (<40%)"
    )
    score: float = Field(description="Numerical mastery score (0.0 to 1.0)")
    matchedUserSkill: Optional[str] = Field(
        default=None,
        description="Name of the candidate's skill that aligned with this required competency",
    )
    matchType: str = Field(
        default="unmatched",
        description="Mechanism used: 'exact', 'token_jaccard', 'semantic_bge_m3', or 'unmatched'",
    )
    proficiency: Optional[str] = Field(
        default=None,
        description="Candidate's claimed or evaluated proficiency: beginner, intermediate, advanced",
    )
    reskillEffortWeeks: int = Field(
        default=0,
        description="Estimated reskilling duration in weeks needed to bridge this specific competency",
    )
    reskillEffortLabel: str = Field(
        default="0 Weeks - Ready",
        description="Human-friendly label describing reskilling runway",
    )


class TeamMemberInput(BaseModel):
    userId: str = Field(description="Unique candidate identifier or UUID")
    name: str = Field(description="Candidate display name")
    email: Optional[str] = Field(default=None, description="Candidate email address")
    currentRole: Optional[str] = Field(default=None, description="Current occupational title")
    department: Optional[str] = Field(default=None, description="Current department or industry sector")
    skills: List[UserSkillItem] = Field(
        default_factory=list,
        description="List of skills possessed by the candidate with proficiency levels",
    )
    matchedStrengths: Optional[List[str]] = Field(
        default=None,
        description="Pre-analyzed matched strengths from an existing roadmap if available",
    )
    skillsGap: Optional[List[str]] = Field(
        default=None,
        description="Pre-analyzed skill gaps from an existing roadmap if available",
    )


class TeamMemberAnalysis(BaseModel):
    userId: str
    name: str
    email: Optional[str] = None
    currentRole: Optional[str] = None
    department: Optional[str] = None
    overallMatchScore: float = Field(description="Normalized qualification fit score (0.0 to 1.0)")
    matchPercentage: int = Field(description="Integer match score (0 to 100%)")
    rank: int = Field(description="Rank within the cohort (1 = closest candidate to target role)")
    readinessLevel: str = Field(description="Overall cohort readiness classification")
    readinessLevelLocalized: Dict[str, str] = Field(
        default_factory=dict,
        description="Trilingual readiness badge text: en, ms, zh",
    )
    skillsStatus: Dict[str, SkillEvaluationItem] = Field(
        description="Competency map keyed by each benchmark required skill"
    )
    masteredCount: int = Field(description="Count of benchmark competencies already mastered")
    gapCount: int = Field(description="Count of bridgeable competency gaps")
    criticalDeficitCount: int = Field(description="Count of critical missing competencies")
    estimatedReskillingWeeks: int = Field(
        description="Total estimated team reskilling runway in weeks for this candidate"
    )


class SkillDeficitMetric(BaseModel):
    skillName: str = Field(description="Required competency name")
    masteredCount: int = Field(description="Number of team members who have mastered this skill")
    gapCount: int = Field(description="Number of team members with a bridgeable gap")
    deficitCount: int = Field(description="Number of team members with critical deficit")
    teamDeficitPercentage: float = Field(
        description="Percentage of cohort requiring training for this skill"
    )


class CohortTrainingRecommendation(BaseModel):
    skillName: str = Field(description="Target skill for the cohort training module")
    courseTitle: str = Field(description="Recommended course or curriculum title")
    platform: str = Field(description="Provider platform, e.g. HRD Corp Malaysia, Coursera, edX")
    isHrdCorpClaimable: bool = Field(
        default=True,
        description="Whether this training can be claimed under Malaysian HRD Corp levy",
    )
    isFree: bool = Field(default=False, description="Whether free audit track is available")
    durationHours: int = Field(default=16, description="Total learning hours")
    targetTeamMembers: List[str] = Field(
        default_factory=list,
        description="List of candidate names who should participate in this training cohort",
    )


class TeamMatrixCohortSummary(BaseModel):
    totalCandidates: int = Field(description="Total number of candidates analyzed in this cohort")
    averageReadiness: float = Field(description="Average qualification fit percentage across the cohort")
    topCandidateName: Optional[str] = Field(default=None, description="Name of the closest candidate")
    topCandidateScore: Optional[int] = Field(default=None, description="Match score of closest candidate")
    skillDeficits: List[SkillDeficitMetric] = Field(
        default_factory=list,
        description="Team-wide deficit breakdown sorted from most urgent gap to least",
    )
    cohortTrainingRecommendations: List[CohortTrainingRecommendation] = Field(
        default_factory=list,
        description="Actionable group upskilling modules eligible for corporate funding/levy",
    )


class TeamSkillMatrixRequest(BaseModel):
    targetRoleId: Optional[str] = Field(
        default=None,
        description="Unique role identifier from ESCO catalog (e.g. 'role-ai-solutions-architect')",
    )
    targetRoleTitle: Optional[str] = Field(
        default=None,
        description="Title of target benchmark role (standard or custom novel role)",
    )
    customRequiredSkills: Optional[List[str]] = Field(
        default=None,
        description="Optional explicit list of 5-8 benchmark skills if user defined custom role",
    )
    teamMembers: List[TeamMemberInput] = Field(
        ...,
        min_items=1,
        description="Array of team members to evaluate and rank against the target role benchmark",
    )
    locale: str = Field(default="en", description="Active user interface language (en, ms, zh)")
    macroScenario: Optional[MacroScenario] = Field(
        default=MacroScenario.MODERATE,
        description="Macroeconomic scenario multiplier: moderate, accelerated_ai, green_economy",
    )


class TeamSkillMatrixResponse(BaseModel):
    targetRoleId: str = Field(description="Canonical role identifier")
    targetRoleTitle: str = Field(description="Canonical role title")
    targetRoleTitleLocalized: Optional[Dict[str, str]] = Field(
        default=None,
        description="Localized role title across en, ms, zh",
    )
    industry: str = Field(description="Industry sector")
    requiredSkills: List[str] = Field(
        description="The 5-8 essential required competencies for this benchmark role"
    )
    candidates: List[TeamMemberAnalysis] = Field(
        description="Ranked candidate evaluations sorted from closest match to furthest"
    )
    cohortSummary: TeamMatrixCohortSummary = Field(
        description="High-level cohort intelligence and reskilling ROI insights for management"
    )
    analyzedAt: str = Field(description="ISO 8601 evaluation timestamp")
