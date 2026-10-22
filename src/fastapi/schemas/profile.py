import uuid
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator


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
    id: Optional[str] = Field(
        default_factory=lambda: f"skill-{uuid.uuid4().hex[:8]}",
        description="Unique identifier for the skill tag",
    )
    name: str = Field(default="Competency", description="Canonical English title for ESCO alignment")
    escoUri: Optional[str] = Field(default=None, description="Matched ESCO concept URI if available")
    proficiency: SkillProficiency = Field(
        default=SkillProficiency.INTERMEDIATE,
        description="User proficiency level",
    )
    isAiExtracted: bool = Field(default=True, description="Flag indicating if the skill was extracted by AI")
    localized_labels: Optional[Dict[str, str]] = Field(
        default=None,
        description="Multilingual translations for UI display across en, ms, zh",
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_skill_data(cls, data: Any) -> Any:
        if isinstance(data, str):
            clean = data.strip()
            return {
                "id": f"skill-{uuid.uuid4().hex[:8]}",
                "name": clean or "Competency",
                "proficiency": SkillProficiency.INTERMEDIATE,
                "isAiExtracted": True,
            }
        if isinstance(data, dict):
            d = dict(data)
            # Ensure unique id fallback
            if not d.get("id"):
                d["id"] = f"skill-{uuid.uuid4().hex[:8]}"
            # Ensure name exists
            name_val = d.get("name") or d.get("title") or d.get("skill") or d.get("label") or "Competency"
            d["name"] = str(name_val).strip()
            # Normalize proficiency case-insensitively with alias support
            raw_prof = d.get("proficiency")
            if isinstance(raw_prof, SkillProficiency):
                pass
            elif isinstance(raw_prof, str):
                p_lower = raw_prof.strip().lower()
                if p_lower in ("beginner", "entry", "basic", "junior"):
                    d["proficiency"] = SkillProficiency.BEGINNER
                elif p_lower in ("advanced", "expert", "senior", "master", "high"):
                    d["proficiency"] = SkillProficiency.ADVANCED
                else:
                    d["proficiency"] = SkillProficiency.INTERMEDIATE
            else:
                d["proficiency"] = SkillProficiency.INTERMEDIATE
            # Ensure isAiExtracted flag
            if "isAiExtracted" not in d or d["isAiExtracted"] is None:
                d["isAiExtracted"] = True
            return d
        return data


class ProfileIntakePayload(BaseModel):
    # Step 1: Baseline
    employmentStatus: EmploymentStatus = Field(
        default=EmploymentStatus.EMPLOYED_AT_RISK,
        description="Current employment status (Mandatory)",
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_intake_payload(cls, data: Any) -> Any:
        if isinstance(data, dict):
            d = dict(data)
            status = d.get("employmentStatus")
            if not status or not isinstance(status, (str, EmploymentStatus)):
                d["employmentStatus"] = EmploymentStatus.EMPLOYED_AT_RISK
            elif isinstance(status, str):
                s_lower = status.strip().lower()
                valid = {e.value for e in EmploymentStatus}
                if s_lower not in valid:
                    d["employmentStatus"] = EmploymentStatus.EMPLOYED_AT_RISK
                else:
                    d["employmentStatus"] = s_lower
            if d.get("skills") is None:
                d["skills"] = []
            return d
        return data
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
