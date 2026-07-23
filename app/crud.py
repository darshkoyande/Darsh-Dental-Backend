from sqlalchemy.orm import Session
from app import models, schemas
from datetime import datetime

# --- PATIENT CRUD ---
def get_patient(db: Session, patient_id: int):
    return db.query(models.Patient).filter(models.Patient.id == patient_id).first()

def get_patient_by_external_id(db: Session, patient_id_str: str):
    return db.query(models.Patient).filter(models.Patient.patient_id == patient_id_str).first()

def get_patients(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Patient).offset(skip).limit(limit).all()

def create_patient(db: Session, patient: schemas.PatientCreate):
    import random
    patient_id = patient.patient_id
    if not patient_id:
        while True:
            generated_id = f"PT-{random.randint(10000, 99999)}"
            if not get_patient_by_external_id(db, generated_id):
                patient_id = generated_id
                break

    db_patient = models.Patient(
        patient_id=patient_id,
        name=patient.name,
        status=patient.status,
        abha_id=patient.abha_id,
        age=patient.age,
        gender=patient.gender,
        primary_doctor=patient.primary_doctor,
        last_visit=patient.last_visit,
        next_visit=patient.next_visit,
        treatment_status=patient.treatment_status,
        # ── New clinical diagnosis fields ───────────────────────────
        diagnosis=patient.diagnosis,
        treatment=patient.treatment,
        medicine=patient.medicine,
        treatment_date=patient.treatment_date,
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

def delete_patient(db: Session, patient_id: int):
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if db_patient:
        db.delete(db_patient)
        db.commit()
        return True
    return False


# --- MAPPING HELPERS ---
def map_tooth_db_to_response(db_tooth: models.ToothData) -> schemas.ToothDataResponse:
    return schemas.ToothDataResponse(
        id=db_tooth.id,
        chart_id=db_tooth.chart_id,
        tooth_number=db_tooth.tooth_number,
        status=db_tooth.status,
        mobility=db_tooth.mobility,
        furcation=db_tooth.furcation,
        db=schemas.SiteData(
            pd=db_tooth.pd_db, gm=db_tooth.gm_db, cal=db_tooth.cal_db,
            bop=db_tooth.bop_db, plaque=db_tooth.plaque_db, pus=db_tooth.pus_db
        ),
        b=schemas.SiteData(
            pd=db_tooth.pd_b, gm=db_tooth.gm_b, cal=db_tooth.cal_b,
            bop=db_tooth.bop_b, plaque=db_tooth.plaque_b, pus=db_tooth.pus_b
        ),
        mb=schemas.SiteData(
            pd=db_tooth.pd_mb, gm=db_tooth.gm_mb, cal=db_tooth.cal_mb,
            bop=db_tooth.bop_mb, plaque=db_tooth.plaque_mb, pus=db_tooth.pus_mb
        ),
        dl=schemas.SiteData(
            pd=db_tooth.pd_dl, gm=db_tooth.gm_dl, cal=db_tooth.cal_dl,
            bop=db_tooth.bop_dl, plaque=db_tooth.plaque_dl, pus=db_tooth.pus_dl
        ),
        l=schemas.SiteData(
            pd=db_tooth.pd_l, gm=db_tooth.gm_l, cal=db_tooth.cal_l,
            bop=db_tooth.bop_l, plaque=db_tooth.plaque_l, pus=db_tooth.pus_l
        ),
        ml=schemas.SiteData(
            pd=db_tooth.pd_ml, gm=db_tooth.gm_ml, cal=db_tooth.cal_ml,
            bop=db_tooth.bop_ml, plaque=db_tooth.plaque_ml, pus=db_tooth.pus_ml
        )
    )

def apply_tooth_schema_to_db(db_tooth: models.ToothData, tooth_schema: schemas.ToothDataCreate):
    db_tooth.status = tooth_schema.status
    db_tooth.mobility = tooth_schema.mobility
    db_tooth.furcation = tooth_schema.furcation

    for site_name in ["db", "b", "mb", "dl", "l", "ml"]:
        site = getattr(tooth_schema, site_name)
        setattr(db_tooth, f"pd_{site_name}", site.pd)
        setattr(db_tooth, f"gm_{site_name}", site.gm)
        # CAL = PD + GM (custom override allowed, but auto-set if cal is 0)
        setattr(db_tooth, f"cal_{site_name}", site.cal if site.cal != 0 else (site.pd + site.gm))
        setattr(db_tooth, f"bop_{site_name}", site.bop)
        setattr(db_tooth, f"plaque_{site_name}", site.plaque)
        setattr(db_tooth, f"pus_{site_name}", site.pus)

# --- CHART CRUD ---
def get_chart(db: Session, chart_id: int):
    return db.query(models.PerioChart).filter(models.PerioChart.id == chart_id).first()

def get_latest_chart_for_patient(db: Session, patient_db_id: int):
    return db.query(models.PerioChart).filter(
        models.PerioChart.patient_id == patient_db_id
    ).order_by(models.PerioChart.created_at.desc()).first()

def create_chart(db: Session, patient_db_id: int, chart_in: schemas.PerioChartCreate):
    db_chart = models.PerioChart(
        patient_id=patient_db_id,
        status=chart_in.status,
        notes=chart_in.notes
    )
    db.add(db_chart)
    db.commit()
    db.refresh(db_chart)

    if chart_in.teeth:
        for tooth in chart_in.teeth:
            db_tooth = models.ToothData(chart_id=db_chart.id, tooth_number=tooth.tooth_number)
            apply_tooth_schema_to_db(db_tooth, tooth)
            db.add(db_tooth)
        db.commit()
        db.refresh(db_chart)
    else:
        # Prepopulate with 32 empty/normal teeth
        fdi_teeth = [
            18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,  # Maxilla
            48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38   # Mandible
        ]
        for tooth_num in fdi_teeth:
            db_tooth = models.ToothData(chart_id=db_chart.id, tooth_number=tooth_num)
            db.add(db_tooth)
        db.commit()
        db.refresh(db_chart)

    return db_chart

def update_tooth_data(db: Session, chart_id: int, tooth_number: int, tooth_schema: schemas.ToothDataCreate):
    db_tooth = db.query(models.ToothData).filter(
        models.ToothData.chart_id == chart_id,
        models.ToothData.tooth_number == tooth_number
    ).first()

    if not db_tooth:
        db_tooth = models.ToothData(chart_id=chart_id, tooth_number=tooth_number)
        db.add(db_tooth)

    apply_tooth_schema_to_db(db_tooth, tooth_schema)
    db.commit()
    db.refresh(db_tooth)
    return db_tooth

# --- AUDIT LOG CRUD ---
def create_audit_log(db: Session, action: str, resource_type: str, resource_id: str = None, details: str = None, client_ip: str = None, user: str = "Dr. Priya Sharma"):
    db_log = models.AuditLog(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        client_ip=client_ip,
        user=user
    )
    db.add(db_log)
    db.commit()
    return db_log

def get_audit_logs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).offset(skip).limit(limit).all()


