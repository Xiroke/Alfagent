from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.wizard_prefill import (
    PrefillAddressOut,
    PrefillCompanyOut,
    PrefillFounderOut,
    PrefillTaxOut,
)


class ProtocolGenerateRequest(BaseModel):
    """Draft payload for founders meeting protocol generation."""

    company: PrefillCompanyOut
    founders: list[PrefillFounderOut] = Field(default_factory=list)
    address: PrefillAddressOut = Field(default_factory=PrefillAddressOut)
    tax: PrefillTaxOut = Field(default_factory=PrefillTaxOut)
