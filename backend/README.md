# HR Assistant API

## Setup

From the repository root, start PostgreSQL with `docker compose up -d db`.
Then from this directory, create `.env` from the example if needed, set
`OPENAI_API_KEY`, create a virtual environment, install requirements, and start
the app:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The database URL defaults to the Compose service on `localhost:4134`. The API
documentation is at `http://127.0.0.1:8000/docs`.

The chat service uses retrieval-augmented generation (RAG) over
`HR Policy Manual 2023.pdf`. By default it expects this file on the current
user's Desktop; set `RAG_DOCUMENT_PATH` to a local path or `file:///` URI to
override it. On its first chat request, the service splits and embeds the PDF
content and creates an in-memory Chroma vector store, which is rebuilt after
each backend restart. Docker Compose mounts the Desktop PDF into the container
and configures `RAG_DOCUMENT_PATH` automatically.
If the manual has no answer, the assistant offers a yes/no web search. It only
searches after the user confirms; web answers are labeled as general
information and include their source URLs.

The customer portal runs at `http://localhost:5173`; the admin console runs
separately at `http://localhost:5174`.

The chatbot endpoints require a configured OpenAI API key. The demo user
endpoints do not implement authentication.

Run backend tests with `python -m pytest`.
