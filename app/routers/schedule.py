from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import schemas, crud, database

router = APIRouter(
    prefix="/schedule",
    tags=["schedule"]
)

@router.post("/appointments", response_model=schemas.AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(appointment: schemas.AppointmentCreate, db: Session = Depends(database.get_db)):
    """Create a new appointment for a patient."""
    # Verify patient exists
    db_patient = crud.get_patient(db, patient_id=appointment.patient_id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return crud.create_appointment(db=db, appointment=appointment)

@router.get("/appointments/{appointment_id}", response_model=schemas.AppointmentResponse)
def get_appointment(appointment_id: int, db: Session = Depends(database.get_db)):
    """Get a specific appointment."""
    db_appointment = crud.get_appointment(db, appointment_id=appointment_id)
    if not db_appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    return db_appointment

@router.get("/patients/{patient_id}/appointments", response_model=List[schemas.AppointmentResponse])
def get_patient_appointments(patient_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    """Get all appointments for a patient."""
    # Verify patient exists
    db_patient = crud.get_patient(db, patient_id=patient_id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return crud.get_patient_appointments(db, patient_id=patient_id, skip=skip, limit=limit)

@router.put("/appointments/{appointment_id}", response_model=schemas.AppointmentResponse)
def update_appointment(appointment_id: int, appointment: schemas.AppointmentCreate, db: Session = Depends(database.get_db)):
    """Update an appointment."""
    db_appointment = crud.update_appointment(db, appointment_id=appointment_id, appointment=appointment)
    if not db_appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    return db_appointment

@router.delete("/appointments/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(appointment_id: int, db: Session = Depends(database.get_db)):
    """Delete an appointment."""
    db_appointment = crud.get_appointment(db, appointment_id=appointment_id)
    if not db_appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    crud.delete_appointment(db, appointment_id=appointment_id)
