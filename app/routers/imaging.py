from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import schemas, crud, database

router = APIRouter(
    prefix="/imaging",
    tags=["imaging"]
)

@router.post("/records", response_model=schemas.ImagingRecordResponse, status_code=status.HTTP_201_CREATED)
def create_imaging_record(imaging: schemas.ImagingRecordCreate, db: Session = Depends(database.get_db)):
    """Create a new imaging record for a patient."""
    # Verify patient exists
    db_patient = crud.get_patient(db, patient_id=imaging.patient_id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return crud.create_imaging_record(db=db, imaging=imaging)

@router.get("/records/{imaging_id}", response_model=schemas.ImagingRecordResponse)
def get_imaging_record(imaging_id: int, db: Session = Depends(database.get_db)):
    """Get a specific imaging record."""
    db_imaging = crud.get_imaging_record(db, imaging_id=imaging_id)
    if not db_imaging:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imaging record not found"
        )
    return db_imaging

@router.get("/patients/{patient_id}/records", response_model=List[schemas.ImagingRecordResponse])
def get_patient_imaging_records(patient_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    """Get all imaging records for a patient."""
    # Verify patient exists
    db_patient = crud.get_patient(db, patient_id=patient_id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return crud.get_patient_imaging_records(db, patient_id=patient_id, skip=skip, limit=limit)

@router.put("/records/{imaging_id}", response_model=schemas.ImagingRecordResponse)
def update_imaging_record(imaging_id: int, imaging: schemas.ImagingRecordCreate, db: Session = Depends(database.get_db)):
    """Update an imaging record."""
    db_imaging = crud.update_imaging_record(db, imaging_id=imaging_id, imaging=imaging)
    if not db_imaging:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imaging record not found"
        )
    return db_imaging

@router.delete("/records/{imaging_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_imaging_record(imaging_id: int, db: Session = Depends(database.get_db)):
    """Delete an imaging record."""
    db_imaging = crud.get_imaging_record(db, imaging_id=imaging_id)
    if not db_imaging:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imaging record not found"
        )
    crud.delete_imaging_record(db, imaging_id=imaging_id)
