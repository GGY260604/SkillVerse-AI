from enum import Enum
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class EmploymentStatus(str, Enum):
    EMPLOYED_AT_RISK = "employed_at_risk"
    FRESH_GRAD_STUDENT = "fresh_grad_student"
    CAREER_SWITCHER = "career_switcher"
    JOBSEEKER = "jobseeker"


class SkillProficiency(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class UserSkillItem(BaseModel):
    id: str = Field(description="Unique identifier for the skill tag")
    name: str = Field(description="Canonical English title for ESCO alignment")
    escoUri: Optional[str] = Field(default=None, description="Matched ESCO concept URI if available")
    proficiency: SkillProficiency = Field(default=SkillProficiency.INTERMEDIATE, description="User proficiency level")
    isAiExtracted: bool = Field(default=True, description="Flag indicating if the skill was extracted by AI")
    localized_labels: Optional[Dict[str, str]] = Field(
        default=None,
        description="Multilingual translations for UI display across en, ms, zh",
    )


class ProfileIntakePayload(BaseModel):
    # Step 1: Baseline
    employmentStatus: EmploymentStatus = Field(
        default=EmploymentStatus.EMPLOYED_AT_RISK,
        description="Current employment status (Mandatory)",
    )
    currentJobTitle: Optional[str] = Field(
        default=None,
        description="Current or most recent occupational title",
    )
    industry: Optional[str] = Field(
        default=None,
        description="Industry or vocational sector",
    )
    educationLevel: Optional[str] = Field(
        default=None,
        description="Highest academic or vocational qualification",
    )
    yearsOfExperience: Optional[str] = Field(
        default=None,
        description="Estimated years of professional experience",
    )

    # Step 2: Skills & Competencies (HITL)
    skills: List[UserSkillItem] = Field(
        default_factory=list,
        description="Normalized skills inventory for vector matching (Mandatory: min 1)",
    )
    toolsAndSoftware: Optional[List[str]] = Field(
        default_factory=list,
        description="Specific software packages, tools, or machinery operated",
    )
    casualDescription: Optional[str] = Field(
        default=None,
        description="Summary of daily job responsibilities or freeform background",
    )
    languages: Optional[List[str]] = Field(
        default_factory=list,
        description="Languages spoken/written (e.g., English, Bahasa Melayu, Chinese)",
    )

    # Step 3: Future Aspirations
    careerGoal: Optional[str] = Field(
        default="explore",
        description="Goal: upskill, reskill, or explore high-growth domains",
    )
    targetSectors: Optional[List[str]] = Field(
        default_factory=list,
        description="Preferred sectors (e.g., Clean Energy, AI, Smart Logistics)",
    )
    targetJobTitle: Optional[str] = Field(
        default=None,
        description="Prospective dream or target role title",
    )
    workArrangement: Optional[str] = Field(
        default="any",
        description="Work preference: remote, hybrid, onsite, any",
    )

    # Step 4: Learning Logistics
    weeklyCommitmentHours: Optional[str] = Field(
        default="3-5",
        description="Available learning hours per week",
    )
    learningProviders: Optional[List[str]] = Field(
        default_factory=lambda: ["free_open", "hrd_corp"],
        description="Preferred learning resource types",
    )
    outputLanguage: Optional[str] = Field(
        default="en",
        description="Preferred display/report locale (en, ms, zh)",
    )


class ExtractionResponse(BaseModel):
    success: bool = True
    message: str = "Profile successfully extracted and normalized."
    extractedProfile: ProfileIntakePayload
    rawTextPreview: Optional[str] = Field(
        default=None,
        description="Truncated preview of raw extracted text for auditing",
    )
    extractionMethod: str = Field(
        default="gemini",
        description="Method used for extraction: 'gemini' or 'local'",
    )
    usedKey: Optional[str] = Field(
        default=None,
        description="Identifier of the Gemini API Key used (e.g. 'GEMINI_API_KEY_5'), or null if local",
    )
