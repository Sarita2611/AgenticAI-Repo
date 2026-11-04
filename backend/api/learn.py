from fastapi import APIRouter

router = APIRouter(prefix="/learn", tags=["Learn"])

@router.get("/")
def get_topics():
    return {
        "status": "success",
        "topics": ["Python Basics", "FastAPI Setup", "APIRouter Modularity"]
    }

@router.get("/{topic_id}")
def get_topic_details(topic_id: int):
    return {
        "topic_id": topic_id,
        "detail": f"Details for module #{topic_id}"
    }