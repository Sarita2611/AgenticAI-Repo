from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import chat, greet, heroes, learn, users
from app.database import create_db_and_tables
from models import schemas as _schemas


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title="HR Assistant API",
    description=(
        "Backend for the HR chatbot customer portal and admin console. "
        "Username-only login is for demonstration and is not secure authentication."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(greet.router)
app.include_router(learn.router)
app.include_router(heroes.router)
app.include_router(users.router)
app.include_router(chat.router)


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Server is running smoothly",
        "frontend": "http://localhost:5173",
        "swagger": "/docs",
    }
