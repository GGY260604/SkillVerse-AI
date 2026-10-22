from typing import List, Optional
from pydantic import BaseModel, Field


class QuizQuestion(BaseModel):
    id: int = Field(ge=1, le=10, description="Question number (1 to 10)")
    question: str = Field(description="Scenario-based technical question evaluating the planned skill")
    options: List[str] = Field(description="Exactly 4 distinct selectable options")
    correctIndex: int = Field(ge=0, le=3, description="0-indexed position of the correct option (0, 1, 2, or 3)")
    explanation: str = Field(description="Educational explanation of why the correct option is right and others are wrong")


class PhaseQuizRequest(BaseModel):
    phaseIndex: int = Field(default=1, ge=1, description="Milestone phase sequence number (1, 2, 3...)")
    phaseTitle: str = Field(default="Foundation Core", description="Title of the phase being audited")
    skills: List[str] = Field(default_factory=list, description="Specific skills and competencies to test")
    courseTopic: Optional[str] = Field(default=None, description="Course module or syllabus topic being assessed")
    targetRole: Optional[str] = Field(default=None, description="Target job title to contextualize questions")
    locale: str = Field(default="en", description="Target language: 'en', 'ms', or 'zh'")


class PhaseQuizResponse(BaseModel):
    phaseIndex: int = Field(description="Milestone phase index")
    phaseTitle: str = Field(description="Title of the milestone phase")
    expReward: int = Field(
        ge=5,
        le=100,
        description="EXP awarded if user answers all 10 questions correctly. Must be a multiple of 5 (e.g. 25, 50, 75)",
    )
    expDifficultyTier: str = Field(
        default="Applied Mastery",
        description="Difficulty tier descriptor based on cognitive complexity (e.g. 'Foundational Literacy (30 EXP)', 'Advanced Production (85 EXP)')",
    )
    evaluationReason: str = Field(
        description="Reasoning by Gemini explaining why this skill difficulty warrants this EXP reward",
    )
    passingScore: int = Field(
        default=10,
        description="Passing requirement. Must be 10 (100% correct required to verify mastery)",
    )
    questions: List[QuizQuestion] = Field(
        description="Exactly 10 questions testing the planned skills",
    )
