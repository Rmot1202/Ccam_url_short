from datetime import datetime, timezone
import secrets
import string

from sqlalchemy.orm import Session

from . import crud, schemas
from .redis_client import cache_contains, cache_delete, cache_get, cache_set

DEFAULT_CACHE_TTL_SECONDS = 3600
MAX_GENERATION_ATTEMPTS = 10
RESERVED_ALIASES = {
    "auth",
    "docs",
    "links",
    "openapi.json",
    "redoc",
    "shorten",
    "stats",
}


class AliasConflictError(ValueError):
    pass


class InvalidAliasError(ValueError):
    pass


class InvalidExpirationError(ValueError):
    pass


class LinkExpiredError(ValueError):
    pass


def _generate_short_code(length: int = 6) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _is_expired(expires_at: datetime | None, now: datetime | None = None) -> bool:
    expires_at = _normalize_datetime(expires_at)
    if expires_at is None:
        return False
    return expires_at <= (now or datetime.now(timezone.utc))


def _cache_ttl(expires_at: datetime | None, now: datetime | None = None) -> int:
    expires_at = _normalize_datetime(expires_at)
    if expires_at is None:
        return DEFAULT_CACHE_TTL_SECONDS
    seconds = int((expires_at - (now or datetime.now(timezone.utc))).total_seconds())
    return max(seconds, 0)


def _annotate_cache_state(link):
    if link is not None:
        setattr(link, "cached_in_redis", cache_contains(link.short_code))
    return link


def _generate_unique_short_code(db: Session) -> str:
    for _ in range(MAX_GENERATION_ATTEMPTS):
        short_code = _generate_short_code()
        if short_code.lower() in RESERVED_ALIASES:
            continue
        if not crud.get_link_by_code(db, short_code):
            return short_code
    raise RuntimeError("Could not generate a unique short code")


def create_short_link(db: Session, user_name: str, payload: schemas.LinkCreate):
    """Apply URL-shortening business rules, then persist and optionally warm cache."""
    now = datetime.now(timezone.utc)
    custom_alias = payload.custom_alias.strip() if payload.custom_alias else None

    if custom_alias:
        if custom_alias.lower() in RESERVED_ALIASES:
            raise InvalidAliasError("Custom alias is reserved")
        if crud.get_link_by_code(db, custom_alias):
            raise AliasConflictError("Custom alias already exists")
        short_code = custom_alias
    else:
        short_code = _generate_unique_short_code(db)

    expires_at = _normalize_datetime(payload.expires_at)
    if expires_at and expires_at <= now:
        raise InvalidExpirationError("Expiration date must be in the future")

    link = crud.create_link(
        db=db,
        user_name=user_name,
        short_code=short_code,
        original_url=payload.original_url,
        custom_alias=custom_alias,
        expires_at=expires_at,
    )

    if payload.warm_cache:
        cache_set(short_code, link.original_url, _cache_ttl(expires_at, now))

    return _annotate_cache_state(link)


def list_short_links(db: Session, user_name: str):
    links = crud.get_all_links(db, user_name)
    return [_annotate_cache_state(link) for link in links]


def get_link_stats(db: Session, short_code: str):
    return _annotate_cache_state(crud.get_link_by_code(db, short_code))


def resolve_redirect(db: Session, short_code: str) -> str | None:
    """Resolve a short code, enforce expiration, and use cache-aside."""
    now = datetime.now(timezone.utc)
    cached_url = cache_get(short_code)
    link = crud.get_link_by_code(db, short_code)

    if not link:
        if cached_url:
            cache_delete(short_code)
        return None

    if not link.is_active or _is_expired(link.expires_at, now):
        if link.is_active:
            crud.mark_link_inactive(db, link)
        cache_delete(short_code)
        raise LinkExpiredError("Link expired or inactive")

    if cached_url:
        return cached_url

    cache_set(short_code, link.original_url, _cache_ttl(link.expires_at, now))
    return link.original_url

def delete_short_link(db: Session, short_code: str) -> bool:
    deleted = crud.delete_link(db, short_code)
    if deleted:
        cache_delete(short_code)
    return deleted
