from typing import List, Optional
from pydantic import BaseModel, Field


class ExtractedCertificateDetails(BaseModel):
    learnerName: Optional[str] = Field(default=None, description="Name of the credential recipient extracted from document")
    courseName: str = Field(description="Title of the completed course or training program")
    issuingOrganization: str = Field(description="Institution, university, or platform (e.g. Coursera, edX, HRD Corp, DeepLearning.AI)")
    completionDate: Optional[str] = Field(default=None, description="Issuance or completion date identified on credential")


class IssuedBadge(BaseModel):
    badgeId: str = Field(description="Unique credential UUID")
    badgeTitle: str = Field(description="Title of the earned micro-credential, e.g. 'SDG 4.4 & 8.2 Certified: Data Pipeline Specialist'")
    badgeIconUrl: str = Field(description="Badge visual icon or graphic token URL")
    alignedSdgs: List[str] = Field(default_factory=list, description="UN Sustainable Development Goals aligned with this achievement")
    verificationHash: str = Field(description="Cryptographic SHA-256 proof hash verifying authenticity")
    issuedAt: str = Field(description="ISO timestamp of verification and badge issuance")


class CertificateVerificationResult(BaseModel):
    isValid: bool = Field(description="Whether the document is verified as an authentic course completion certificate")
    confidenceScore: float = Field(ge=0.0, le=1.0, description="Verification confidence metric (0.0 - 1.0)")
    extractedDetails: ExtractedCertificateDetails = Field(description="Parsed metadata from the credential")
    verifiedCompetencies: List[str] = Field(default_factory=list, description="List of technical/operational skills demonstrated")
    issuedBadge: Optional[IssuedBadge] = Field(default=None, description="Generated micro-credential badge if verified")
    verificationNotes: str = Field(description="Auditable human-readable verification rationale")
