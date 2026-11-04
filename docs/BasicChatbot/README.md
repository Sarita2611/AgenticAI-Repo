# AI Chatbot Integration Guide (FastAPI + SQLModel + OpenAI)

This guide documents the implementation of a multi-turn AI chatbot (configured here as an organizational HR Head) integrated with **FastAPI**, **SQLModel**, **PostgreSQL**, and the **OpenAI API**. It covers stateful conversation persistence, prompt engineering, and common runtime debugging fixes.

---

## 📑 Table of Contents

- [AI Chatbot Integration Guide (FastAPI + SQLModel + OpenAI)](#ai-chatbot-integration-guide-fastapi--sqlmodel--openai)
  - [📑 Table of Contents](#-table-of-contents)
  - [1. Architecture \& Chat Flow](#1-architecture--chat-flow)
  - [2. Environment \& Dependency Setup](#2-environment--dependency-setup)
    - [Configure .env](#configure-env)
  - [3. Database Models \& Schemas (models.py)](#3-database-models--schemas-modelspy)
  - [4. Chat Router Implementation (routers/chat.py)](#4-chat-router-implementation-routerschatpy)
  - [5. Application Registry (main.py)](#5-application-registry-mainpy)
  - [6. Verification \& Testing](#6-verification--testing)
      - [1. Ensure user exists](#1-ensure-user-exists)
      - [2. Send Message to HR Chatbot](#2-send-message-to-hr-chatbot)
      - [3. Verify contextual memory](#3-verify-contextual-memory)
      - [4. Fetch Stored Transcript](#4-fetch-stored-transcript)

---

## 1. Architecture & Chat Flow

```text
[Frontend Client]
       │
       │  POST /chat/ { user_id: 1, message: "..." }
       ▼
[FastAPI Router]
       │
       ├─► 1. Validate `user_id` exists in PostgreSQL (`user` table)
       ├─► 2. Query previous chronological conversation history (`chatmessage` table)
       ├─► 3. Build payload: System Prompt + Last N Turns + Current User Query
       │
       ▼
[OpenAI API (gpt-4o-mini)]
       │
       │  Returns assistant response
       ▼
[FastAPI Router]
       │
       ├─► 4. Insert both User Message & Assistant Message into `chatmessage` table
       ├─► 5. Commit session and refresh IDs
       │
       ▼
[Frontend Client] ◄── Returns { reply: "...", message_id: 2 }
```
## 2. Environment & Dependency Setup
Install Dependencies
Activate your virtual environment and install the required packages:

```bash
pip install openai python-dotenv
pip freeze > requirements.txt
```
### Configure .env
Create a .env file in the project root:
```python
OPENAI_API_KEY=your_actual_openai_api_key_here
```
Ensure `.env` is added to your `.gitignore` to prevent leaking credentials.

## 3. Database Models & Schemas (models.py)

Add the following schemas to models.py.
Important: Use datetime.now(timezone.utc) for default timestamps. Do not use datetime.utcnow() as PostgreSQL's timezone-aware columns require explicit tzinfo.

```python
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import Field, SQLModel

# ----------------- CHAT SCHEMAS & TABLE -----------------

class ChatMessageBase(SQLModel):
    user_id: int = Field(foreign_key="user.id", index=True)
    role: str       # "user" or "assistant"
    content: str

class ChatMessage(ChatMessageBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

class ChatRequest(SQLModel):
    user_id: int
    message: str

class ChatResponse(SQLModel):
    reply: str
    message_id: int  # Must be int to match auto-incrementing primary key
```

## 4. Chat Router Implementation (routers/chat.py)
Create routers/chat.py

```python
import os
from typing import List
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAI
from sqlmodel import Session, select

from database import get_session
from models import User, ChatMessage, ChatRequest, ChatResponse

load_dotenv()

router = APIRouter(prefix="/chat", tags=["HR Chatbot"])

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

HR_SYSTEM_PROMPT = (
    "You are the Head of Human Resources at a professional organization. "
    "Respond politely, constructively, and empathetically, maintaining professionalism "
    "and alignment with organizational policies and workplace etiquette."
)

@router.post("/", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def talk_to_hr(payload: ChatRequest, session: Session = Depends(get_session)):
    # 1. Validate user existence
    user_db = session.get(User, payload.user_id)
    if not user_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {payload.user_id} not found. Please create a user first."
        )

    # 2. Fetch conversation history for this specific user
    history_records = session.exec(
        select(ChatMessage)
        .where(ChatMessage.user_id == payload.user_id)
        .order_by(ChatMessage.created_at.asc())
    ).all()

    # 3. Construct prompt history for context injection
    messages = [{"role": "system", "content": HR_SYSTEM_PROMPT}]

    # Maintain context window by feeding the last 10 messages
    for entry in history_records[-10:]:
        messages.append({"role": entry.role, "content": entry.content})

    # Append current user query
    messages.append({"role": "user", "content": payload.message})

    # 4. Request completion from OpenAI
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
        )
        assistant_reply = completion.choices[0].message.content
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenAI service error: {str(e)}"
        )

    # 5. Persist both user input and assistant output
    user_msg_db = ChatMessage(
        user_id=payload.user_id,
        role="user",
        content=payload.message
    )
    assistant_msg_db = ChatMessage(
        user_id=payload.user_id,
        role="assistant",
        content=assistant_reply
    )

    session.add(user_msg_db)
    session.add(assistant_msg_db)
    session.commit()
    session.refresh(assistant_msg_db)

    return ChatResponse(
        reply=assistant_reply,
        message_id=assistant_msg_db.id
    )

# Endpoint to inspect conversation transcript
@router.get("/history/{user_id}", response_model=List[ChatMessage])
def get_user_chat_history(user_id: int, session: Session = Depends(get_session)):
    user_db = session.get(User, user_id)
    if not user_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found."
        )

    records = session.exec(
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.created_at.asc())
    ).all()
    return records
```

## 5. Application Registry (main.py)
Mount the chat router inside main.py

```python
# Chat Router
app.include_router(chat.router)
```

## 6. Verification & Testing
#### 1. Ensure user exists
```bash
curl -X POST [http://127.0.0.1:8000/users/](http://127.0.0.1:8000/users/) \
  -H "Content-Type: application/json" \
  -d '{"username": "employee_one", "nickname": "Alex"}'
```
** you can check the user_id so that while testing the API you can put the same user id like 1

#### 2. Send Message to HR Chatbot

```bash
curl -X POST [http://127.0.0.1:8000/users/](http://127.0.0.1:8000/users/) \
  -H "Content-Type: application/json" \
  -d '{"username": "employee_one", "nickname": "Alex"}'
```

#### 3. Verify contextual memory
Follow up with a contextual question that depends on the prior message:
```bash
curl -X POST [http://127.0.0.1:8000/chat/](http://127.0.0.1:8000/chat/) \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "Does this also apply if I take a Friday and a Monday off?"}'
```

#### 4. Fetch Stored Transcript
```bash
curl -X GET [http://127.0.0.1:8000/chat/history/1](http://127.0.0.1:8000/chat/history/1)
```