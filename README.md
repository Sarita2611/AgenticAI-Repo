# HR Assistant

A modular FastAPI backend and React chatbot UI for a demo HR assistant.

## Project structure

```text
backend/
  app/                 FastAPI application and database setup
  api/                 HTTP routers
  models/              SQLModel tables and request/response schemas
  services/            Chat completion integration
  tests/               Backend tests
  requirements.txt
  .env.example
frontend/
  admin-panel/         Username-gated demo admin service console
  customer-chatbot-hr-portal/  Existing HR chatbot UI
docs/
  architecture.md
  api-documentation.md
```

The separate `mobile-web` app is intentionally omitted; the customer portal
already adapts to mobile-sized screens.

## Requirements

- Python 3.10+
- Node.js 18+
- PostgreSQL (or Docker Compose)
- An OpenAI API key to receive chatbot replies

## Run locally

1. Start PostgreSQL from the repository root:

   ```powershell
   docker compose up -d db
   ```

2. Configure and run the backend:

   ```powershell
   cd backend
   if (!(Test-Path .env)) { Copy-Item .env.example .env }
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

   Set `OPENAI_API_KEY` in `backend/.env` to enable assistant replies. The API
   and interactive docs are at `http://127.0.0.1:8000` and
   `http://127.0.0.1:8000/docs`.

3. In a second terminal, run the customer portal:

   ```powershell
   cd frontend/customer-chatbot-hr-portal
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. On the **Sign in** tab, enter `admin` to open
   the admin console on port 5174. This is a demo-only username redirect, not
   admin authentication.

4. Optionally run the admin console in another terminal:

   ```powershell
   cd frontend/admin-panel
   npm install
   npm run dev
   ```

   Open `http://localhost:5174`. Sign in with an admin display username to
   manage users and heroes, read chat history, and open Swagger at
   `http://127.0.0.1:8000/docs`. This username screen is a demo gate
   only—not authentication or authorization.

The customer portal and admin console use separate ports: **5173** and **5174**.
Both services must be running to use their respective pages.

## Run everything with Docker

From the repository root, build and start the database, API (including
Swagger), customer portal, and admin console together:

```powershell
docker compose up --build -d
```

Open the customer portal at `http://localhost:5173`. Enter `admin` on its
**Sign in** tab to open the admin console at `http://localhost:5174`.
Swagger is available at `http://localhost:8000/docs`. Docker Compose keeps
PostgreSQL internal to the stack and also publishes it on port 4134 for local
development. If the default database or API port is already in use, set
`DB_PORT` or `API_PORT` before starting Compose, for example
`$env:DB_PORT = "4135"; $env:API_PORT = "8001"`.

The backend reads `OPENAI_API_KEY` from `backend/.env` when that file exists.
Chat replies require a valid key; the portal, admin console, and Swagger can
still start without one.

## Tests and builds

```powershell
cd backend
python -m pytest
cd ..\frontend\customer-chatbot-hr-portal
npm run build
cd ..\admin-panel
npm run build
```

See [architecture](docs/architecture.md) and [API documentation](docs/api-documentation.md).
