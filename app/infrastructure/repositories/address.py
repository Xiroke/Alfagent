from __future__ import annotations

from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, DatabaseError
from app.infrastructure.models import Address
from app.schemas.address import AddressCreate


class AddressRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, address_id: UUID) -> Address | None:
        return await self._session.get(Address, address_id)

    async def create(self, payload: AddressCreate) -> Address:
        address = Address(
            address_type=payload.address_type,
            region=payload.region,
            city=payload.city,
            street=payload.street,
            building=payload.building,
            apartment=payload.apartment,
            postal_code=payload.postal_code,
            fias_id=payload.fias_id,
            full_address=payload.composed_full_address,
        )
        self._session.add(address)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise ConflictError("Address constraint violation") from exc
        except Exception as exc:
            raise DatabaseError("Failed to create address") from exc
        return address