# --- DIAGNOSIS CRUD ---
def get_all_diagnoses(db: Session):
    """Return all DiagnosisRecord rows ordered alphabetically by diagnosis name."""
    return db.query(models.DiagnosisRecord).order_by(models.DiagnosisRecord.diagnosis).all()

# --- APPOINTMENT (SCHEDULE) CRUD ---
def create_appointment(db: Session, appointment: schemas.AppointmentCreate):
    db_appointment = models.Appointment(
        patient_id=appointment.patient_id,
        appointment_date=appointment.appointment_date,
        appointment_type=appointment.appointment_type,
        dentist_name=appointment.dentist_name,
        status=appointment.status,
        notes=appointment.notes,
        duration_minutes=appointment.duration_minutes
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

def get_appointment(db: Session, appointment_id: int):
    return db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()

def get_patient_appointments(db: Session, patient_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Appointment).filter(
        models.Appointment.patient_id == patient_id
    ).order_by(models.Appointment.appointment_date.desc()).offset(skip).limit(limit).all()

def update_appointment(db: Session, appointment_id: int, appointment: schemas.AppointmentCreate):
    db_appointment = get_appointment(db, appointment_id)
    if not db_appointment:
        return None
    for key, value in appointment.model_dump().items():
        if key != "patient_id":
            setattr(db_appointment, key, value)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

def delete_appointment(db: Session, appointment_id: int):
    db_appointment = get_appointment(db, appointment_id)
    if db_appointment:
        db.delete(db_appointment)
        db.commit()
    return db_appointment

# --- IMAGING CRUD ---
def create_imaging_record(db: Session, imaging: schemas.ImagingRecordCreate):
    db_imaging = models.ImagingRecord(
        patient_id=imaging.patient_id,
        imaging_type=imaging.imaging_type,
        tooth_numbers=imaging.tooth_numbers,
        findings=imaging.findings,
        radiologist_notes=imaging.radiologist_notes
    )
    db.add(db_imaging)
    db.commit()
    db.refresh(db_imaging)
    return db_imaging

def get_imaging_record(db: Session, imaging_id: int):
    return db.query(models.ImagingRecord).filter(models.ImagingRecord.id == imaging_id).first()

def get_patient_imaging_records(db: Session, patient_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.ImagingRecord).filter(
        models.ImagingRecord.patient_id == patient_id
    ).order_by(models.ImagingRecord.date_taken.desc()).offset(skip).limit(limit).all()

def update_imaging_record(db: Session, imaging_id: int, imaging: schemas.ImagingRecordCreate):
    db_imaging = get_imaging_record(db, imaging_id)
    if not db_imaging:
        return None
    for key, value in imaging.model_dump().items():
        if key != "patient_id":
            setattr(db_imaging, key, value)
    db.commit()
    db.refresh(db_imaging)
    return db_imaging

def delete_imaging_record(db: Session, imaging_id: int):
    db_imaging = get_imaging_record(db, imaging_id)
    if db_imaging:
        db.delete(db_imaging)
        db.commit()
    return db_imaging

# --- CLINICAL REPORT CRUD ---
def create_clinical_report(db: Session, report: schemas.ClinicalReportCreate):
    db_report = models.ClinicalReport(
        patient_id=report.patient_id,
        report_type=report.report_type,
        generated_by=report.generated_by,
        content=report.content,
        summary=report.summary,
        status=report.status
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

def get_clinical_report(db: Session, report_id: int):
    return db.query(models.ClinicalReport).filter(models.ClinicalReport.id == report_id).first()

def get_patient_reports(db: Session, patient_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.ClinicalReport).filter(
        models.ClinicalReport.patient_id == patient_id
    ).order_by(models.ClinicalReport.generated_date.desc()).offset(skip).limit(limit).all()

def update_clinical_report(db: Session, report_id: int, report: schemas.ClinicalReportCreate):
    db_report = get_clinical_report(db, report_id)
    if not db_report:
        return None
    for key, value in report.model_dump().items():
        if key != "patient_id":
            setattr(db_report, key, value)
    db.commit()
    db.refresh(db_report)
    return db_report

def delete_clinical_report(db: Session, report_id: int):
    db_report = get_clinical_report(db, report_id)
    if db_report:
        db.delete(db_report)
        db.commit()
    return db_report


# ── Dentition Tracking CRUD ───────────────────────────────────────────────────

from app.dentition import (
    DentitionType,
    NotationSystem,
    ToothStatus,
    get_default_chart_teeth,
    get_default_status_for_notation,
    resolve_dentition_type,
    PRIMARY_FDI_TEETH,
    PERMANENT_FDI_TEETH,
)


def get_patient_tooth_chart(db: Session, patient_id: int) -> list:
    """
    Return all PatientToothRecord rows for a patient, ordered by notation
    system and then tooth identifier for deterministic display.
    """
    return (
        db.query(models.PatientToothRecord)
        .filter(models.PatientToothRecord.patient_id == patient_id)
        .order_by(
            models.PatientToothRecord.notation_system,
            models.PatientToothRecord.tooth_identifier,
        )
        .all()
    )


def initialize_dentition_chart(
    db: Session, patient_id: int, dentition_type: DentitionType
) -> list:
    """
    Bulk-insert a clean dentition chart for a patient based on their
    dentition type.  Each tooth slot gets the default status for its
    notation system (PRIMARY for deciduous, PRESENT for permanent).

    Existing records for this patient are deleted first so the chart
    always starts from a deterministic baseline.
    """
    # Clear any stale chart for this patient
    db.query(models.PatientToothRecord).filter(
        models.PatientToothRecord.patient_id == patient_id
    ).delete()
    db.commit()

    teeth_to_create = get_default_chart_teeth(dentition_type)
    new_records = []

    for fdi_int in teeth_to_create:
        if fdi_int in PRIMARY_FDI_TEETH:
            notation = NotationSystem.FDI_PRIMARY
        else:
            notation = NotationSystem.FDI_PERMANENT

        default_status = get_default_status_for_notation(notation)

        record = models.PatientToothRecord(
            patient_id=patient_id,
            tooth_identifier=str(fdi_int),
            notation_system=notation.value,
            status=default_status.value,
        )
        db.add(record)
        new_records.append(record)

    db.commit()
    for r in new_records:
        db.refresh(r)
    return new_records


def upsert_tooth_record(
    db: Session,
    patient_id: int,
    tooth_identifier: str,
    notation_system: NotationSystem,
    status: ToothStatus,
    surfaces: str | None = None,
    notes: str | None = None,
) -> models.PatientToothRecord:
    """
    Insert-or-update a single PatientToothRecord for a patient.
    The natural key is (patient_id, tooth_identifier, notation_system).
    """
    from datetime import datetime, timezone

    existing = (
        db.query(models.PatientToothRecord)
        .filter(
            models.PatientToothRecord.patient_id == patient_id,
            models.PatientToothRecord.tooth_identifier == tooth_identifier,
            models.PatientToothRecord.notation_system == notation_system.value,
        )
        .first()
    )

    if existing:
        existing.status = status.value
        if surfaces is not None:
            existing.surfaces = surfaces
        if notes is not None:
            existing.notes = notes
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_record = models.PatientToothRecord(
            patient_id=patient_id,
            tooth_identifier=tooth_identifier,
            notation_system=notation_system.value,
            status=status.value,
            surfaces=surfaces,
            notes=notes,
        )
        db.add(new_record)
        db.commit()
        db.refresh(new_record)
        return new_record


def upsert_tooth_records_batch(
    db: Session, patient_id: int, updates: list
) -> list:
    """
    Apply a batch of ToothStatusUpdateItem objects to a patient's chart.
    Returns the list of updated/created PatientToothRecord instances.
    """
    results = []
    for item in updates:
        record = upsert_tooth_record(
            db=db,
            patient_id=patient_id,
            tooth_identifier=item.tooth_identifier,
            notation_system=item.notation_system,
            status=item.status,
            surfaces=item.surfaces,
            notes=item.notes,
        )
        results.append(record)
    return results
