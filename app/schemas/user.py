from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.common import ORMModel


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    inn: str | None = Field(default=None, min_length=12, max_length=12)

    @field_validator("inn")
    @classmethod
    def validate_inn(cls, value: str | None) -> str | None:
        if value is not None and not value.isdigit():
            raise ValueError("INN must contain only digits")
        return value

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = "".join(ch for ch in value if ch.isdigit() or ch == "+")
        if len(normalized) < 10:
            raise ValueError("Phone number is too short")
        return normalized


class UserRead(ORMModel):
    id: UUID
    email: EmailStr
    full_name: str
    phone: str | None
    inn: str | None
    created_at: datetime
