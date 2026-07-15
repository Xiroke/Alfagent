from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import CompanyRegistrationStatus, TaxRegime
from app.infrastructure.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.infrastructure.models.address import Address
    from app.infrastructure.models.founder_link import FounderLink
    from app.infrastructure.models.user import User


class Company(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "companies"
    __table_args__ = (
        CheckConstraint("authorized_capital > 0", name="authorized_capital_positive"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ogrn: Mapped[str | None] = mapped_column(String(13), unique=True, nullable=True, index=True)
    inn: Mapped[str | None] = mapped_column(String(10), unique=True, nullable=True, index=True)
    kpp: Mapped[str | None] = mapped_column(String(9), nullable=True)
    registration_status: Mapped[CompanyRegistrationStatus] = mapped_column(
        Enum(
            CompanyRegistrationStatus,
            name="company_registration_status",
            native_enum=True,
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=CompanyRegistrationStatus.DRAFT,
        server_default=CompanyRegistrationStatus.DRAFT.value,
        index=True,
    )
    tax_regime: Mapped[TaxRegime] = mapped_column(
        Enum(
            TaxRegime,
            name="tax_regime",
            native_enum=True,
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=TaxRegime.USN,
        server_default=TaxRegime.USN.value,
    )
    authorized_capital: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("10000.00"),
    )
    applicant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    legal_address_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("addresses.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    applicant: Mapped[User] = relationship(
        "User",
        back_populates="companies_as_applicant",
        foreign_keys=[applicant_id],
        lazy="joined",
    )
    founders: Mapped[list[FounderLink]] = relationship(
        "FounderLink",
        back_populates="company",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    legal_address: Mapped[Address | None] = relationship(
        "Address",
        back_populates="company",
        foreign_keys=[legal_address_id],
        lazy="joined",
        uselist=False,
    )

    def __repr__(self) -> str:
        return f"<Company id={self.id} name={self.name!r} status={self.registration_status}>"
