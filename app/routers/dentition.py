"""
app/routers/dentition.py
~~~~~~~~~~~~~~~~~~~~~~~~
API endpoints for the flexible dentition tracking system.

Prefix  : /api/v1
Tag     : dentition

Endpoints
---------
GET  /api/v1/patients/{patient_id}/chart
    Returns the patient's full dentition chart. If no chart exists yet, one is
    auto-initialised from the patient's age using resolve_dentition_type().

POST /api/v1/patients/{patient_id}/chart/teeth
PUT  /api/v1/patients/{patient_id}/chart/teeth
    Accepts a ToothStatusUpdateRequest body and applies one or more tooth-level
    status updates to the patient's chart. POST and PUT are both supported so
    the endpoint is callable from clients that prefer either verb.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import schemas, crud, database
from app.dentition import (
    DentitionType,
    resolve_dentition_type,
    PRIMARY_FDI_TEETH,
    PERMANENT_FDI_TEETH,
)

router = APIRouter(
    prefix="/api/v1",
    tags=["dentition"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_init_chart(db: Session, patient_id: int, patient_age: int) -> list:
    """
    Return existing tooth records for a patient.
    If none exist, auto-initialise a chart appropriate for the patient's age.
    """
    records = crud.get_patient_tooth_chart(db, patient_id=patient_id)
    if not records:
        dentition_type = resolve_dentition_type(patient_age)
        records = crud.initialize_dentition_chart(
            db, patient_id=patient_id, dentition_type=dentition_type
        )
    return records


def _build_chart_response(
    db_patient,
    records: list,
) -> schemas.DentitionChartResponse:
    """
    Build a DentitionChartResponse from a Patient ORM object and its
    list of PatientToothRecord rows.
    """
    dentition_type = resolve_dentition_type(db_patient.age)
    teeth_responses = [
        schemas.PatientToothRecordResponse.model_validate(r) for r in records
    ]
    return schemas.DentitionChartResponse(
        patient_id=db_patient.id,
        patient_name=db_patient.name,
        age=db_patient.age,
        dentition_type=dentition_type,
        total_teeth=len(records),
        teeth=teeth_responses,
    )


# ── GET /api/v1/patients/{patient_id}/chart ───────────────────────────────────

@router.get(
    "/patients/{patient_id}/chart",
    response_model=schemas.DentitionChartResponse,
    summary="Get patient dentition chart",
    description=(
        "Returns the patient's current dentition map. "
        "If no chart has been recorded yet, one is automatically initialised "
        "from the patient's age: primary teeth (< 6 yrs), mixed dentition "
        "(6-11 yrs), or full permanent dentition (≥ 12 yrs)."
    ),
)
def get_dentition_chart(
    patient_id: int,
    db: Session = Depends(database.get_db),
) -> schemas.DentitionChartResponse:
    db_patient = crud.get_patient(db, patient_id=patient_id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient {patient_id} not found.",
        )

    records = _get_or_init_chart(db, patient_id=patient_id, patient_age=db_patient.age)
    return _build_chart_response(db_patient, records)


# ── POST & PUT /api/v1/patients/{patient_id}/chart/teeth ─────────────────────

def _handle_chart_update(
    patient_id: int,
    update_request: schemas.ToothStatusUpdateRequest,
    db: Session,
) -> schemas.DentitionChartResponse:
    """Shared implementation for POST and PUT tooth update endpoints."""
    db_patient = crud.get_patient(db, patient_id=patient_id)
    if not db_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient {patient_id} not found.",
        )

    # Ensure a chart exists before we apply updates (auto-init if needed).
    _get_or_init_chart(db, patient_id=patient_id, patient_age=db_patient.age)

    # Apply all updates
    crud.upsert_tooth_records_batch(
        db, patient_id=patient_id, updates=update_request.updates
    )

    # Reload the full chart and return it
    records = crud.get_patient_tooth_chart(db, patient_id=patient_id)
    return _build_chart_response(db_patient, records)


@router.post(
    "/patients/{patient_id}/chart/teeth",
    response_model=schemas.DentitionChartResponse,
    status_code=status.HTTP_200_OK,
    summary="Update tooth statuses (POST)",
    description=(
        "Update one or more teeth in the patient's dentition chart. "
        "Accepts a batch of tooth status updates. Creates the chart if "
        "it does not yet exist."
    ),
)
def post_update_teeth(
    patient_id: int,
    update_request: schemas.ToothStatusUpdateRequest,
    db: Session = Depends(database.get_db),
) -> schemas.DentitionChartResponse:
    return _handle_chart_update(patient_id, update_request, db)


@router.put(
    "/patients/{patient_id}/chart/teeth",
    response_model=schemas.DentitionChartResponse,
    status_code=status.HTTP_200_OK,
    summary="Update tooth statuses (PUT)",
    description=(
        "Update one or more teeth in the patient's dentition chart. "
        "Accepts a batch of tooth status updates. Creates the chart if "
        "it does not yet exist."
    ),
)
def put_update_teeth(
    patient_id: int,
    update_request: schemas.ToothStatusUpdateRequest,
    db: Session = Depends(database.get_db),
) -> schemas.DentitionChartResponse:
    return _handle_chart_update(patient_id, update_request, db)
