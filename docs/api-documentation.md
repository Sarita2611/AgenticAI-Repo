# API documentation

Base URL: `http://127.0.0.1:8000`

Interactive OpenAPI documentation is available at `/docs`; the generated
schema is available at `/openapi.json`.

## Chat and users

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/users/` | Create a username-only demo user |
| `POST` | `/users/login` | Look up a demo user by username |
| `GET` | `/users/` | List users (used by the admin starter) |
| `GET` | `/users/{user_id}` | Get a user |
| `PATCH` | `/users/{user_id}` | Update a user's username or nickname |
| `DELETE` | `/users/{user_id}` | Delete a user |
| `POST` | `/chat/` | Submit a message and receive an HR assistant reply |
| `GET` | `/chat/history/{user_id}` | Get a user's saved conversation |

Example chat request:

```json
{
  "user_id": 1,
  "message": "How do I request time off?"
}
```

The response contains `reply` and `message_id`. Chat requests return `503` if
`OPENAI_API_KEY` is not configured and `502` if document retrieval, embedding,
or the model request fails. RAG uses `HR Policy Manual 2023.pdf`, found on the
current user's Desktop by default; override this with `RAG_DOCUMENT_PATH`, a
local filesystem path or `file:///` URI. Replies are grounded only in the
manual; if no supporting information is retrieved, the assistant explicitly
says the manual does not provide it and offers an optional web search. Web
search runs only after user confirmation; its answer is labeled as general
information and includes source URLs. Manual-supported answers include their
source page numbers, displayed in small text in the customer chat.

## RAG evaluation (admin)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/evaluation/dashboard` | Dataset counts and aggregate metrics for recent runs |
| `GET`, `POST` | `/evaluation/dataset` | List or add labeled evaluation questions |
| `GET` | `/evaluation/chunks` | List stable chunk IDs, PDF page numbers, and previews for labeling |
| `GET` | `/evaluation/chat-questions` | List recent user questions as optional dataset seeds |
| `POST` | `/evaluation/runs` | Evaluate a dataset version and persist run/results |
| `GET` | `/evaluation/runs/{run_id}` | Get a run and its per-question results |

Each dataset entry requires a question, expected answer, category, dataset
version, and at least one relevant PDF chunk ID. Chat history only seeds the
question; an administrator must supply and verify the reference answer and
relevant chunks.

Precision is the fraction of unique retrieved chunks labeled relevant; recall
is the fraction of labeled relevant chunks retrieved; MRR is the reciprocal
rank of the first relevant retrieved chunk. Faithfulness and answer relevancy
are scored from 0 to 1 by an LLM judge, so they are model-based estimates rather
than human-verified measurements. Run records save model, embedding, prompt,
chunk size, top-k, and dataset version for comparison. Each dataset question
requires answer generation and a judge call, which may incur OpenAI API costs.

## Existing learning and CRUD examples

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | API status |
| `GET` | `/greet/` | Default greeting |
| `GET` | `/greet/{name}` | Personalized greeting |
| `GET` | `/learn/` | List learning topics |
| `GET` | `/learn/{topic_id}` | Get a topic detail |
| `GET`, `POST` | `/heroes/` | List or create heroes |
| `GET`, `PUT`, `DELETE` | `/heroes/{hero_id}` | Read, update, or delete a hero |

The demo user endpoints and admin starter do not implement authentication.
Restrict access before deploying this API beyond a trusted development
environment.
