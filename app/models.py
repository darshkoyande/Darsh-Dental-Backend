from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base
from app.dentition import ToothStatus, NotationSystem


class User(Base):
    """Application user for authentication. Can be a doctor or a patient."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "doctor" | "patient"
    name = Column(String, nullable=False)  # Display name
    linked_patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    linked_patient = relationship("Patient", foreign_keys=[linked_patient_id])


class ChatMessage(Base):
    """Secure chat message between a doctor and a patient."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message_text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_read = Column(Boolean, default=False)

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])


class DiagnosisRecord(Base):
    """Lookup table seeded from the dental dataset CSV.
    Each row maps a Diagnosis to its standard Treatment and Medicine."""
    __tablename__ = "diagnosis_records"

    id = Column(Integer, primary_key=True, index=True)
    diagnosis = Column(String, unique=True, nullable=False, index=True)
    treatment = Column(String, nullable=False)
    medicine = Column(String, nullable=True)


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
    # ── Clinical Diagnosis Fields (from CSV dataset) ──────────────────────────
    diagnosis = Column(String, nullable=True)        # e.g. "Bad Breath"
    treatment = Column(String, nullable=True)         # e.g. "Oral Hygiene Therapy"
    medicine = Column(String, nullable=True)          # e.g. "Chlorhexidine"
    treatment_date = Column(Date, nullable=True)      # Date the treatment was / will be done
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    charts = relationship("PerioChart", back_populates="patient", cascade="all, delete-orphan")
    tooth_records = relationship("PatientToothRecord", back_populates="patient", cascade="all, delete-orphan")

class PerioChart(Base):
    __tablename__ = "perio_charts"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    status = Column(String, default="In Plan") # Draft, In Plan, Completed
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", foreign_keys=[patient_id])

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    action = Column(String, nullable=False) # e.g. CREATE, READ, UPDATE, DELETE
    resource_type = Column(String, nullable=False) # e.g. Patient, Chart, Tooth
    resource_id = Column(String, nullable=True)
    user = Column(String, default="Dr. Priya Sharma")
    client_ip = Column(String, nullable=True)
    details = Column(Text, nullable=True)


class PatientToothRecord(Base):
    """
    Tracks the dentition status of every tooth slot for a patient.

    Supports three notation systems:
      - FDI_PERMANENT   : integer identifiers 11-48 (permanent adult teeth)
      - FDI_PRIMARY     : integer identifiers 51-85 (primary deciduous teeth)
      - UNIVERSAL_PRIMARY: letter identifiers A-T  (primary deciduous teeth)

    One record per tooth slot per patient. Upsert logic in crud.py ensures
    there are no duplicate (patient_id, tooth_identifier, notation_system) rows.
    """
    __tablename__ = "patient_tooth_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    # Tooth identifier as a string to accommodate both numeric FDI ("18") and
    # letter-based Universal notation ("A").
    tooth_identifier = Column(String, nullable=False)

    # Which notation system this identifier belongs to.
    notation_system = Column(String, nullable=False)  # NotationSystem enum value

    # Clinical status — stored as the string value of ToothStatus.
    status = Column(String, nullable=False, default=ToothStatus.PRESENT.value)

    # JSON-encoded surface conditions, e.g.
    # {"buccal": "caries", "occlusal": "filling", "mesial": "intact"}
    # Kept as free-form text for maximum flexibility.
    surfaces = Column(Text, nullable=True)

    # Optional clinical note specific to this tooth slot.
    notes = Column(Text, nullable=True)

    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    patient = relationship("Patient", back_populates="tooth_records")
