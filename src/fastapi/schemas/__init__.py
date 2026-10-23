from .profile import (
    EmploymentStatus,
    SkillProficiency,
    UserSkillItem,
    ProfileIntakePayload,
    ExtractionResponse,
)
from .analysis import (
    MacroScenario,
    AnalyzeProfileData,
    AnalyzeRequestPayload,
    MatchedRole,
    SdgAlignmentItem,
    AtRiskSkillItem,
    RecommendedCourse,
    RoadmapMilestone,
    SelectedRoleRoadmap,
    RadarAxisItem,
    AnalyzeResponsePayload,
    SynthesizeRoadmapRequest,
    SynthesizeRoadmapResponse,
)
from .quiz import (
    QuizQuestion,
    PhaseQuizRequest,
    PhaseQuizResponse,
)
from .team import (
    SkillMatchStatus,
    SkillEvaluationItem,
    TeamMemberInput,
    TeamMemberAnalysis,
    SkillDeficitMetric,
    CohortTrainingRecommendation,
    TeamMatrixCohortSummary,
    TeamSkillMatrixRequest,
    TeamSkillMatrixResponse,
)

from .trends import (
    SkillSearchRequest,
    TrendTimeSeriesPoint,
    SkillTrendVisualization,
    EscoRoleSuggested,
    SkillSearchResponse,
)

__all__ = [
    # Profile schemas
    "EmploymentStatus",
    "SkillProficiency",
    "UserSkillItem",
    "ProfileIntakePayload",
    "ExtractionResponse",
    # Analysis schemas
    "MacroScenario",
    "AnalyzeProfileData",
    "AnalyzeRequestPayload",
    "MatchedRole",
    "SdgAlignmentItem",
    "AtRiskSkillItem",
    "RecommendedCourse",
    "RoadmapMilestone",
    "SelectedRoleRoadmap",
    "RadarAxisItem",
    "AnalyzeResponsePayload",
    "SynthesizeRoadmapRequest",
    "SynthesizeRoadmapResponse",
    # Quiz schemas
    "QuizQuestion",
    "PhaseQuizRequest",
    "PhaseQuizResponse",
    # Team analysis schemas
    "SkillMatchStatus",
    "SkillEvaluationItem",
    "TeamMemberInput",
    "TeamMemberAnalysis",
    "SkillDeficitMetric",
    "CohortTrainingRecommendation",
    "TeamMatrixCohortSummary",
    "TeamSkillMatrixRequest",
    "TeamSkillMatrixResponse",
    # Trend search schemas
    "SkillSearchRequest",
    "TrendTimeSeriesPoint",
    "SkillTrendVisualization",
    "EscoRoleSuggested",
    "SkillSearchResponse",
]

