from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr

class UserCreate(BaseModel):
    user_name: str
    email: EmailStr
    password: str

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
    original_url: str
    custom_alias: Optional[str] = None
    expires_at: Optional[datetime] = None

class LinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    short_code: str
    user_name: str
    original_url: str
    custom_alias: Optional[str] = None
    is_active: bool
    expires_at: Optional[datetime] = None
    click_count: int
    created_at: datetime
    updated_at: datetime