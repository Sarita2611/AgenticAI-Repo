# Architecture

## Components

- `backend/app/main.py` creates the FastAPI application, configures CORS, and
  initializes SQLModel tables when the API starts.
- `backend/api/` contains the HTTP routes for users, chat, heroes, greetings,
  learning topics, and RAG evaluation.
- `backend/models/schemas.py` defines SQLModel database tables and API schemas,
  including evaluation datasets, runs, and per-question results.
- `backend/app/database.py` creates the SQLAlchemy engine and request-scoped
  database sessions from `DATABASE_URL`.
- `backend/services/chat_service.py` loads the HR policy PDF, splits and embeds
  it in an in-memory Chroma vector store, retrieves
  relevant context for chat questions, includes source page numbers with
  supported answers, and converts configuration or provider failures into
  explicit service errors.
- `frontend/customer-chatbot-hr-portal/` is the responsive React chatbot UI.
- `frontend/admin-panel/` is a username-gated demo console for user/hero CRUD,
  RAG evaluation, chat history, and direct Swagger access.

The API is the shared boundary for the frontends. The customer portal uses
username-only demo login; the admin starter has no authentication or
authorization and is not suitable for production.

## Request flows

1. The customer portal posts to `/users/` to create a demo user or
   `/users/login` to look one up.
2. The portal loads `/chat/history/{user_id}` and sends messages to `/chat/`.
3. The chat API checks the user, retrieves recent history, calls the chat
   service, and stores both sides of the exchange. On the first chat request,
   the service loads `HR Policy Manual 2023.pdf` and builds its in-memory
   vector store; the store is recreated after a backend restart.
   If the retrieved manual context cannot answer, the service asks permission
   before performing a general web search and summarizing its results.
4. The admin console calls the user and hero CRUD endpoints and reads
   `/chat/history/{user_id}`. Its evaluation dashboard supports labeled
   dataset creation, run comparisons, and per-question retrieved-context
   inspection. Retrieval scores use relevant chunk IDs; answer scores are
   produced by an LLM judge. Swagger at `/docs` remains available for trying
   any other API operation.

## Configuration and runtime

Copy `backend/.env.example` to `backend/.env`, configure the database URL, and
set `OPENAI_API_KEY` to enable assistant replies. PostgreSQL is supplied by the
root `docker-compose.yml`; it exposes port `4134` on the host. The Vite
development servers use ports `5173` (customer) and `5174` (admin), both allowed
by the API's CORS configuration. The RAG service looks for
`HR Policy Manual 2023.pdf` on the current user's Desktop by default; set
`RAG_DOCUMENT_PATH` to override the file location. Docker Compose mounts this
Desktop file at `/app/data/HR Policy Manual 2023.pdf` and sets the container
path automatically.
