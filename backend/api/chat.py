from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from models import ChatMessage, ChatRequest, ChatResponse, User
from services.chat_service import (
    ChatMessageInput,
    ChatServiceError,
    ChatServiceNotConfigured,
    generate_reply,
)

router = APIRouter(prefix="/chat", tags=["HR Chatbot"])

HR_SYSTEM_PROMPT = (
    "You are the Head of Human Resources at a professional organization. "
    "Respond politely, constructively, and empathetically, maintaining "
    "professionalism and alignment with organizational policies and workplace etiquette."
)


@router.post("/", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def talk_to_hr(payload: ChatRequest, session: Session = Depends(get_session)):
    user = session.get(User, payload.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with {payload.user_id} not found. Please create a user first.",
        )

    history = session.exec(
        select(ChatMessage)
        .where(ChatMessage.user_id == payload.user_id)
        .order_by(ChatMessage.created_at.asc())
    ).all()

    messages: list[ChatMessageInput] = [
        {"role": "system", "content": HR_SYSTEM_PROMPT}
    ]
    messages.extend(
        {"role": entry.role, "content": entry.content} for entry in history[-10:]
    )
    messages.append({"role": "user", "content": payload.message})

    try:
        reply = generate_reply(messages)
    except ChatServiceNotConfigured as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except ChatServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error

    session.add(
        ChatMessage(user_id=payload.user_id, role="user", content=payload.message)
    )
    assistant_message = ChatMessage(
        user_id=payload.user_id,
        role="assistant",
        content=reply,
    )
    session.add(assistant_message)
    session.commit()
    session.refresh(assistant_message)

    return ChatResponse(reply=reply, message_id=assistant_message.id)


@router.get("/history/{user_id}", response_model=List[ChatMessage])
def get_user_chat_history(user_id: int, session: Session = Depends(get_session)):
    if not session.get(User, user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with {user_id} not found.",
        )
    return session.exec(
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.created_at.asc())
    ).all()
