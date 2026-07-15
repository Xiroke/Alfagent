from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.infrastructure.models.company import Company
    from app.infrastructure.models.user import User


class FounderLink(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "founder_links"
    __table_args__ = (
        UniqueConstraint("user_id", "company_id", name="uq_founder_user_company"),
        CheckConstraint(
            "ownership_share > 0 AND ownership_share <= 100",
            name="ownership_share_range",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ownership_share: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    is_director: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    contribution_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="founder_links", lazy="joined")
    company: Mapped[Company] = relationship("Company", back_populates="founders", lazy="joined")

    def __repr__(self) -> str:
        return (
            f"<FounderLink company={self.company_id} user={self.user_id} "
            f"share={self.ownership_share}>"
        )
