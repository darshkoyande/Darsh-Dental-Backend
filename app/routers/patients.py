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
    return crud.create_patient(db=db, patient=patient)

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
