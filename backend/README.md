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

The customer portal runs at `http://localhost:5173`; the admin console runs
separately at `http://localhost:5174`.

The chatbot endpoints require a configured OpenAI API key. The demo user
endpoints do not implement authentication.

Run backend tests with `python -m pytest`.
