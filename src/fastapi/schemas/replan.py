from typing import List, Optional
from pydantic import BaseModel, Field


class ModifiedMilestoneItem(BaseModel):
    phaseIndex: int = Field(description="Milestone phase index (1, 2, or 3)")
    previousCourseTitle: str = Field(description="Legacy or lower-demand course being replaced")
    newCourseTitle: str = Field(description="Modern trending alternative course")
    newCourseUrl: str = Field(description="Direct URL to newly recommended course (Coursera, edX, or HRD Corp)")
    replacementReason: str = Field(description="Detailed explanation of market shift, velocity increase, or employer demand")


class ReplanRequestPayload(BaseModel):
    roadmapId: str = Field(default="plan-current", description="Roadmap or assessment ID to evaluate for drift")
    targetRoleId: Optional[str] = Field(default="ai-ops-specialist", description="Target occupational role ID")
    currentCourses: Optional[List[str]] = Field(
        default_factory=lambda: [
            "Manual Data Entry in Excel",
            "Intro to Basic Scripting",
            "Routine Report Preparation",
        ],
        description="List of current course titles in the roadmap",
    )
    macroScenario: Optional[str] = Field(default="accelerated_ai", description="Active macro scenario")
    locale: str = Field(default="en", description="User interface locale (en, ms, zh)")


class ShiftAdvisoryPayload(BaseModel):
    roadmapId: str = Field(description="Associated roadmap identifier")
    hasDriftDetected: bool = Field(description="Whether a significant labor market or skill demand drift was detected")
    driftMagnitude: float = Field(ge=0.0, le=1.0, description="Magnitude of vector / velocity drift (0.0 to 1.0)")
    updatedAt: str = Field(description="ISO timestamp of re-planning execution")
    advisoryMessage: str = Field(description="Human-friendly advisory notification detailing market change")
    modifiedMilestones: List[ModifiedMilestoneItem] = Field(
        default_factory=list,
        description="List of swapped or modernized milestone learning modules",
    )
