from typing import Any
from time import perf_counter

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from models import (
    ChatMessage,
    ChatQuestionCandidate,
    EvaluationChunk,
    EvaluationDashboard,
    EvaluationDataset,
    EvaluationDatasetCreate,
    EvaluationRun,
    EvaluationRunRequest,
    EvaluationRunResponse,
    EvaluationRunSummary,
    RagEvaluationResult,
)
from services.chat_service import (
    HR_SYSTEM_PROMPT,
    ChatServiceError,
    ChatServiceNotConfigured,
    answer_from_manual,
    format_docs,
    get_rag_chunks,
    get_rag_configuration,
)
from services.evaluation_service import (
    calculate_retrieval_metrics,
    judge_answer,
)

router = APIRouter(prefix="/evaluation", tags=["RAG Evaluation"])

MAX_RUN_HISTORY = 20
MAX_CHAT_QUESTIONS = 100


def _average(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


@router.get("/dashboard", response_model=EvaluationDashboard)
def get_dashboard(session: Session = Depends(get_session)):
    dataset = session.exec(select(EvaluationDataset)).all()
    runs = session.exec(
        select(EvaluationRun)
        .order_by(EvaluationRun.run_date.desc())
        .limit(MAX_RUN_HISTORY)
    ).all()
    run_ids = [run.run_id for run in runs if run.run_id is not None]
    results = (
        session.exec(
            select(RagEvaluationResult).where(
                RagEvaluationResult.run_id.in_(run_ids)
            )
        ).all()
        if run_ids
        else []
    )
    results_by_run: dict[int, list[RagEvaluationResult]] = {}
    for result in results:
        results_by_run.setdefault(result.run_id, []).append(result)

    summaries = []
    for run in runs:
        run_results = results_by_run.get(run.run_id, [])
        summaries.append(
            EvaluationRunSummary(
                run_id=run.run_id,
                model_name=run.model_name,
                embedding_model=run.embedding_model,
                prompt_version=run.prompt_version,
                chunk_size=run.chunk_size,
                top_k=run.top_k,
                dataset_version=run.dataset_version,
                run_date=run.run_date,
                result_count=len(run_results),
                precision=_average([row.precision for row in run_results]),
                recall=_average([row.recall for row in run_results]),
                mrr=_average([row.mrr for row in run_results]),
                faithfulness=_average([row.faithfulness for row in run_results]),
                answer_relevancy=_average(
                    [row.answer_relevancy for row in run_results]
                ),
            )
        )

    return EvaluationDashboard(
        dataset_count=len(dataset),
        dataset_versions=sorted({item.dataset_version for item in dataset}),
        runs=summaries,
    )


@router.get("/dataset", response_model=list[EvaluationDataset])
def get_evaluation_dataset(session: Session = Depends(get_session)):
    return session.exec(
        select(EvaluationDataset).order_by(EvaluationDataset.id.desc())
    ).all()


@router.post(
    "/dataset",
    response_model=EvaluationDataset,
    status_code=status.HTTP_201_CREATED,
)
def add_evaluation_question(
    payload: EvaluationDatasetCreate,
    session: Session = Depends(get_session),
):
    try:
        available_chunk_ids = {
            chunk.metadata.get("chunk_id") for chunk in get_rag_chunks()
        }
    except ChatServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    unknown_chunk_ids = set(payload.relevant_chunk_ids) - available_chunk_ids
    if unknown_chunk_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown HR policy chunk IDs: {', '.join(sorted(unknown_chunk_ids))}",
        )

    dataset_item = EvaluationDataset.model_validate(payload)
    dataset_item.relevant_chunk_ids = list(dict.fromkeys(payload.relevant_chunk_ids))
    session.add(dataset_item)
    session.commit()
    session.refresh(dataset_item)
    return dataset_item


@router.get("/chunks", response_model=list[EvaluationChunk])
def get_document_chunks():
    try:
        chunks = get_rag_chunks()
    except ChatServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    return [
        EvaluationChunk(
            chunk_id=chunk.metadata["chunk_id"],
            page_number=chunk.metadata.get("page", 0) + 1,
            preview=chunk.page_content[:180],
        )
        for chunk in chunks
    ]


