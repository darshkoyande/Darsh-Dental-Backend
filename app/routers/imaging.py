from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
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
    # Create record
    db_imaging = crud.create_imaging_record(db=db, imaging=imaging)
    return db_imaging

# New endpoint to upload image file from device
from fastapi import File, UploadFile, Form

@router.post("/records/upload", response_model=schemas.ImagingRecordResponse, status_code=status.HTTP_201_CREATED)
async def upload_imaging_record(
    patient_id: int = Form(...),
    imaging_type: str = Form(...),
    tooth_numbers: str = Form(None),
    findings: str = Form(None),
    radiologist_notes: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    """Upload an imaging record with an image file."""
    # Verify patient exists
    db_patient = crud.get_patient(db, patient_id=patient_id)
    if not db_patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    # Save file to uploads directory
    import os, uuid
    upload_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    # Create imaging record
    imaging_data = schemas.ImagingRecordCreate(
        patient_id=patient_id,
        imaging_type=imaging_type,
        tooth_numbers=tooth_numbers,
        findings=findings,
        radiologist_notes=radiologist_notes,
    )
    db_imaging = crud.create_imaging_record(db=db, imaging=imaging_data)
    # Update file_url
    db_imaging.file_url = file_path
    db.commit()
    db.refresh(db_imaging)
    return db_imaging
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
