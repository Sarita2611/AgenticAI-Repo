# FastAPI + SQLModel + Docker PostgreSQL CRUD Guide

A complete, self-contained reference for running PostgreSQL in Docker, configuring SQLModel, wiring FastAPI lifespan events, and writing clean CRUD endpoints.

---

## Directory Structure

```text
.
├── docker-compose.yml
├── requirements.txt
├── .gitignore
├── database.py
├── models.py
├── main.py
└── routers/
    ├── heroes.py
    └── users.py
```

## Dependencies & Setup

```bash
pip install "fastapi[standard]" uvicorn sqlmodel "psycopg[binary]"
pip freeze > requirements.txt
```
## Process

### 1. Docker Compose (docker-compose.yml)

Create docker-compose.yml in your root folder:

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    container_name: pn_learn_postgres
    restart: always
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: pn_learn
    ports:
      - "4134:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```
Start the database container:

```bash
docker compose up -d
```

### 2. Models & Schemas (models.py)
Separate database tables from request schemas to prevent client ID injection and enable clean partial updates:
```python
from typing import Optional
from sqlmodel import Field, SQLModel

# ==========================================
# HERO SCHEMAS & TABLE
# ==========================================

class HeroBase(SQLModel):
    name: str
    secret_name: str
    age: Optional[int] = None

class Hero(HeroBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

class HeroCreate(HeroBase):
    pass

class HeroUpdate(SQLModel):
    name: Optional[str] = None
    secret_name: Optional[str] = None
    age: Optional[int] = None


# ==========================================
# USER SCHEMAS & TABLE
# ==========================================

class UserBase(SQLModel):
    username: str
    nickname: Optional[str] = None

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

class UserCreate(UserBase):
    pass

class UserUpdate(SQLModel):
    username: Optional[str] = None
    nickname: Optional[str] = None
```

### 3. Database Connection (database.py)

Import models here so SQLModel.metadata registers the tables before create_all() executes:

```python
from typing import Generator
from sqlmodel import SQLModel, Session, create_engine
import models  # Important: registers models in SQLModel.metadata

POSTGRES_URL = "postgresql+psycopg://user:password@localhost:4134/pn_learn"

engine = create_engine(POSTGRES_URL, echo=True)

def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
```

### 4. CRUD Routers
> routers/heroes.py

```python
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select
from database import get_session
from models import Hero, HeroCreate, HeroUpdate

router = APIRouter(prefix="/heroes", tags=["Heroes"])

# CREATE
@router.post("/", response_model=Hero, status_code=status.HTTP_201_CREATED)
def create_hero(hero_in: HeroCreate, session: Session = Depends(get_session)):
    hero_db = Hero.model_validate(hero_in)
    session.add(hero_db)
    session.commit()
    session.refresh(hero_db)
    return hero_db

# READ ALL
@router.get("/", response_model=List[Hero])
def get_all_heroes(session: Session = Depends(get_session)):
    return session.exec(select(Hero)).all()

# READ ONE
@router.get("/{hero_id}", response_model=Hero)
def get_hero(hero_id: int, session: Session = Depends(get_session)):
    hero_db = session.get(Hero, hero_id)
    if not hero_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hero not found")
    return hero_db

# UPDATE
@router.put("/{hero_id}", response_model=Hero)
def update_hero(hero_id: int, hero_in: HeroUpdate, session: Session = Depends(get_session)):
    hero_db = session.get(Hero, hero_id)
    if not hero_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hero not found")

    update_data = hero_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(hero_db, field, value)

    session.add(hero_db)
    session.commit()
    session.refresh(hero_db)
    return hero_db

# DELETE
@router.delete("/{hero_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hero(hero_id: int, session: Session = Depends(get_session)):
    hero_db = session.get(Hero, hero_id)
    if not hero_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hero not found")
    session.delete(hero_db)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```


> routers/users.py
```python
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select
from database import get_session
from models import User, UserCreate, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

# CREATE
@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate, session: Session = Depends(get_session)):
    user_db = User.model_validate(user_in)
    session.add(user_db)
    session.commit()
    session.refresh(user_db)
    return user_db

# READ ALL
@router.get("/", response_model=List[User])
def get_all_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()

# READ ONE
@router.get("/{user_id}", response_model=User)
def get_user(user_id: int, session: Session = Depends(get_session)):
    user_db = session.get(User, user_id)
    if not user_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user_db

# UPDATE
@router.put("/{user_id}", response_model=User)
def update_user(user_id: int, user_in: UserUpdate, session: Session = Depends(get_session)):
    user_db = session.get(User, user_id)
    if not user_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user_db, field, value)

    session.add(user_db)
    session.commit()
    session.refresh(user_db)
    return user_db

# DELETE
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, session: Session = Depends(get_session)):
    user_db = session.get(User, user_id)
    if not user_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    session.delete(user_db)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
``` 

### 5. Main Application (main.py)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from database import create_db_and_tables
from routers import heroes, users
import greet
import learn

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(title="FastAPI + SQLModel App", lifespan=lifespan)

# Standard routers
app.include_router(greet.router)
app.include_router(learn.router)

# Database CRUD routers
app.include_router(heroes.router)
app.include_router(users.router)

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Service is healthy"}
```

### 6. Run and Test
Start the application

```bash
uvicorn main:app --reload
```
## Bonus: 
#### Interactive API Documentation @ http://127.0.0.1:8000/docs

### TablePlus Connection Settings:

```text
- Host: 127.0.0.1
- Port: 4134
- User: user
- Password: password
- Database: pn_learn
- SSL Mode: disable
```

#### Quick cURL Test Commands

```bash
# Create Hero
curl -X POST [http://127.0.0.1:8000/heroes/](http://127.0.0.1:8000/heroes/) \
  -H "Content-Type: application/json" \
  -d '{"name": "Iron Man", "secret_name": "Tony Stark", "age": 48}'

# Read All Heroes
curl -X GET [http://127.0.0.1:8000/heroes/](http://127.0.0.1:8000/heroes/)

# Update Hero
curl -X PUT [http://127.0.0.1:8000/heroes/1](http://127.0.0.1:8000/heroes/1) \
  -H "Content-Type: application/json" \
  -d '{"age": 49}'

# Delete Hero
curl -X DELETE [http://127.0.0.1:8000/heroes/1](http://127.0.0.1:8000/heroes/1)
```