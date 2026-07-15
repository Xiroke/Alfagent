from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, DatabaseError, NotFoundError
from app.domain.enums import UserRole
from app.infrastructure.models import User
from app.schemas.user import UserCreate


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self._session.get(User, user_id)

    async def get_by_id_or_raise(self, user_id: UUID) -> User:
        user = await self.get_by_id(user_id)
        if user is None:
            raise NotFoundError(f"User {user_id} not found")
        return user

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email.lower())
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, payload: UserCreate, *, role: UserRole = UserRole.APPLICANT) -> User:
        existing = await self.get_by_email(payload.email)
        if existing is not None:
            raise ConflictError(f"User with email {payload.email} already exists")

        user = User(
            email=payload.email.lower(),
            full_name=payload.full_name,
            phone=payload.phone,
            inn=payload.inn,
            role=role,
        )
        self._session.add(user)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise ConflictError("User uniqueness constraint violated") from exc
        except Exception as exc:
            raise DatabaseError("Failed to create user") from exc
        return user

    async def get_or_create(self, payload: UserCreate, *, role: UserRole = UserRole.APPLICANT) -> User:
        existing = await self.get_by_email(payload.email)
        if existing is not None:
            return existing
        return await self.create(payload, role=role)
