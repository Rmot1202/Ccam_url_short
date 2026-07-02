import os
from dotenv import load_dotenv
import redis
from redis.exceptions import RedisError

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL") or "redis://localhost:6379/0"
r = redis.Redis.from_url(REDIS_URL, decode_responses=True)


def cache_get(short_code: str) -> str | None:
    """Return a cached destination URL, or None if Redis is unavailable."""
    try:
        return r.get(short_code)
    except RedisError:
        return None


def cache_set(short_code: str, original_url: str, ttl_seconds: int) -> bool:
    """Cache a short-code mapping without letting Redis failures break redirects."""
    if ttl_seconds <= 0:
        return False
    try:
        return bool(r.set(short_code, original_url, ex=ttl_seconds))
    except RedisError:
        return False


def cache_delete(short_code: str) -> bool:
    """Evict a short-code mapping if Redis is available."""
    try:
        r.delete(short_code)
        return True
    except RedisError:
        return False


def cache_contains(short_code: str) -> bool:
    try:
        return bool(r.exists(short_code))
    except RedisError:
        return False

