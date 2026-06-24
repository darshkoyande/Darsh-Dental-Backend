from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, unique=True, index=True, nullable=False) # e.g. PT-04821
    name = Column(String, nullable=False)
    status = Column(String, default="Active") # Active, Inactive
    abha_id = Column(String, nullable=True) # e.g. 12-3456-7890-1234
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    primary_doctor = Column(String, nullable=False) # e.g. Dr. Priya Sharma, BDS, MDS (Perio)
    last_visit = Column(String, nullable=True)
    next_visit = Column(String, nullable=True)
    treatment_status = Column(String, default="In Plan")
    created_at = Column(DateTime, default=datetime.utcnow)

    charts = relationship("PerioChart", back_populates="patient", cascade="all, delete-orphan")

class PerioChart(Base):
    __tablename__ = "perio_charts"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    status = Column(String, default="In Plan") # Draft, In Plan, Completed
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="charts")
    teeth_data = relationship("ToothData", back_populates="chart", cascade="all, delete-orphan")

class ToothData(Base):
    __tablename__ = "tooth_data"

    id = Column(Integer, primary_key=True, index=True)
    chart_id = Column(Integer, ForeignKey("perio_charts.id"), nullable=False)
    tooth_number = Column(Integer, nullable=False) # FDI notation: 11-18, 21-28, 31-38, 41-48
    status = Column(String, default="Normal") # Normal, Missing, Implant, Crown
    mobility = Column(Integer, default=0) # 0, 1, 2, 3
    furcation = Column(Integer, default=0) # 0, 1, 2, 3

    # Measurements for 6 sites per tooth: DB, B, MB, DL, L, ML
    # Pocket Depth (PD)
    pd_db = Column(Integer, default=0)
    pd_b = Column(Integer, default=0)
    pd_mb = Column(Integer, default=0)
    pd_dl = Column(Integer, default=0)
    pd_l = Column(Integer, default=0)
    pd_ml = Column(Integer, default=0)

    # Gingival Margin (GM)
    gm_db = Column(Integer, default=0)
    gm_b = Column(Integer, default=0)
    gm_mb = Column(Integer, default=0)
    gm_dl = Column(Integer, default=0)
    gm_l = Column(Integer, default=0)
    gm_ml = Column(Integer, default=0)

    # Clinical Attachment Level (CAL) - Calculated as PD + GM, but can be overridden
    cal_db = Column(Integer, default=0)
    cal_b = Column(Integer, default=0)
    cal_mb = Column(Integer, default=0)
    cal_dl = Column(Integer, default=0)
    cal_l = Column(Integer, default=0)
    cal_ml = Column(Integer, default=0)

    # Bleeding on Probing (BOP) - True if bleeding
    bop_db = Column(Boolean, default=False)
    bop_b = Column(Boolean, default=False)
    bop_mb = Column(Boolean, default=False)
    bop_dl = Column(Boolean, default=False)
    bop_l = Column(Boolean, default=False)
    bop_ml = Column(Boolean, default=False)

    # Plaque - True if plaque present
    plaque_db = Column(Boolean, default=False)
    plaque_b = Column(Boolean, default=False)
    plaque_mb = Column(Boolean, default=False)
    plaque_dl = Column(Boolean, default=False)
    plaque_l = Column(Boolean, default=False)
    plaque_ml = Column(Boolean, default=False)

    # Suppuration/Pus - True if pus/suppuration present
    pus_db = Column(Boolean, default=False)
    pus_b = Column(Boolean, default=False)
    pus_mb = Column(Boolean, default=False)
    pus_dl = Column(Boolean, default=False)
    pus_l = Column(Boolean, default=False)
    pus_ml = Column(Boolean, default=False)

    chart = relationship("PerioChart", back_populates="teeth_data")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    appointment_date = Column(DateTime, nullable=False)
    appointment_type = Column(String, nullable=False)  # Regular, Checkup, Emergency, Root Canal, Extraction
    dentist_name = Column(String, nullable=False)
    status = Column(String, default="Scheduled")  # Scheduled, Completed, Cancelled, No Show
    notes = Column(Text, nullable=True)
    duration_minutes = Column(Integer, default=30)
    reminder_sent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", foreign_keys=[patient_id])

class ImagingRecord(Base):
    __tablename__ = "imaging_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    imaging_type = Column(String, nullable=False)  # X-Ray, CBCT, Intraoral Photo, Extraoral Photo
    date_taken = Column(DateTime, default=datetime.utcnow)
    tooth_numbers = Column(String, nullable=True)  # Comma-separated list of affected teeth
    findings = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)  # Path to stored image/file
    radiologist_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", foreign_keys=[patient_id])

class ClinicalReport(Base):
    __tablename__ = "clinical_reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    report_type = Column(String, nullable=False)  # Perio Assessment, Treatment Plan, Progress, Final Diagnosis
    generated_date = Column(DateTime, default=datetime.utcnow)
    generated_by = Column(String, nullable=False)  # Doctor name
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    status = Column(String, default="Draft")  # Draft, Approved, Signed, Published
    pdf_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", foreign_keys=[patient_id])

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    action = Column(String, nullable=False) # e.g. CREATE, READ, UPDATE, DELETE
    resource_type = Column(String, nullable=False) # e.g. Patient, Chart, Tooth
    resource_id = Column(String, nullable=True)
    user = Column(String, default="Dr. Priya Sharma")
    client_ip = Column(String, nullable=True)
    details = Column(Text, nullable=True)
