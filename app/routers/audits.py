from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import schemas, crud, database

router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"]
)

@router.get("/", response_model=List[schemas.AuditLogResponse])
def read_audit_logs(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    logs = crud.get_audit_logs(db, skip=skip, limit=limit)
    return logs
