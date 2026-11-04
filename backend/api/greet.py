from fastapi import APIRouter

router = APIRouter(prefix="/greet", tags=["Greet"])

@router.get("/")
def get_greeting():
    return {"message": "Hello from greet endpoint!"}

@router.get("/{name}")
def greet_person(name: str):
    return {"message": f"Hello, {name}! Welcome aboard."}