@router.get("/chat-questions", response_model=list[ChatQuestionCandidate])
def get_chat_question_candidates(session: Session = Depends(get_session)):
    messages = session.exec(
        select(ChatMessage)
        .where(ChatMessage.role == "user")
        .order_by(ChatMessage.created_at.desc())
        .limit(MAX_CHAT_QUESTIONS)
    ).all()
    return [
        ChatQuestionCandidate(
            message_id=message.id,
            question=message.content,
            created_at=message.created_at,
        )
        for message in messages
    ]


@router.post("/runs", response_model=EvaluationRunResponse)
def create_evaluation_run(
    payload: EvaluationRunRequest,
    session: Session = Depends(get_session),
):
    dataset = session.exec(
        select(EvaluationDataset)
        .where(EvaluationDataset.dataset_version == payload.dataset_version)
        .order_by(EvaluationDataset.id.asc())
    ).all()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No evaluation questions found for dataset version {payload.dataset_version}.",
        )

    configuration = get_rag_configuration()
    pending_results: list[dict[str, Any]] = []
    try:
        for item in dataset:
            started_at = perf_counter()
            answer, documents = answer_from_manual(
                item.question,
                system_prompt=HR_SYSTEM_PROMPT,
            )
            retrieved_chunk_ids = [
                document.metadata.get("chunk_id")
                for document in documents
                if isinstance(document.metadata.get("chunk_id"), str)
            ]
            if len(retrieved_chunk_ids) != len(documents):
                raise ChatServiceError(
                    "Retrieved policy chunks are missing their stable IDs."
                )

            precision, recall, mrr = calculate_retrieval_metrics(
                retrieved_chunk_ids,
                item.relevant_chunk_ids,
            )
            retrieved_context = [
                {
                    "chunk_id": document.metadata["chunk_id"],
                    "page_number": document.metadata.get("page", 0) + 1,
                    "content": document.page_content,
                }
                for document in documents
            ]
            context_text = format_docs(documents)
            judged_scores = judge_answer(
                question=item.question,
                expected_answer=item.expected_answer,
                actual_answer=answer,
                retrieved_context=context_text,
            )
            pending_results.append(
                {
                    "question_id": item.id,
                    "actual_answer": answer,
                    "retrieved_context": retrieved_context,
                    "precision": precision,
                    "recall": recall,
                    "mrr": mrr,
                    "faithfulness": judged_scores.faithfulness,
                    "answer_relevancy": judged_scores.answer_relevancy,
                    "execution_time": perf_counter() - started_at,
                }
            )
    except ChatServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
    except ChatServiceNotConfigured as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    run = EvaluationRun(
        model_name=configuration["model_name"],
        embedding_model=configuration["embedding_model"],
        prompt_version=configuration["prompt_version"],
        chunk_size=configuration["chunk_size"],
        top_k=configuration["top_k"],
        dataset_version=payload.dataset_version,
    )
    session.add(run)
    session.flush()
    if run.run_id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create the evaluation run.",
        )

    result_rows = [
        RagEvaluationResult(run_id=run.run_id, **result)
        for result in pending_results
    ]
    session.add_all(result_rows)
    session.commit()
    session.refresh(run)
    saved_results = session.exec(
        select(RagEvaluationResult)
        .where(RagEvaluationResult.run_id == run.run_id)
        .order_by(RagEvaluationResult.id.asc())
    ).all()
    return EvaluationRunResponse(run=run, results=saved_results)


@router.get("/runs/{run_id}", response_model=EvaluationRunResponse)
def get_evaluation_run(run_id: int, session: Session = Depends(get_session)):
    run = session.get(EvaluationRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found.")
    results = session.exec(
        select(RagEvaluationResult)
        .where(RagEvaluationResult.run_id == run_id)
        .order_by(RagEvaluationResult.id.asc())
    ).all()
    return EvaluationRunResponse(run=run, results=results)
