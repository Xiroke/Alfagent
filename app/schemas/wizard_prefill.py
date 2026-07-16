from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.domain.enums import AddressType, TaxRegime


class PrefillCompanyOut(BaseModel):
    name: str = ""
    short_name: str = ""
    okved_codes: list[str] = Field(default_factory=list)
    authorized_capital: float = Field(default=10_000, ge=0)


class PrefillFounderOut(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    inn: str = ""
    ownership_share: float = Field(default=0, ge=0, le=100)
    is_director: bool = False


class PrefillAddressOut(BaseModel):
    address_type: AddressType = AddressType.RENTAL
    region: str = ""
    city: str = ""
    street: str = ""
    building: str = ""
    apartment: str = ""
    postal_code: str = ""
    full_address: str = ""
    founder_full_name_for_home: str | None = None

    @field_validator("address_type", mode="before")
    @classmethod
    def normalize_address_type(cls, value: object) -> AddressType:
        if isinstance(value, AddressType):
            return value
        raw = str(value or "rental").strip().lower()
        if raw in {"home", "домашний", "дом", "прописка"}:
            return AddressType.HOME
        return AddressType.RENTAL


class PrefillTaxOut(BaseModel):
    tax_regime: TaxRegime = TaxRegime.USN

    @field_validator("tax_regime", mode="before")
    @classmethod
    def normalize_tax(cls, value: object) -> TaxRegime:
        if isinstance(value, TaxRegime):
            return value
        raw = str(value or "usn").strip().lower()
        if raw in {"osn", "общая", "общая система"}:
            return TaxRegime.OSN
        if raw in {"ausn", "аусн", "автоматизированная"}:
            return TaxRegime.AUSN
        return TaxRegime.USN


class WizardPrefillResponse(BaseModel):
    company: PrefillCompanyOut
    founders: list[PrefillFounderOut]
    address: PrefillAddressOut
    tax: PrefillTaxOut
    extracted_chars: int
    source_filename: str
    model_notes: str | None = None
