from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from models import User, UserCreate, UserLogin, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, session: Session = Depends(get_session)):
    existing_user = session.exec(
        select(User).where(User.username == user_data.username)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already registered",
        )

    user = User.model_validate(user_data)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/login", response_model=User)
def login(user_data: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(
        select(User).where(User.username == user_data.username)
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found for that username. Create an account first.",
        )
    return user


@router.get("/", response_model=List[User])
def get_all_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()


@router.get("/{user_id}", response_model=User)
def get_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=User)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for key, value in user_data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    session.delete(user)
    session.commit()
    return None
