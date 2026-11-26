from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import JSON, Column
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


class EvaluationDataset(SQLModel, table=True):
    __tablename__ = "evaluationdataset"

    id: Optional[int] = Field(default=None, primary_key=True)
    question: str
    expected_answer: str
    relevant_chunk_ids: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
    )
    category: str = Field(default="General")
    dataset_version: str = Field(default="v1", index=True)


class EvaluationRun(SQLModel, table=True):
    __tablename__ = "evaluationrun"

    run_id: Optional[int] = Field(default=None, primary_key=True)
    model_name: str
    embedding_model: str
    prompt_version: str
    chunk_size: int
    top_k: int
    dataset_version: str
    run_date: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True,
    )


class RagEvaluationResult(SQLModel, table=True):
    __tablename__ = "ragevaluationresult"

    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="evaluationrun.run_id", index=True)
    question_id: int = Field(foreign_key="evaluationdataset.id", index=True)
    actual_answer: str
    retrieved_context: list[dict[str, Any]] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
    )
    precision: float
    recall: float
    mrr: float
    faithfulness: float
    answer_relevancy: float
    execution_time: float
    evaluated_on: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True,
    )


class EvaluationDatasetCreate(SQLModel):
    question: str = Field(min_length=1)
    expected_answer: str = Field(min_length=1)
    relevant_chunk_ids: list[str] = Field(min_length=1)
    category: str = Field(default="General", min_length=1)
    dataset_version: str = Field(default="v1", min_length=1)


class EvaluationRunRequest(SQLModel):
    dataset_version: str = Field(default="v1", min_length=1)


class EvaluationChunk(SQLModel):
    chunk_id: str
    page_number: int
    preview: str


class ChatQuestionCandidate(SQLModel):
    message_id: int
    question: str
    created_at: datetime


class EvaluationRunSummary(SQLModel):
    run_id: int
    model_name: str
    embedding_model: str
    prompt_version: str
    chunk_size: int
    top_k: int
    dataset_version: str
    run_date: datetime
    result_count: int
    precision: Optional[float] = None
    recall: Optional[float] = None
    mrr: Optional[float] = None
    faithfulness: Optional[float] = None
    answer_relevancy: Optional[float] = None


class EvaluationDashboard(SQLModel):
    dataset_count: int
    dataset_versions: list[str]
    runs: list[EvaluationRunSummary]


class EvaluationRunResponse(SQLModel):
    run: EvaluationRun
    results: list[RagEvaluationResult]
