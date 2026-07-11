"""
B1 — Authentication Router
===========================
POST /auth/login  → validate credentials, return a mock token + user object.

Token format (non-cryptographic, demo only):
    base64( json({ user_id, username, role, exp }) )

A real python-jose / PyJWT implementation can be swapped in by replacing
_create_token() without touching any other endpoint.

Seed users (created once at startup via seed_users()):
    dr_mehra   / password123  — role: doctor
    rajivkumar / password123  — role: patient, linked to patient DB id=1
"""

import base64
import json
import time
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas, database

router = APIRouter(prefix="/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Password hashing — using bcrypt directly (passlib is not compatible with
# bcrypt >= 4.x on Python 3.14)
# ---------------------------------------------------------------------------


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of the plain-text password."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches the stored bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ---------------------------------------------------------------------------
# Mock token helpers
# ---------------------------------------------------------------------------
TOKEN_TTL_SECONDS = 60 * 60 * 8  # 8 hours


def _create_token(user: models.User) -> str:
    """
    Returns a base64-encoded JSON payload.
    NOT cryptographically signed — suitable for demo/dev only.
    Replace with python-jose or PyJWT for production.
    """
    payload = {
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    raw = json.dumps(payload, separators=(",", ":"))
    return base64.b64encode(raw.encode()).decode()


def decode_token(token: str) -> schemas.TokenData:
    """Decode and return TokenData from a mock token. Raises ValueError on failure."""
    try:
        raw = base64.b64decode(token.encode()).decode()
        payload = json.loads(raw)
        if payload.get("exp", 0) < int(time.time()):
            raise ValueError("Token expired")
        return schemas.TokenData(
            user_id=payload["user_id"],
            username=payload["username"],
            role=payload["role"],
        )
    except Exception as exc:
        raise ValueError(f"Invalid token: {exc}") from exc


# ---------------------------------------------------------------------------
# Seed Users — called once at startup
# ---------------------------------------------------------------------------
def seed_users(db: Session) -> None:
    """
    Idempotently create the two demo users.
    dr_mehra   → doctor
    rajivkumar → patient linked to the first patient row (id=1)
    """
    # Doctor
    if not db.query(models.User).filter(models.User.username == "dr_mehra").first():
        db.add(models.User(
            username="dr_mehra",
            hashed_password=hash_password("password123"),
            role="doctor",
            name="Dr. Anita Mehra",
        ))

    # Patient — link to first patient record if it exists
    if not db.query(models.User).filter(models.User.username == "rajivkumar").first():
        first_patient = db.query(models.Patient).order_by(models.Patient.id).first()
        db.add(models.User(
            username="rajivkumar",
            hashed_password=hash_password("password123"),
            role="patient",
            name="Rajivkumar",
            linked_patient_id=first_patient.id if first_patient else None,
        ))

    db.commit()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post(
    "/login",
    response_model=schemas.LoginResponse,
    summary="Authenticate user and return a session token",
)
def login(body: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == body.username).first()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = _create_token(user)
    return schemas.LoginResponse(
        token=token,
        user=schemas.UserResponse(
            id=user.id,
            username=user.username,
            role=user.role,
            name=user.name,
            linked_patient_id=user.linked_patient_id,
            created_at=user.created_at,
        ),
    )
