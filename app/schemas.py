from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

# --- SITE DATA SCHEMA ---
class SiteData(BaseModel):
    pd: int = Field(default=0, description="Pocket Depth in mm")
    gm: int = Field(default=0, description="Gingival Margin in mm")
    cal: int = Field(default=0, description="Clinical Attachment Level (PD + GM) in mm")
    bop: bool = Field(default=False, description="Bleeding on Probing")
    plaque: bool = Field(default=False, description="Plaque presence")
    pus: bool = Field(default=False, description="Suppuration / Pus presence")

# --- TOOTH DATA SCHEMA ---
class ToothDataCreate(BaseModel):
    tooth_number: int = Field(..., description="FDI Notation: 11-18, 21-28, 31-38, 41-48")
    status: str = Field(default="Normal", description="Normal, Missing, Implant, Crown")
    mobility: int = Field(default=0, ge=0, le=3, description="Mobility index (0-3)")
    furcation: int = Field(default=0, ge=0, le=3, description="Furcation classification (0-3)")
    db: SiteData = Field(default_factory=SiteData, description="Distobuccal site")
    b: SiteData = Field(default_factory=SiteData, description="Buccal site")
    mb: SiteData = Field(default_factory=SiteData, description="Mesiobuccal site")
    dl: SiteData = Field(default_factory=SiteData, description="Distolingual site")
    l: SiteData = Field(default_factory=SiteData, description="Lingual site")
    ml: SiteData = Field(default_factory=SiteData, description="Mesiolingual site")

class ToothDataResponse(ToothDataCreate):
    id: int
    chart_id: int

    model_config = ConfigDict(from_attributes=True)

# --- PERIO STATS ---
class PerioStats(BaseModel):
    total_teeth: int = Field(default=32, description="Total possible teeth")
    missing_teeth: int = Field(..., description="Number of missing / extracted teeth")
    bleeding_sites_count: int = Field(..., description="Number of sites with Bleeding on Probing (BOP)")
    bleeding_sites_percentage: float = Field(..., description="Percentage of bleeding sites out of total active sites")
    avg_pocket_depth: float = Field(..., description="Average pocket depth in mm")
    deep_pockets_count: int = Field(..., description="Number of sites with pocket depth >= 6mm")
    mobility_cases_count: int = Field(..., description="Teeth with mobility grade >= 1")
    furcation_cases_count: int = Field(..., description="Teeth with furcation grade >= 1")
    treatment_status: str = Field(..., description="Current status of the treatment plan")

# --- PERIO CHART SCHEMA ---
class PerioChartCreate(BaseModel):
    status: str = Field(default="In Plan", description="Draft, In Plan, Completed")
    notes: Optional[str] = Field(default=None, description="Clinical notes")
    teeth: Optional[List[ToothDataCreate]] = Field(default=None, description="Optional list of tooth-level measurements")

class PerioChartResponse(BaseModel):
    id: int
    patient_id: int
    status: str
    notes: Optional[str]
    created_at: datetime
    teeth_data: List[ToothDataResponse]

    model_config = ConfigDict(from_attributes=True)

# --- PATIENT SCHEMA ---
class PatientBase(BaseModel):
    patient_id: str = Field(..., description="External patient ID, e.g. PT-04821")
    name: str = Field(..., description="Full Name")
    status: str = Field(default="Active", description="Active or Inactive")
    abha_id: Optional[str] = Field(None, description="ABHA ID, e.g. 12-3456-7890-1234")
    age: int = Field(..., ge=0)
    gender: str = Field(..., description="Male, Female, Other")
    primary_doctor: str = Field(..., description="Name and degrees of Doctor")
    last_visit: Optional[str] = None
    next_visit: Optional[str] = None
    treatment_status: str = "In Plan"

class PatientCreate(PatientBase):
    patient_id: Optional[str] = Field(None, description="External patient ID, e.g. PT-04821. If not provided, will be auto-generated.")


class PatientResponse(PatientBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- AI ANALYSIS RESPONSE ---
class AIAnalysisResponse(BaseModel):
    analysis_timestamp: datetime
    diagnosis_summary: str
    severity_level: str
    risk_assessment: str
    recommended_treatment_plan: List[str]
    key_findings: List[str]

# --- AUDIT LOG SCHEMA ---
class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    action: str
    resource_type: str
    resource_id: Optional[str]
    user: str
    client_ip: Optional[str]
    details: Optional[str]

    model_config = ConfigDict(from_attributes=True)

# --- SCHEDULE / APPOINTMENT SCHEMAS ---
class AppointmentBase(BaseModel):
    appointment_date: datetime = Field(..., description="Appointment date and time")
    appointment_type: str = Field(..., description="Regular, Checkup, Emergency, Root Canal, Extraction")
    dentist_name: str = Field(..., description="Name of the dentist")
    status: str = Field(default="Scheduled", description="Scheduled, Completed, Cancelled, No Show")
    notes: Optional[str] = Field(None, description="Additional notes")
    duration_minutes: int = Field(default=30, description="Duration in minutes")

class AppointmentCreate(AppointmentBase):
    patient_id: int = Field(..., description="Patient ID")

class AppointmentResponse(AppointmentBase):
    id: int
    patient_id: int
    reminder_sent: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- IMAGING SCHEMAS ---
class ImagingRecordBase(BaseModel):
    imaging_type: str = Field(..., description="X-Ray, CBCT, Intraoral Photo, Extraoral Photo")
    tooth_numbers: Optional[str] = Field(None, description="Comma-separated tooth numbers")
    findings: Optional[str] = Field(None, description="Clinical findings from imaging")
    radiologist_notes: Optional[str] = Field(None, description="Radiologist's observations")

class ImagingRecordCreate(ImagingRecordBase):
    patient_id: int = Field(..., description="Patient ID")

class ImagingRecordResponse(ImagingRecordBase):
    id: int
    patient_id: int
    date_taken: datetime
    file_url: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- REPORT SCHEMAS ---
class ClinicalReportBase(BaseModel):
    report_type: str = Field(..., description="Perio Assessment, Treatment Plan, Progress, Final Diagnosis")
    content: str = Field(..., description="Full report content")
    summary: Optional[str] = Field(None, description="Brief summary of report")
    status: str = Field(default="Draft", description="Draft, Approved, Signed, Published")

class ClinicalReportCreate(ClinicalReportBase):
    patient_id: int = Field(..., description="Patient ID")
    generated_by: str = Field(..., description="Doctor name")

class ClinicalReportResponse(ClinicalReportBase):
    id: int
    patient_id: int
    generated_date: datetime
    generated_by: str
    pdf_url: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- ABDM MOCK SCHEMAS ---
class AbhaVerificationRequest(BaseModel):
    abha_number: str = Field(..., pattern=r"^\d{2}-\d{4}-\d{4}-\d{4}$", description="ABHA 14-digit identifier")

class AbhaVerificationResponse(BaseModel):
    status: str = "SUCCESS"
    verified: bool = True
    name: str
    gender: str
    date_of_birth: str
    address: str
    mobile: str

class AbdmLinkRequest(BaseModel):
    patient_id: str
    abha_number: str
    consent_id: str

class AbdmLinkResponse(BaseModel):
    status: str = "LINKED"
    transaction_id: str
    linked_care_contexts: List[str]
