from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import AddressType
from app.infrastructure.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.infrastructure.models.company import Company


class Address(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "addresses"

    address_type: Mapped[AddressType] = mapped_column(
        Enum(
            AddressType,
            name="address_type",
            native_enum=True,
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    region: Mapped[str] = mapped_column(String(128), nullable=False)
    city: Mapped[str] = mapped_column(String(128), nullable=False)
    street: Mapped[str] = mapped_column(String(255), nullable=False)
    building: Mapped[str] = mapped_column(String(64), nullable=False)
    apartment: Mapped[str | None] = mapped_column(String(64), nullable=True)
    postal_code: Mapped[str] = mapped_column(String(16), nullable=False)
    fias_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    full_address: Mapped[str] = mapped_column(String(512), nullable=False)

    company: Mapped[Company | None] = relationship(
        "Company",
        back_populates="legal_address",
        foreign_keys="Company.legal_address_id",
        uselist=False,
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Address id={self.id} type={self.address_type} city={self.city!r}>"
