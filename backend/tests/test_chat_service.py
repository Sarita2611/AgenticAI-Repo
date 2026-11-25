from pathlib import Path

from langchain_core.documents import Document
from langchain_core.runnables import RunnableLambda

from services import chat_service


def test_resolve_document_path_accepts_file_uri(tmp_path: Path):
    document = tmp_path / "HR Policy Manual 2023.pdf"
    document.touch()

    assert chat_service._resolve_document_path(document.as_uri()) == document


def test_generate_reply_passes_latest_question_and_history(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    received = {}

    class FakeRetriever:
        def invoke(self, question):
            return [
                Document(page_content="Policy answer", metadata={"page": 1}),
                Document(page_content="More policy", metadata={"page": 4}),
            ]

    class FakeChain:
        def invoke(self, inputs):
            received.update(inputs)
            return "The policy answer."

    monkeypatch.setattr(
        chat_service,
        "_get_rag_chain",
        lambda: (FakeRetriever(), FakeChain()),
    )

    reply = chat_service.generate_reply(
        [
            {"role": "system", "content": "HR system instructions"},
            {"role": "user", "content": "Earlier question"},
            {"role": "assistant", "content": "Earlier answer"},
            {"role": "user", "content": "Current question"},
        ]
    )

    assert reply == (
        "The policy answer.\n\n"
        "Source: HR Policy Manual 2023.pdf (pages: 2, 5)"
    )
    assert received == {
        "question": "Current question",
        "history": "user: Earlier question\nassistant: Earlier answer",
        "system_prompt": "HR system instructions",
        "context": "Page 2:\nPolicy answer\n\nPage 5:\nMore policy",
    }


def test_generate_reply_refuses_when_no_document_pages_are_retrieved(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    class FakeRetriever:
        def invoke(self, question):
            return []

    class FakeChain:
        def invoke(self, inputs):
            raise AssertionError("The LLM must not be called without retrieved pages.")

    monkeypatch.setattr(
        chat_service,
        "_get_rag_chain",
        lambda: (FakeRetriever(), FakeChain()),
    )

    reply = chat_service.generate_reply(
        [{"role": "user", "content": "What is the policy?"}]
    )

    assert reply == (
        f"{chat_service.REFUSAL_RESPONSE}\n\n{chat_service.WEB_SEARCH_OFFER}"
    )


def test_yes_confirmation_searches_the_question_that_was_refused(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    searched = []
    monkeypatch.setattr(
        chat_service,
        "_search_web",
        lambda question: searched.append(question) or "General web answer.",
    )

    reply = chat_service.generate_reply(
        [
            {"role": "system", "content": "HR system instructions"},
            {"role": "user", "content": "What is the general notice period?"},
            {
                "role": "assistant",
                "content": (
                    f"{chat_service.REFUSAL_RESPONSE}\n\n"
                    f"{chat_service.WEB_SEARCH_OFFER}"
                ),
            },
            {"role": "user", "content": "Yes"},
        ]
    )

    assert reply == "General web answer."
    assert searched == ["What is the general notice period?"]


def test_no_confirmation_does_not_search_or_require_api_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(
        chat_service,
        "_search_web",
        lambda question: (_ for _ in ()).throw(
            AssertionError("Search should not run after No.")
        ),
    )

    reply = chat_service.generate_reply(
        [
            {"role": "user", "content": "What is the general notice period?"},
            {
                "role": "assistant",
                "content": (
                    f"{chat_service.REFUSAL_RESPONSE}\n\n"
                    f"{chat_service.WEB_SEARCH_OFFER}"
                ),
            },
            {"role": "user", "content": "No"},
        ]
    )

    assert reply == "Understood. I won't search the web."


def test_web_search_summarizes_and_lists_only_http_sources(monkeypatch):
    captured_prompt = {}

    class FakeDDGS:
        def __enter__(self):
            return self

        def __exit__(self, exception_type, exception, traceback):
            return False

        def text(self, query, max_results):
            assert query == "employee notice period"
            assert max_results == 5
            return [
                {
                    "title": "Employment guide",
                    "body": "General guidance on notice periods.",
                    "href": "https://example.com/guide",
                },
                {
                    "title": "Invalid result",
                    "body": "Do not include this URL.",
                    "href": "javascript:alert(1)",
                },
            ]

    def fake_llm(prompt):
        captured_prompt["text"] = prompt.to_string()
        return "General web information: notice periods vary."

    monkeypatch.setattr(chat_service, "DDGS", FakeDDGS)
    monkeypatch.setattr(
        chat_service,
        "ChatOpenAI",
        lambda **kwargs: RunnableLambda(fake_llm),
    )

    reply = chat_service._search_web("employee notice period")

    assert reply.endswith(
        "Web search sources:\n- Employment guide: https://example.com/guide"
    )
    assert "General guidance on notice periods." in captured_prompt["text"]
    assert "javascript:alert(1)" not in reply


def test_rag_chain_uses_retrieved_document_context(monkeypatch, tmp_path: Path):
    document = tmp_path / "policy.pdf"
    document.touch()
    captured_prompt = {}

    class FakeLoader:
        def __init__(self, path):
            assert path == str(document)

        def load(self):
            return [
                Document(
                    page_content="Annual leave allowance is 20 days.",
                    metadata={"page": 6},
                )
            ]

    class FakeVectorStore:
        def as_retriever(self):
            return RunnableLambda(
                lambda question: [
                    Document(
                        page_content="Annual leave allowance is 20 days.",
                        metadata={"page": 6},
                    )
                ]
            )

    class FakeChroma:
        @staticmethod
        def from_documents(documents, embedding):
            assert documents
            return FakeVectorStore()

    def fake_llm(prompt):
        captured_prompt["text"] = prompt.to_string()
        return "The policy answer."

    monkeypatch.setenv("RAG_DOCUMENT_PATH", str(document))
    monkeypatch.setattr(chat_service, "PyPDFLoader", FakeLoader)
    monkeypatch.setattr(chat_service, "Chroma", FakeChroma)
    monkeypatch.setattr(chat_service, "OpenAIEmbeddings", lambda: object())
    monkeypatch.setattr(
        chat_service,
        "ChatOpenAI",
        lambda **kwargs: RunnableLambda(fake_llm),
    )
    chat_service._get_rag_chain.cache_clear()

    try:
        retriever, answer_chain = chat_service._get_rag_chain()
        documents = retriever.invoke("How much annual leave is available?")
        reply = answer_chain.invoke(
            {
                "question": "How much annual leave is available?",
                "history": "",
                "system_prompt": "You are an HR assistant.",
                "context": chat_service.format_docs(documents),
            }
        )
    finally:
        chat_service._get_rag_chain.cache_clear()

    assert reply == "The policy answer."
    assert "Page 7:\nAnnual leave allowance is 20 days." in captured_prompt["text"]
    assert "Do not use outside knowledge" in " ".join(
        captured_prompt["text"].split()
    )
    assert chat_service.REFUSAL_RESPONSE in captured_prompt["text"]
