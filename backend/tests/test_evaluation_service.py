import pytest
from sqlmodel import SQLModel, Session, create_engine

from models import EvaluationDataset, EvaluationRun, RagEvaluationResult
from services.evaluation_service import calculate_retrieval_metrics


def test_retrieval_metrics_use_relevant_labels_and_rank():
    precision, recall, mrr = calculate_retrieval_metrics(
        ["chunk-a", "chunk-x", "chunk-b"],
        ["chunk-a", "chunk-b", "chunk-c"],
    )

    assert precision == pytest.approx(2 / 3)
    assert recall == pytest.approx(2 / 3)
    assert mrr == pytest.approx(1.0)


def test_retrieval_metrics_deduplicate_retrieved_chunks():
    precision, recall, mrr = calculate_retrieval_metrics(
        ["chunk-x", "chunk-a", "chunk-a"],
        ["chunk-a"],
    )

    assert precision == pytest.approx(1 / 2)
    assert recall == pytest.approx(1.0)
    assert mrr == pytest.approx(1 / 2)


def test_retrieval_metrics_requires_relevant_chunk_labels():
    with pytest.raises(ValueError, match="At least one relevant chunk ID"):
        calculate_retrieval_metrics(["chunk-a"], [])


def test_evaluation_tables_create_and_store_json_fields():
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        dataset_item = EvaluationDataset(
            question="How do I request leave?",
            expected_answer="Submit a leave request.",
            relevant_chunk_ids=["chunk-a"],
        )
        run = EvaluationRun(
            model_name="test-model",
            embedding_model="test-embedding",
            prompt_version="test-prompt",
            chunk_size=1000,
            top_k=4,
            dataset_version="v1",
        )
        session.add(dataset_item)
        session.add(run)
        session.flush()
        result = RagEvaluationResult(
            run_id=run.run_id,
            question_id=dataset_item.id,
            actual_answer="Submit a leave request.",
            retrieved_context=[
                {"chunk_id": "chunk-a", "page_number": 2, "content": "Policy text"}
            ],
            precision=1,
            recall=1,
            mrr=1,
            faithfulness=1,
            answer_relevancy=1,
            execution_time=0.25,
        )
        session.add(result)
        session.commit()
        session.refresh(result)

        assert result.retrieved_context[0]["page_number"] == 2
        assert dataset_item.relevant_chunk_ids == ["chunk-a"]
