from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import schemas, crud, database

router = APIRouter(
    prefix="/reports",
    tags=["reports"]
)

@router.post("/", response_model=schemas.ClinicalReportResponse, status_code=status.HTTP_201_CREATED)
def create_clinical_report(report: schemas.ClinicalReportCreate, db: Session = Depends(database.get_db)):
    """Create a new clinical report for a patient."""
    # Verify patient exists
    db_patient = crud.get_patient(db, patient_id=report.patient_id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return crud.create_clinical_report(db=db, report=report)

@router.get("/{report_id}", response_model=schemas.ClinicalReportResponse)
def get_clinical_report(report_id: int, db: Session = Depends(database.get_db)):
    """Get a specific clinical report."""
    db_report = crud.get_clinical_report(db, report_id=report_id)
    if not db_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    return db_report

@router.get("/patients/{patient_id}/all", response_model=List[schemas.ClinicalReportResponse])
def get_patient_reports(patient_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    """Get all clinical reports for a patient."""
    # Verify patient exists
    db_patient = crud.get_patient(db, patient_id=patient_id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return crud.get_patient_reports(db, patient_id=patient_id, skip=skip, limit=limit)

@router.put("/{report_id}", response_model=schemas.ClinicalReportResponse)
def update_clinical_report(report_id: int, report: schemas.ClinicalReportCreate, db: Session = Depends(database.get_db)):
    """Update a clinical report."""
    db_report = crud.update_clinical_report(db, report_id=report_id, report=report)
    if not db_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    return db_report

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_clinical_report(report_id: int, db: Session = Depends(database.get_db)):
    """Delete a clinical report."""
    db_report = crud.get_clinical_report(db, report_id=report_id)
    if not db_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    crud.delete_clinical_report(db, report_id=report_id)
