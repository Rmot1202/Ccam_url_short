from datetime import datetime, timezone
from sqlalchemy.orm import Session
from . import models, schemas
from .auth import hash_password, verify_password
from .redis_client import r
import secrets
import string

def _generate_short_code(length: int = 6) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))

def create_user(db: Session, payload: schemas.UserCreate):
    existing = (
        db.query(models.User)
        .filter((models.User.email == payload.email) | (models.User.user_name == payload.user_name))
        .first()
    )
    if existing:
        return None

    user = models.User(
        user_name=payload.user_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user

def create_link(db: Session, user_name: str, payload: schemas.LinkCreate):
    short_code = payload.custom_alias.strip() if payload.custom_alias else _generate_short_code()

    if db.query(models.Link).filter(models.Link.short_code == short_code).first():
        raise ValueError("Custom alias already exists")

    expires_at = payload.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    link = models.Link(
        short_code=short_code,
        user_name=user_name,
        original_url=payload.original_url,
        custom_alias=payload.custom_alias,
        is_active=True,
        expires_at=expires_at,
        click_count=0,
    )

    db.add(link)
    db.commit()
    db.refresh(link)

    if expires_at:
        ttl_seconds = int((expires_at - datetime.now(timezone.utc)).total_seconds())
        if ttl_seconds > 0:
            r.set(short_code, payload.original_url, ex=ttl_seconds)

    return link

def get_all_links(db: Session, user_name: str):
    return db.query(models.Link).filter(models.Link.user_name == user_name).order_by(models.Link.created_at.desc()).all()

def get_link_by_code(db: Session, short_code: str):
    return db.query(models.Link).filter(models.Link.short_code == short_code).first()

def increment_click(db: Session, link: models.Link):
    link.click_count += 1
    db.commit()
    db.refresh(link)
    return link

def delete_link(db: Session, short_code: str):
    link = get_link_by_code(db, short_code)
    if not link:
        return False
    r.delete(short_code)
    db.delete(link)
    db.commit()
    return True