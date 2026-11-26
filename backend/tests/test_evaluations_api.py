from collections.abc import Generator

from fastapi.testclient import TestClient
from langchain_core.documents import Document
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool

from api import evaluations
from app.database import get_session
from app.main import app


def test_dataset_api_validates_chunks_and_dashboard(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    def get_test_session() -> Generator[Session, None, None]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_test_session
    monkeypatch.setattr(
        evaluations,
        "get_rag_chunks",
        lambda: [
            Document(
                page_content="Annual leave policy",
                metadata={"page": 2, "chunk_id": "hr-policy-p3-test"},
            )
        ],
    )

    try:
        client = TestClient(app)
        created = client.post(
            "/evaluation/dataset",
            json={
                "question": "How much leave is available?",
                "expected_answer": "See the leave policy.",
                "relevant_chunk_ids": ["hr-policy-p3-test"],
            },
        )

        assert created.status_code == 201
        assert created.json()["relevant_chunk_ids"] == ["hr-policy-p3-test"]

        unknown_chunk = client.post(
            "/evaluation/dataset",
            json={
                "question": "Unknown chunk test",
                "expected_answer": "Not applicable.",
                "relevant_chunk_ids": ["not-a-policy-chunk"],
            },
        )
        assert unknown_chunk.status_code == 422

        dashboard = client.get("/evaluation/dashboard")
        assert dashboard.status_code == 200
        assert dashboard.json() == {
            "dataset_count": 1,
            "dataset_versions": ["v1"],
            "runs": [],
        }
    finally:
        app.dependency_overrides.pop(get_session, None)
        engine.dispose()
