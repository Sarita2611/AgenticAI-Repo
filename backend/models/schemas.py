from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class HeroBase(SQLModel):
    name: str
    secret_name: str
    age: Optional[int] = None


class Hero(HeroBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)


class HeroCreate(HeroBase):
    pass


class HeroUpdate(SQLModel):
    name: Optional[str] = None
    secret_name: Optional[str] = None
    age: Optional[int] = None


class UserBase(SQLModel):
    username: str
    nickname: Optional[str] = None


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)


class UserCreate(UserBase):
    pass


class UserLogin(SQLModel):
    username: str


class UserUpdate(SQLModel):
    username: Optional[str] = None
    nickname: Optional[str] = None


class ChatMessageBase(SQLModel):
    user_id: int = Field(foreign_key="user.id", index=True)
    role: str
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
    message_id: int
