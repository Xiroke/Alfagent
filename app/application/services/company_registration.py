from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ValidationAppError
from app.domain.enums import CompanyRegistrationStatus
from app.infrastructure.models import Company
from app.infrastructure.repositories.company import CompanyRepository
from app.schemas.company import CompanyRegistrationCreate


class CompanyRegistrationService:
    """Application service for ООО registration applications."""

    _ALLOWED_TRANSITIONS: dict[CompanyRegistrationStatus, set[CompanyRegistrationStatus]] = {
        CompanyRegistrationStatus.DRAFT: {
            CompanyRegistrationStatus.SUBMITTED,
            CompanyRegistrationStatus.CANCELLED,
        },
        CompanyRegistrationStatus.SUBMITTED: {
            CompanyRegistrationStatus.DOCUMENTS_REVIEW,
            CompanyRegistrationStatus.REJECTED,
            CompanyRegistrationStatus.CANCELLED,
        },
        CompanyRegistrationStatus.DOCUMENTS_REVIEW: {
            CompanyRegistrationStatus.PENDING_BANK,
            CompanyRegistrationStatus.REJECTED,
        },
        CompanyRegistrationStatus.PENDING_BANK: {
            CompanyRegistrationStatus.REGISTERED,
            CompanyRegistrationStatus.REJECTED,
        },
        CompanyRegistrationStatus.REGISTERED: set(),
        CompanyRegistrationStatus.REJECTED: set(),
        CompanyRegistrationStatus.CANCELLED: set(),
    }

    def __init__(self, session: AsyncSession) -> None:
        self._companies = CompanyRepository(session)

    async def create_application(self, payload: CompanyRegistrationCreate) -> Company:
        return await self._companies.create_registration(payload)

    async def get_application(self, company_id: UUID) -> Company:
        return await self._companies.get_by_id_or_raise(company_id)

    async def submit_application(self, company_id: UUID) -> Company:
        company = await self._companies.get_by_id_or_raise(company_id)
        if not company.founders:
            raise ValidationAppError("Cannot submit application without founders")
        if company.legal_address_id is None:
            raise ValidationAppError("Cannot submit application without legal address")
        return await self.transition_status(company_id, CompanyRegistrationStatus.SUBMITTED)

    async def transition_status(
        self,
        company_id: UUID,
        new_status: CompanyRegistrationStatus,
    ) -> Company:
        company = await self._companies.get_by_id_or_raise(company_id)
        allowed = self._ALLOWED_TRANSITIONS.get(company.registration_status, set())
        if new_status not in allowed:
            raise ValidationAppError(
                f"Transition from {company.registration_status} to {new_status} is not allowed",
                details={
                    "from": company.registration_status.value,
                    "to": new_status.value,
                    "allowed": sorted(s.value for s in allowed),
                },
            )
        return await self._companies.update_status(company_id, new_status)
