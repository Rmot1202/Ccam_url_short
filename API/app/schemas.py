from datetime import datetime
from typing import Optional
from urllib.parse import urlparse
import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

ALIAS_PATTERN = re.compile(r"^[A-Za-z0-9_-]{2,20}$")


class UserCreate(BaseModel):
    user_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_name: str
    email: EmailStr
    is_active: bool
    created_at: datetime
    updated_at: datetime


class LinkCreate(BaseModel):
    original_url: str = Field(min_length=1, max_length=4096)
    custom_alias: Optional[str] = Field(default=None, max_length=20)
    expires_at: Optional[datetime] = None
    warm_cache: bool = True

    @field_validator("original_url")
    @classmethod
    def validate_original_url(cls, value: str) -> str:
        value = value.strip()
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("URL must be an absolute HTTP or HTTPS URL")
        if any(char.isspace() for char in value):
            raise ValueError("URL must not contain whitespace")
        return value

    @field_validator("custom_alias")
    @classmethod
    def validate_custom_alias(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if not ALIAS_PATTERN.fullmatch(value):
            raise ValueError("Custom alias must be 2-20 letters, digits, hyphens, or underscores")
        return value


class LinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    short_code: str
    user_name: str
    original_url: str
    custom_alias: Optional[str] = None
    is_active: bool
    expires_at: Optional[datetime] = None
    click_count: int
    cached_in_redis: bool = False
    created_at: datetime
    updated_at: datetime
