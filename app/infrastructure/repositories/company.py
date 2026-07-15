from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictError, DatabaseError, NotFoundError
from app.domain.enums import CompanyRegistrationStatus, UserRole
from app.infrastructure.models import Company, FounderLink, User
from app.infrastructure.repositories.address import AddressRepository
from app.infrastructure.repositories.user import UserRepository
from app.schemas.company import CompanyRegistrationCreate, FounderCreate


class CompanyRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._users = UserRepository(session)
        self._addresses = AddressRepository(session)

    async def get_by_id(self, company_id: UUID) -> Company | None:
        stmt = (
            select(Company)
            .where(Company.id == company_id)
            .options(
                selectinload(Company.founders).selectinload(FounderLink.user),
                selectinload(Company.legal_address),
                selectinload(Company.applicant),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_or_raise(self, company_id: UUID) -> Company:
        company = await self.get_by_id(company_id)
        if company is None:
            raise NotFoundError(f"Company {company_id} not found")
        return company

    async def create_registration(self, payload: CompanyRegistrationCreate) -> Company:
        applicant = await self._resolve_applicant(payload)
        address = await self._addresses.create(payload.legal_address)

        company = Company(
            name=payload.name,
            short_name=payload.short_name,
            tax_regime=payload.tax_regime,
            authorized_capital=payload.authorized_capital,
            applicant_id=applicant.id,
            legal_address_id=address.id,
            registration_status=CompanyRegistrationStatus.DRAFT,
            notes=payload.notes,
        )
        self._session.add(company)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise ConflictError("Company constraint violation") from exc
        except Exception as exc:
            raise DatabaseError("Failed to create company") from exc

        await self._attach_founders(company, payload.founders)
        return await self.get_by_id_or_raise(company.id)

    async def update_status(
        self,
        company_id: UUID,
        status: CompanyRegistrationStatus,
    ) -> Company:
        company = await self.get_by_id_or_raise(company_id)
        company.registration_status = status
        try:
            await self._session.flush()
        except Exception as exc:
            raise DatabaseError("Failed to update company status") from exc
        return company

    async def _resolve_applicant(self, payload: CompanyRegistrationCreate) -> User:
        if payload.applicant_id is not None:
            return await self._users.get_by_id_or_raise(payload.applicant_id)
        assert payload.applicant is not None
        return await self._users.get_or_create(payload.applicant, role=UserRole.APPLICANT)

    async def _attach_founders(
        self,
        company: Company,
        founders: list[FounderCreate],
    ) -> None:
        for founder in founders:
            user = await self._resolve_founder_user(founder)
            link = FounderLink(
                user_id=user.id,
                company_id=company.id,
                ownership_share=founder.ownership_share,
                is_director=founder.is_director,
                contribution_amount=founder.contribution_amount
                or self._default_contribution(company.authorized_capital, founder.ownership_share),
            )
            self._session.add(link)

        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise ConflictError("Duplicate founder for company or invalid ownership share") from exc
        except Exception as exc:
            raise DatabaseError("Failed to attach founders") from exc

    async def _resolve_founder_user(self, founder: FounderCreate) -> User:
        if founder.user_id is not None:
            return await self._users.get_by_id_or_raise(founder.user_id)
        assert founder.user is not None
        return await self._users.get_or_create(founder.user, role=UserRole.OWNER)

    @staticmethod
    def _default_contribution(capital: Decimal, share: Decimal) -> Decimal:
        return (capital * share / Decimal("100")).quantize(Decimal("0.01"))
