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
`OPENAI_API_KEY` is not configured and `502` if the provider request fails.

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
