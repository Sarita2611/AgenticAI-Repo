# Architecture

## Components

- `backend/app/main.py` creates the FastAPI application, configures CORS, and
  initializes SQLModel tables when the API starts.
- `backend/api/` contains the HTTP routes for users, chat, heroes, greetings,
  and learning topics.
- `backend/models/schemas.py` defines SQLModel database tables and API schemas.
- `backend/app/database.py` creates the SQLAlchemy engine and request-scoped
  database sessions from `DATABASE_URL`.
- `backend/services/chat_service.py` calls OpenAI and converts configuration or
  provider failures into explicit service errors.
- `frontend/customer-chatbot-hr-portal/` is the responsive React chatbot UI.
- `frontend/admin-panel/` is a username-gated demo console for user/hero CRUD,
  chat history, and direct Swagger access.

The API is the shared boundary for the frontends. The customer portal uses
username-only demo login; the admin starter has no authentication or
authorization and is not suitable for production.

## Request flows

1. The customer portal posts to `/users/` to create a demo user or
   `/users/login` to look one up.
2. The portal loads `/chat/history/{user_id}` and sends messages to `/chat/`.
3. The chat API checks the user, retrieves recent history, calls the chat
   service, and stores both sides of the exchange.
4. The admin console calls the user and hero CRUD endpoints and reads
   `/chat/history/{user_id}`. Swagger at `/docs` remains available for trying
   any other API operation.

## Configuration and runtime

Copy `backend/.env.example` to `backend/.env`, configure the database URL, and
set `OPENAI_API_KEY` to enable assistant replies. PostgreSQL is supplied by the
root `docker-compose.yml`; it exposes port `4134` on the host. The Vite
development servers use ports `5173` (customer) and `5174` (admin), both allowed
by the API's CORS configuration.
