from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from app.database import get_session
from models import Hero, HeroCreate, HeroUpdate

router = APIRouter(prefix="/heroes", tags=["Heroes"])


@router.post("/", response_model=Hero, status_code=status.HTTP_201_CREATED)
def create_hero(hero_in: HeroCreate, session: Session = Depends(get_session)):
    hero = Hero.model_validate(hero_in)
    session.add(hero)
    session.commit()
    session.refresh(hero)
    return hero


@router.get("/", response_model=List[Hero])
def get_all_heroes(session: Session = Depends(get_session)):
    return session.exec(select(Hero)).all()


@router.get("/{hero_id}", response_model=Hero)
def get_hero(hero_id: int, session: Session = Depends(get_session)):
    hero = session.get(Hero, hero_id)
    if not hero:
        raise HTTPException(status_code=404, detail="Hero not found")
    return hero


@router.put("/{hero_id}", response_model=Hero)
def update_hero(
    hero_id: int,
    hero_in: HeroUpdate,
    session: Session = Depends(get_session),
):
    hero = session.get(Hero, hero_id)
    if not hero:
        raise HTTPException(status_code=404, detail="Hero not found")

    for field, value in hero_in.model_dump(exclude_unset=True).items():
        setattr(hero, field, value)
    session.add(hero)
    session.commit()
    session.refresh(hero)
    return hero


@router.delete("/{hero_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hero(hero_id: int, session: Session = Depends(get_session)):
    hero = session.get(Hero, hero_id)
    if not hero:
        raise HTTPException(status_code=404, detail="Hero not found")
    session.delete(hero)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
