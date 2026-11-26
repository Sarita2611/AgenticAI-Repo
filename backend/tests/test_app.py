from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_reports_api_and_customer_portal():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["frontend"] == "http://localhost:5173"


def test_greeting_routes_are_registered():
    response = client.get("/greet/Developer")

    assert response.status_code == 200
    assert response.json()["message"] == "Hello, Developer! Welcome aboard."


def test_chat_and_user_routes_are_documented():
    schema = client.get("/openapi.json").json()

    assert "/users/login" in schema["paths"]
    assert "/chat/" in schema["paths"]
    assert "/chat/history/{user_id}" in schema["paths"]
    assert "/evaluation/dashboard" in schema["paths"]
    assert "/evaluation/dataset" in schema["paths"]
    assert "/evaluation/runs" in schema["paths"]


def test_admin_development_origin_is_allowed():
    response = client.options(
        "/users/",
        headers={
            "Origin": "http://127.0.0.1:5174",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5174"
