from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    TIMESTAMP,
    ForeignKey,
    func,
    BigInteger,
)
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    user_name = Column(String(120), primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    links = relationship("Link", back_populates="owner", cascade="all, delete-orphan")


class Link(Base):
    __tablename__ = "links"

    short_code = Column(String(20), primary_key=True, index=True)
    user_name = Column(String(120), ForeignKey("users.user_name", ondelete="CASCADE"), nullable=False, index=True)
    original_url = Column(Text, nullable=False)
    custom_alias = Column(String(50), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    expires_at = Column(TIMESTAMP, nullable=True, index=True)
    click_count = Column(BigInteger, nullable=False, default=0)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="links")