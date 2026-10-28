from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class SkillSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=120, description="Skill name or search keyword (in EN, MS, or ZH)")
    locale: str = Field(default="en", description="User interface language code: en, ms, or zh")


class TrendTimeSeriesPoint(BaseModel):
    period: str = Field(description="Canonical period label (e.g. Q1 2025, Current, Q1 2026 (Est))")
    periodLocalized: Dict[str, str] = Field(description="Trilingual period labels: en, ms, zh")
    demandIndex: float = Field(description="Normalized market demand index on a 0 - 100 scale")
    postingVolume: float = Field(description="Estimated posting or citation volume count")
    velocityAtPoint: float = Field(description="Instantaneous velocity score at this timeframe")
    isProjected: bool = Field(default=False, description="True if this point is an extrapolated future forecast")


class SkillTrendVisualization(BaseModel):
    velocityScore: float = Field(description="Velocity metric Vs = (Ct - Ct-1) / Ct-1")
    growthRatePercent: str = Field(description="Human-readable formatted percentage (e.g. '+65.0%')")
    status: str = Field(description="Market classification: emerging, stable, or declining")
    statusLocalized: Dict[str, str] = Field(description="Trilingual status labels: en, ms, zh")
    trendDirection: str = Field(description="Trend momentum: surging, growing, stable, contracting, or declining")
    marketDemand: str = Field(description="Demand tier: High Growth, Stable Core, or Automation Risk")
    marketDemandLocalized: Dict[str, str] = Field(description="Trilingual market demand labels: en, ms, zh")
    historicalBaseline: float = Field(description="Past sampling window frequency (Ct-1)")
    currentDemand: float = Field(description="Current sampling window frequency (Ct)")
    timeSeries: List[TrendTimeSeriesPoint] = Field(default_factory=list, description="Chronological time series for visualization charts")
    analysisSummary: Dict[str, str] = Field(description="Trilingual narrative summary explaining trend drivers and reskilling impact")


class EscoRoleSuggested(BaseModel):
    roleId: str = Field(description="Canonical unique slug role identifier")
    title: str = Field(description="Canonical English role title")
    titleLocalized: Dict[str, str] = Field(description="Trilingual role titles: en, ms, zh")
    industry: str = Field(description="Industry sector, e.g. Responsible AI, Clean Energy")
    industryLocalized: Optional[Dict[str, str]] = Field(default=None, description="Trilingual industry labels: en, ms, zh")
    similarityScore: float = Field(description="BGE-M3 semantic similarity / affinity score (0.0 - 1.0)")
    requiredSkills: List[str] = Field(description="Essential professional competencies in English")
    requiredSkillsLocalized: Dict[str, List[str]] = Field(description="Trilingual essential skills: en, ms, zh")
    sdgAlignments: List[Dict[str, Any]] = Field(default_factory=list, description="UN Sustainable Development Goal alignments")
    radarRequirements: Dict[str, int] = Field(default_factory=dict, description="Five-axis radar chart proficiency requirements (0-100)")
    scenarioMultipliers: Optional[Dict[str, Any]] = Field(default=None, description="Demand multipliers and velocity metadata across macroeconomic scenarios")
    isNewlyCreated: bool = Field(default=False, description="True if dynamically synthesized and added to the ESCO database")
    roleVelocity: float = Field(default=0.0, description="Composite occupational growth velocity V_role (-1.0 to +1.0)")
    roleGrowthRatePercent: str = Field(default="+0.0%", description="Formatted percentage growth string, e.g. '+48.0%' or '-32.0%'")
    roleTrendStatus: str = Field(default="stable", description="Market viability tier: on_trend, stable, or falling_behind")
    roleTrendStatusLocalized: Dict[str, str] = Field(default_factory=dict, description="Trilingual role status badge labels: en, ms, zh")
    pursueRecommendation: Dict[str, str] = Field(default_factory=dict, description="Trilingual 1-line guidance on whether to pursue or upskill")


class SkillSearchResponse(BaseModel):
    success: bool = Field(default=True, description="Request execution status")
    query: str = Field(description="Original user query string")
    matchedSkillName: str = Field(description="Canonical English skill name")
    matchedSkillLocalized: Dict[str, str] = Field(description="Trilingual skill names: en, ms, zh")
    category: str = Field(description="Canonical skill category")
    categoryLocalized: Dict[str, str] = Field(description="Trilingual category names: en, ms, zh")
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="Citation references and source URLs")
    isNewSkillSynthesized: bool = Field(default=False, description="True if skill was generated on-demand and persisted to database")
    visualization: SkillTrendVisualization = Field(description="Visualization metrics and time-series points")
    suggestedRoles: List[EscoRoleSuggested] = Field(default_factory=list, description="Top 5 closest occupational roles in ESCO format")
    locale: str = Field(default="en", description="Response target language locale")
    tierUsed: Optional[str] = Field(default=None, description="Inference tier used: qwen, gemini, deterministic, or database")
