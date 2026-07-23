from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app import schemas, crud, database

router = APIRouter(
    prefix="/diagnoses",
    tags=["diagnoses"],
)


@router.get("/", response_model=List[schemas.DiagnosisRecordResponse])
def get_all_diagnoses(db: Session = Depends(database.get_db)):
    """
    Returns all diagnosis records from the dental dataset.
    Each record contains a diagnosis name, its standard treatment,
    and the prescribed medicine (null when none is applicable).
    """
    return crud.get_all_diagnoses(db)
