from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.domain.enums import CompanyRegistrationStatus, TaxRegime
from app.schemas.address import AddressCreate, AddressRead
from app.schemas.common import ORMModel
from app.schemas.user import UserCreate, UserRead


class FounderCreate(BaseModel):
    """Existing user as founder, or inline create of a new founder user."""

    user_id: UUID | None = None
    user: UserCreate | None = None
    ownership_share: Decimal = Field(..., gt=0, le=100, max_digits=5, decimal_places=2)
    is_director: bool = False
    contribution_amount: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2)

    @model_validator(mode="after")
    def require_user_identity(self) -> FounderCreate:
        if self.user_id is None and self.user is None:
            raise ValueError("Either user_id or user payload must be provided")
        if self.user_id is not None and self.user is not None:
            raise ValueError("Provide either user_id or user payload, not both")
        return self


class FounderRead(ORMModel):
    id: UUID
    user_id: UUID
    ownership_share: Decimal
    is_director: bool
    contribution_amount: Decimal | None
    user: UserRead


class CompanyRegistrationCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    short_name: str | None = Field(default=None, max_length=128)
    tax_regime: TaxRegime = TaxRegime.USN
    authorized_capital: Decimal = Field(
        default=Decimal("10000.00"),
        gt=0,
        max_digits=14,
        decimal_places=2,
    )
    applicant_id: UUID | None = None
    applicant: UserCreate | None = None
    legal_address: AddressCreate
    founders: list[FounderCreate] = Field(..., min_length=1)
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 3:
            raise ValueError("Company name is too short")
        return cleaned

    @model_validator(mode="after")
    def validate_applicant_and_shares(self) -> CompanyRegistrationCreate:
        if self.applicant_id is None and self.applicant is None:
            raise ValueError("Either applicant_id or applicant payload must be provided")
        if self.applicant_id is not None and self.applicant is not None:
            raise ValueError("Provide either applicant_id or applicant payload, not both")

        total_share = sum((f.ownership_share for f in self.founders), Decimal("0"))
        if total_share != Decimal("100"):
            raise ValueError(f"Founders ownership shares must sum to 100, got {total_share}")

        directors = [f for f in self.founders if f.is_director]
        if len(directors) != 1:
            raise ValueError("Exactly one founder must be marked as director")

        emails = [
            f.user.email.lower()
            for f in self.founders
            if f.user is not None
        ]
        if len(emails) != len(set(emails)):
            raise ValueError("Duplicate founder emails in request")

        return self


class CompanyRead(ORMModel):
    id: UUID
    name: str
    short_name: str | None
    ogrn: str | None
    inn: str | None
    kpp: str | None
    registration_status: CompanyRegistrationStatus
    tax_regime: TaxRegime
    authorized_capital: Decimal
    applicant_id: UUID
    notes: str | None
    created_at: datetime
    updated_at: datetime
    legal_address: AddressRead | None
    founders: list[FounderRead]
    applicant: UserRead


class CompanyStatusUpdate(BaseModel):
    registration_status: CompanyRegistrationStatus
