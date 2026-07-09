import os
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session
from sqlalchemy.exc import SQLAlchemyError

# ==========================================
# 1. ANTIGRAVITY DATA MODELS
# ==========================================
Base = declarative_base()

class Patient(Base):
    __tablename__ = "ag_patients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    dob = Column(DateTime, nullable=False)
    contact_info = Column(String, nullable=False)
    
    # Relationships
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    odontogram_charts = relationship("Odontogram", back_populates="patient", cascade="all, delete-orphan")

class Appointment(Base):
    __tablename__ = "ag_appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("ag_patients.id"), nullable=False)
    date_time = Column(DateTime, nullable=False)
    status = Column(String, default="Scheduled") # Scheduled, Completed, Cancelled
    
    patient = relationship("Patient", back_populates="appointments")

class Odontogram(Base):
    __tablename__ = "ag_odontograms"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("ag_patients.id"), nullable=False)
    tooth_number = Column(Integer, nullable=False) # e.g. 11-18, 21-28, etc.
    condition_surface = Column(String, nullable=False) # e.g. "Caries - MOD"
    notes = Column(Text, nullable=True)
    treatment_plan = Column(String, nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    patient = relationship("Patient", back_populates="odontogram_charts")

# ==========================================
# 2. ANTIGRAVITY INTEGRATION & CLIENT
# ==========================================
class AntigravityClient:
    """
    Antigravity DB Client Wrapper
    
    Handles initialization, connection pooling, and secure transactions.
    """
    def __init__(self, database_url: str):
        # SECURITY NOTE: In a real-world HIPAA/GDPR scenario, connection strings 
        # must use SSL/TLS. For PostgreSQL: postgresql+psycopg2://user:pass@host/db?sslmode=require
        
        connect_args = {"check_same_thread": False} if "sqlite" in database_url else {}
        self.engine = create_engine(database_url, connect_args=connect_args)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
    def initialize_schema(self):
        """Creates tables if they don't exist in the data store."""
        Base.metadata.create_all(bind=self.engine)
        
    def get_session(self) -> Session:
        """Yields a database session."""
        db = self.SessionLocal()
        try:
            return db
        except Exception as e:
            db.close()
            raise e

# ==========================================
# 3. CRUD OPERATIONS HELPER
# ==========================================
class AntigravityDataStore:
    """
    Handles higher-level business logic and CRUD operations for the clinical charting layer.
    """
    def __init__(self, client: AntigravityClient):
        self.client = client

    def create_patient(self, name: str, dob: datetime, contact_info: str) -> Patient:
        """Create a new patient record securely."""
        db = self.client.get_session()
        try:
            # SECURITY NOTE: contact_info and name could be symmetrically encrypted
            # at the application layer before storing, using libraries like cryptography.Fernet
            new_patient = Patient(name=name, dob=dob, contact_info=contact_info)
            db.add(new_patient)
            db.commit()
            db.refresh(new_patient)
            return new_patient
        except SQLAlchemyError as e:
            db.rollback()
            raise Exception(f"Database error while creating patient: {e}")
        finally:
            db.close()

    def get_patient_history(self, patient_id: int) -> dict:
        """Fetch a patient's complete history including appointments and dental chart."""
        db = self.client.get_session()
        try:
            # Note: Implementing Audit Logging here for HIPAA compliance (who accessed what and when)
            # e.g., AuditLogger.log(action="READ", resource="PatientHistory", resource_id=patient_id, user_id=current_user)
            
            patient = db.query(Patient).filter(Patient.id == patient_id).first()
            if not patient:
                return {}
            
            return {
                "patient_info": {
                    "id": patient.id,
                    "name": patient.name,
                    "dob": patient.dob,
                    "contact_info": patient.contact_info
                },
                "appointments": [{"id": a.id, "date_time": a.date_time, "status": a.status} for a in patient.appointments],
                "odontogram": [
                    {
                        "tooth_number": o.tooth_number,
                        "condition": o.condition_surface,
                        "notes": o.notes,
                        "treatment_plan": o.treatment_plan
                    } for o in patient.odontogram_charts
                ]
            }
        finally:
            db.close()

    def update_tooth_condition(self, patient_id: int, tooth_number: int, condition_surface: str, notes: Optional[str] = None, treatment_plan: Optional[str] = None) -> Odontogram:
        """Update or insert a specific tooth's condition on the odontogram."""
        db = self.client.get_session()
        try:
            chart_entry = db.query(Odontogram).filter(
                Odontogram.patient_id == patient_id,
                Odontogram.tooth_number == tooth_number
            ).first()
            
            if chart_entry:
                chart_entry.condition_surface = condition_surface
                if notes is not None:
                    chart_entry.notes = notes
                if treatment_plan is not None:
                    chart_entry.treatment_plan = treatment_plan
            else:
                chart_entry = Odontogram(
                    patient_id=patient_id,
                    tooth_number=tooth_number,
                    condition_surface=condition_surface,
                    notes=notes,
                    treatment_plan=treatment_plan
                )
                db.add(chart_entry)
                
            db.commit()
            db.refresh(chart_entry)
            return chart_entry
        except SQLAlchemyError as e:
            db.rollback()
            raise Exception(f"Database error while updating tooth {tooth_number}: {e}")
        finally:
            db.close()

# ==========================================
# 4. SECURITY NOTE & PATTERN (HIPAA/GDPR)
# ==========================================
"""
SECURITY IMPLEMENTATION PATTERNS:

1. Data Encryption at Rest & in Transit:
   - Always connect to the database via TLS/SSL (e.g., `sslmode=require` in Postgres).
   - Encrypt highly sensitive PII (like `contact_info` or `dob`) at the application layer 
     using AES-256 (via `cryptography` Python package) before writing to the database.

2. Role-Based Access Control (RBAC):
   - Ensure these CRUD functions check user roles (e.g., Doctor, Assistant, Admin). 
   - A Doctor can update the odontogram, while front-desk staff can only update appointments.

3. Audit Logging (Required by HIPAA):
   - Any function that reads or writes to Patient or Odontogram tables MUST append to an `AuditLog` table.
   - Example log entry: `{"timestamp": "...", "user": "dr_smith", "action": "UPDATE_TOOTH_CHART", "patient_id": 123}`

4. Data Masking/Anonymization:
   - When exporting data for research or non-clinical use, strip names and contact info.
"""

# Usage Example:
if __name__ == "__main__":
    # Initialize the Antigravity Data Layer
    ag_client = AntigravityClient(database_url="sqlite:///./dental_antigravity.db")
    ag_client.initialize_schema()
    
    ag_store = AntigravityDataStore(client=ag_client)
    
    # 1. Create Patient
    new_patient = ag_store.create_patient(
        name="John Doe", 
        dob=datetime(1985, 5, 20), 
        contact_info="john.doe@example.com / 555-0192"
    )
    print(f"Created Patient: {new_patient.name} (ID: {new_patient.id})")
    
    # 2. Update Tooth Condition
    tooth_update = ag_store.update_tooth_condition(
        patient_id=new_patient.id,
        tooth_number=46,
        condition_surface="Caries - MOD",
        notes="Deep decay, requires root canal evaluation.",
        treatment_plan="RCT + Crown"
    )
    print(f"Updated Tooth {tooth_update.tooth_number}: {tooth_update.treatment_plan}")
    
    # 3. Fetch Patient History
    history = ag_store.get_patient_history(patient_id=new_patient.id)
    print("Patient History:", history)
