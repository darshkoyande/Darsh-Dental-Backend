from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import schemas, crud, database

router = APIRouter(
    prefix="/patients",
    tags=["patients"]
)

@router.get("/", response_model=List[schemas.PatientResponse])
def read_patients(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    patients = crud.get_patients(db, skip=skip, limit=limit)
    return patients

@router.post("/", response_model=schemas.PatientResponse, status_code=status.HTTP_201_CREATED)
def create_new_patient(patient: schemas.PatientCreate, db: Session = Depends(database.get_db)):
    db_patient = crud.get_patient_by_external_id(db, patient_id_str=patient.patient_id)
    if db_patient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient ID already registered"
        )
    new_patient = crud.create_patient(db=db, patient=patient)

    # Automatically create a blank default perio chart for every new patient.
    # All 32 FDI teeth are pre-populated with Normal status and zero measurements
    # so the charting view always starts from a clean, deterministic baseline.
    default_chart = schemas.PerioChartCreate(
        status="In Plan",
        notes="Initial periodontal chart created.",
        teeth=None  # triggers the 32-tooth blank pre-population in crud.create_chart
    )
    crud.create_chart(db=db, patient_db_id=new_patient.id, chart_in=default_chart)

    return new_patient

@router.get("/{patient_id}", response_model=schemas.PatientResponse)
def read_patient(patient_id: int, db: Session = Depends(database.get_db)):
    db_patient = crud.get_patient(db, patient_id=patient_id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return db_patient

@router.get("/by-external/{patient_id_str}", response_model=schemas.PatientResponse)
def read_patient_by_external(patient_id_str: str, db: Session = Depends(database.get_db)):
    db_patient = crud.get_patient_by_external_id(db, patient_id_str=patient_id_str)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return db_patient

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_patient(db, patient_id=patient_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return None
