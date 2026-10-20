from typing import List, Optional
from pydantic import BaseModel, Field


class QuickCheckQuiz(BaseModel):
    question: str = Field(description="Scenario-based conceptual question tailored to the learner")
    options: List[str] = Field(description="4 selectable multiple choice answers")
    correctIndex: int = Field(ge=0, le=3, description="0-indexed position of the correct answer")
    explanation: str = Field(description="Clear explanation of why this answer is correct")


class MentorQueryPayload(BaseModel):
    roadmapId: Optional[str] = Field(default=None, description="Active career roadmap identifier")
    milestonePhase: int = Field(default=1, ge=1, le=4, description="Phase index in roadmap (1=Foundation, 2=Applied, 3=Capstone)")
    userPastJobTitle: str = Field(default="Administrative Clerk", description="Learner's previous or baseline occupation")
    courseTopic: str = Field(default="Python Pandas & Data Ingestion", description="Topic or syllabus module being studied")
    userQuestion: Optional[str] = Field(
        default="How does this apply to what I used to do, and why should I learn it?",
        description="The learner's question or concern about this topic",
    )
    locale: str = Field(default="en", description="Target language ('en', 'ms', or 'zh')")


class MentorResponsePayload(BaseModel):
    explanation: str = Field(description="Accessible breakdown of the concept without academic jargon")
    practicalAnalogy: str = Field(description="Vivid analogy connecting their past job tasks to the technical concept")
    quickCheckQuiz: QuickCheckQuiz = Field(description="Interactive mini-check quiz")
    sdgImpactSummary: str = Field(description="UN SDG alignment and automation resilience summary")
