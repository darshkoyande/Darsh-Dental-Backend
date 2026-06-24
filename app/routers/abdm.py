from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from typing import List, Dict, Any
from app import schemas, database, crud

router = APIRouter(
    prefix="/abdm",
    tags=["ABDM Integration"]
)

@router.post("/verify-abha", response_model=schemas.AbhaVerificationResponse)
def verify_abha_number(request: schemas.AbhaVerificationRequest):
    # If the user passes Aarav's ABHA number from the mockup, return his details
    if request.abha_number == "12-3456-7890-1234":
        return schemas.AbhaVerificationResponse(
            status="SUCCESS",
            verified=True,
            name="Aarav Mehta",
            gender="MALE",
            date_of_birth="1979-06-12",
            address="Apartment 402, Highrise Heights, Mumbai, Maharashtra - 400001",
            mobile="+91-9876543210"
        )
    
    # Generic mock response for other valid ABHA numbers
    return schemas.AbhaVerificationResponse(
        status="SUCCESS",
        verified=True,
        name="Simulated Patient Name",
        gender="FEMALE",
        date_of_birth="1990-01-01",
        address="123 Health Street, New Delhi - 110001",
        mobile="+91-9999999999"
    )

@router.post("/link-care-context", response_model=schemas.AbdmLinkResponse)
def link_care_context(request: schemas.AbdmLinkRequest, db: Session = Depends(database.get_db)):
    db_patient = crud.get_patient_by_external_id(db, patient_id_str=request.patient_id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient {request.patient_id} not found locally"
        )
    
    # Generate mock transaction id and care context reference
    txn_id = str(uuid.uuid4())
    care_context_ref = f"LUMEN-DENTAL-CLINIC-PERIO-CHART-{db_patient.id}"
    
    # Write to audit log that care context linkage occurred
    crud.create_audit_log(
        db,
        action="ABDM_LINK",
        resource_type="Patient",
        resource_id=db_patient.patient_id,
        details=f"Linked patient {db_patient.patient_id} to ABHA {request.abha_number} with care context {care_context_ref}"
    )
    
    return schemas.AbdmLinkResponse(
        status="LINKED",
        transaction_id=txn_id,
        linked_care_contexts=[care_context_ref]
    )

@router.get("/patients/{patient_id}/care-contexts", response_model=List[Dict[str, Any]])
def list_linked_care_contexts(patient_id: str, db: Session = Depends(database.get_db)):
    db_patient = crud.get_patient_by_external_id(db, patient_id_str=patient_id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Mock listing care contexts
    return [
        {
            "careContextReference": f"LUMEN-DENTAL-CLINIC-PERIO-CHART-{db_patient.id}",
            "display": "Periodontal Charting Module - Lumen Dental EMR",
            "type": "DiagnosticReport",
            "linkedOn": "2026-06-12T10:30:00Z"
        }
    ]
