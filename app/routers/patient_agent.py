"""
app/routers/patient_agent.py
==============================
Exposes the patient agent over HTTP. The frontend sends the full
conversation history each request (stateless backend — see design
note in project discussion). patient_id is taken from the auth
token, never from the request body.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Literal
from pydantic import BaseModel

from app import database
from app.agents.patient_agent import run_patient_agent
from app.routers.auth import decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/agent/patient", tags=["patient-agent"])
security = HTTPBearer()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    reply: str


def get_current_patient(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> int:
    """
    Decodes the auth token and returns the caller's linked_patient_id.
    Rejects anyone who isn't logged in as a patient — this is the
    security boundary: patient_id NEVER comes from the request body.
    """
    try:
        token_data = decode_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    if token_data.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patient accounts can use this endpoint",
        )
    # Note: assumes TokenData/decode_token exposes linked_patient_id.
    # If it currently doesn't, we add it there next.
    return token_data.linked_patient_id


@router.post("/chat", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    patient_id: int = Depends(get_current_patient),
    db: Session = Depends(database.get_db),
):
    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    reply = run_patient_agent(db, patient_id, messages)
    return ChatResponse(reply=reply)