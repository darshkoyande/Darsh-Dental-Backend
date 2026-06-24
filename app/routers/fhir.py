from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import database, crud, fhir

router = APIRouter(
    prefix="/fhir",
    tags=["FHIR R4"]
)

@router.get("/Patient/{id}")
def get_fhir_patient_resource(id: int, db: Session = Depends(database.get_db)):
    db_patient = crud.get_patient(db, patient_id=id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return fhir.get_fhir_patient(db_patient)

@router.get("/DiagnosticReport/{chart_id}")
def get_fhir_diagnostic_report_resource(chart_id: int, db: Session = Depends(database.get_db)):
    db_chart = crud.get_chart(db, chart_id=chart_id)
    if not db_chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Periodontal chart not found"
        )
    db_patient = crud.get_patient(db, db_chart.patient_id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient linked to chart not found"
        )
    
    return fhir.get_fhir_diagnostic_report(db_chart, db_patient, db_chart.teeth_data)
