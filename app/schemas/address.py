from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.domain.enums import AddressType
from app.schemas.common import ORMModel


class AddressCreate(BaseModel):
    address_type: AddressType
    region: str = Field(..., min_length=2, max_length=128)
    city: str = Field(..., min_length=2, max_length=128)
    street: str = Field(..., min_length=1, max_length=255)
    building: str = Field(..., min_length=1, max_length=64)
    apartment: str | None = Field(default=None, max_length=64)
    postal_code: str = Field(..., min_length=6, max_length=16)
    fias_id: str | None = Field(default=None, max_length=36)

    @model_validator(mode="after")
    def home_requires_apartment(self) -> AddressCreate:
        if self.address_type == AddressType.HOME and not self.apartment:
            raise ValueError("Apartment is required for home address type")
        return self

    @property
    def composed_full_address(self) -> str:
        parts = [
            self.postal_code,
            self.region,
            self.city,
            self.street,
            f"д. {self.building}",
        ]
        if self.apartment:
            parts.append(f"кв. {self.apartment}")
        return ", ".join(parts)


class AddressRead(ORMModel):
    id: UUID
    address_type: AddressType
    region: str
    city: str
    street: str
    building: str
    apartment: str | None
    postal_code: str
    fias_id: str | None
    full_address: str
