from sqlalchemy.orm import Session

from . import models
from .auth import hash_password, verify_password


def create_user(db: Session, payload):
    """Persist a user account if the email and username are available."""
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


def create_link(
    db: Session,
    user_name: str,
    short_code: str,
    original_url: str,
    custom_alias: str | None,
    expires_at,
):
    """Create a short-link row. Business rules live in services.py."""
    link = models.Link(
        short_code=short_code,
        user_name=user_name,
        original_url=original_url,
        custom_alias=custom_alias,
        is_active=True,
        expires_at=expires_at,
        click_count=0,
    )

    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def get_all_links(db: Session, user_name: str):
    return (
        db.query(models.Link)
        .filter(models.Link.user_name == user_name)
        .order_by(models.Link.created_at.desc())
        .all()
    )


def get_link_by_code(db: Session, short_code: str):
    return db.query(models.Link).filter(models.Link.short_code == short_code).first()


def increment_click(db: Session, link: models.Link):
    link.click_count += 1
    db.commit()
    db.refresh(link)
    return link


def mark_link_inactive(db: Session, link: models.Link):
    link.is_active = False
    db.commit()
    db.refresh(link)
    return link


def delete_link(db: Session, short_code: str):
    link = get_link_by_code(db, short_code)
    if not link:
        return False
    db.delete(link)
    db.commit()
    return True
