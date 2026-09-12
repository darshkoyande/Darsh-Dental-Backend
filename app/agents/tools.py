"""
app/agents/tools.py
====================
Thin, agent-facing functions that wrap the existing DB layer (crud.py /
models.py). These are the ONLY way the LLM agents touch the database —
no raw SQL, no direct model mutation outside what's defined here.

Each function returns plain dicts/lists (not ORM objects), because that's
what gets serialized back into the LLM's tool-result messages.
"""

from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app import models, schemas, crud


# ---------------------------------------------------------------------------
# Dentist-side tools
# ---------------------------------------------------------------------------

def search_patients(db: Session, query: str, limit: int = 10) -> list[dict]:
    """
    Search patients by name or external patient_id (partial match, case-insensitive).
    No dedicated search endpoint exists yet in patients.py, so we query
    the model directly here rather than adding a new REST route for it.
    """
    like = f"%{query}%"
    results = (
        db.query(models.Patient)
        .filter(or_(models.Patient.name.ilike(like), models.Patient.patient_id.ilike(like)))
        .limit(limit)
        .all()
    )
    return [
        {
            "id": p.id,
            "patient_id": p.patient_id,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "primary_doctor": p.primary_doctor,
            "treatment_status": p.treatment_status,
        }
        for p in results
    ]


def get_patient_history(db: Session, patient_id: int) -> dict:
    """
    Full picture for a dentist: patient core record + appointment history +
    tooth-level treatment history. Reuses crud.get_patient /
    crud.get_patient_appointments; queries ToothTreatment directly since
    there's no crud helper for it yet.
    """
    patient = crud.get_patient(db, patient_id=patient_id)
    if not patient:
        return {"error": f"No patient found with id={patient_id}"}

    appointments = crud.get_patient_appointments(db, patient_id=patient_id, limit=50)
    treatments = (
        db.query(models.ToothTreatment)
        .filter(models.ToothTreatment.patient_id == patient_id)
        .order_by(models.ToothTreatment.treatment_date.desc())
        .all()
    )

    return {
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "diagnosis": patient.diagnosis,
            "treatment_status": patient.treatment_status,
        },
        "appointments": [
            {
                "date": a.appointment_date.isoformat(),
                "type": a.appointment_type,
                "dentist": a.dentist_name,
                "status": a.status,
            }
            for a in appointments
        ],
        "tooth_treatments": [
            {
                "tooth_number": t.tooth_number,
                "procedure": t.procedure,
                "dentist": t.dentist,
                "date": t.treatment_date.isoformat(),
                "status": t.status,
                "notes": t.notes,
            }
            for t in treatments
        ],
    }


def get_today_schedule(db: Session, dentist_name: str) -> list[dict]:
    """All of a given dentist's appointments for today, ordered by time."""
    today = date.today()
    appointments = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.dentist_name == dentist_name,
            models.Appointment.appointment_date >= datetime.combine(today, datetime.min.time()),
            models.Appointment.appointment_date < datetime.combine(today, datetime.max.time()),
        )
        .order_by(models.Appointment.appointment_date)
        .all()
    )
    return [
        {
            "id": a.id,
            "patient_id": a.patient_id,
            "time": a.appointment_date.strftime("%H:%M"),
            "type": a.appointment_type,
            "status": a.status,
            "duration_minutes": a.duration_minutes,
        }
        for a in appointments
    ]


# ---------------------------------------------------------------------------
# Patient-side tools
# ---------------------------------------------------------------------------

def book_appointment(
    db: Session,
    patient_id: int,
    appointment_date: datetime,
    appointment_type: str,
    dentist_name: str,
    notes: str | None = None,
) -> dict:
    """Books a new appointment via the existing crud.create_appointment logic."""
    appt_in = schemas.AppointmentCreate(
        patient_id=patient_id,
        appointment_date=appointment_date,
        appointment_type=appointment_type,
        dentist_name=dentist_name,
        notes=notes,
    )
    appt = crud.create_appointment(db=db, appointment=appt_in)
    return {
        "id": appt.id,
        "appointment_date": appt.appointment_date.isoformat(),
        "dentist_name": appt.dentist_name,
        "status": appt.status,
    }