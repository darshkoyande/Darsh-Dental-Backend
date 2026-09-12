"""
app/routers/dentist_agent.py
==============================
Exposes the dentist agent over HTTP. Same stateless pattern as the
patient router: frontend sends full message history each request.
dentist_name comes from the auth token, never the request body.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Literal
from pydantic import BaseModel

from app import database
from app.agents.dentist_agent import run_dentist_agent
from app.routers.auth import decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/agent/dentist", tags=["dentist-agent"])
security = HTTPBearer()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    reply: str


def get_current_dentist(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Decodes the token, enforces role == doctor, returns the dentist's own name."""
    try:
        token_data = decode_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    if token_data.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctor accounts can use this endpoint",
        )
    return token_data.name


@router.post("/chat", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    dentist_name: str = Depends(get_current_dentist),
    db: Session = Depends(database.get_db),
):
    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    reply = run_dentist_agent(db, dentist_name, messages)
    return ChatResponse(reply=reply)