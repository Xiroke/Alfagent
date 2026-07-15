from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Path, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.clients.openrouter import OpenRouterClient
from app.application.services.company_registration import CompanyRegistrationService
from app.infrastructure.database.session import get_db_session

SessionDep = Annotated[AsyncSession, Depends(get_db_session)]
CompanyIdPath = Annotated[UUID, Path(description="Company UUID")]

_singleton_client: OpenRouterClient | None = None


def get_company_registration_service(session: SessionDep) -> CompanyRegistrationService:
    return CompanyRegistrationService(session)


CompanyRegistrationServiceDep = Annotated[
    CompanyRegistrationService,
    Depends(get_company_registration_service),
]


def get_openrouter_client(request: Request) -> OpenRouterClient:
    client = getattr(request.app.state, "openrouter", None)
    if isinstance(client, OpenRouterClient):
        return client
    return get_openrouter_singleton()


def get_openrouter_singleton() -> OpenRouterClient:
    global _singleton_client
    if _singleton_client is None:
        _singleton_client = OpenRouterClient()
    return _singleton_client


async def start_openrouter_client() -> OpenRouterClient:
    client = get_openrouter_singleton()
    await client.start()
    return client


async def stop_openrouter_client() -> None:
    global _singleton_client
    if _singleton_client is not None:
        await _singleton_client.close()
        _singleton_client = None
