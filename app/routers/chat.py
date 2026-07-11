"""
B2 / B3 — Secure Chat & Notification Router
=============================================
POST /chat/send                          → Create a ChatMessage row
GET  /chat/history/{patient_id}          → Paginated message thread for a patient
GET  /notifications/unread-count/{user_id}  → Count unread messages for a recipient
POST /notifications/mark-read/{user_id}  → Mark all messages for this user as read
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app import models, schemas, database

router = APIRouter(tags=["chat"])


# ---------------------------------------------------------------------------
# B2: Chat endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/chat/send",
    response_model=schemas.ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a secure chat message",
)
def send_message(body: schemas.ChatMessageCreate, db: Session = Depends(database.get_db)):
    """Store a new chat message from sender_id to receiver_id."""
    # Validate both users exist
    for uid, label in [(body.sender_id, "sender"), (body.receiver_id, "receiver")]:
        if not db.query(models.User).filter(models.User.id == uid).first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User not found: {label} id={uid}",
            )

    msg = models.ChatMessage(
        sender_id=body.sender_id,
        receiver_id=body.receiver_id,
        message_text=body.message_text,
        is_read=False,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.get(
    "/chat/history/{patient_id}",
    response_model=list[schemas.ChatMessageResponse],
    summary="Get paginated message history for a patient thread",
)
def get_chat_history(
    patient_id: int,
    skip: int = Query(default=0, ge=0, description="Offset for pagination"),
    limit: int = Query(default=50, ge=1, le=200, description="Max messages to return"),
    db: Session = Depends(database.get_db),
):
    """
    Returns all messages where the patient's user_id appears as either
    sender or receiver, ordered oldest-first. The patient_id here is the
    User.id (not Patient.id) so the doctor can call this with the patient
    user's ID to pull the full conversation thread.
    """
    messages = (
        db.query(models.ChatMessage)
        .filter(
            or_(
                models.ChatMessage.sender_id == patient_id,
                models.ChatMessage.receiver_id == patient_id,
            )
        )
        .order_by(models.ChatMessage.timestamp)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return messages


# ---------------------------------------------------------------------------
# B3: Notification endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/notifications/unread-count/{user_id}",
    response_model=schemas.UnreadCountResponse,
    summary="Get unread message count for a user",
)
def get_unread_count(user_id: int, db: Session = Depends(database.get_db)):
    """Count ChatMessage rows where receiver_id == user_id AND is_read == False."""
    if not db.query(models.User).filter(models.User.id == user_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User not found: id={user_id}",
        )

    count = (
        db.query(models.ChatMessage)
        .filter(
            and_(
                models.ChatMessage.receiver_id == user_id,
                models.ChatMessage.is_read == False,  # noqa: E712
            )
        )
        .count()
    )
    return schemas.UnreadCountResponse(user_id=user_id, unread_count=count)


@router.post(
    "/notifications/mark-read/{user_id}",
    summary="Mark all messages addressed to this user as read",
)
def mark_all_read(user_id: int, db: Session = Depends(database.get_db)):
    """Sets is_read = True for every message where receiver_id == user_id."""
    if not db.query(models.User).filter(models.User.id == user_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User not found: id={user_id}",
        )

    updated = (
        db.query(models.ChatMessage)
        .filter(
            and_(
                models.ChatMessage.receiver_id == user_id,
                models.ChatMessage.is_read == False,  # noqa: E712
            )
        )
        .update({"is_read": True}, synchronize_session="fetch")
    )
    db.commit()
    return {"user_id": user_id, "marked_read": updated}
