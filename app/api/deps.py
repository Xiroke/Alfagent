from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Path, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.clients.llm import LLMClient
from app.application.services.company_registration import CompanyRegistrationService
from app.infrastructure.database.session import get_db_session

SessionDep = Annotated[AsyncSession, Depends(get_db_session)]
CompanyIdPath = Annotated[UUID, Path(description="Company UUID")]

_singleton_client: LLMClient | None = None


def get_company_registration_service(session: SessionDep) -> CompanyRegistrationService:
    return CompanyRegistrationService(session)


CompanyRegistrationServiceDep = Annotated[
    CompanyRegistrationService,
    Depends(get_company_registration_service),
]


def get_llm_client(request: Request) -> LLMClient:
    client = getattr(request.app.state, "llm", None)
    if isinstance(client, LLMClient):
        return client
    return get_llm_singleton()


def get_llm_singleton() -> LLMClient:
    global _singleton_client
    if _singleton_client is None:
        _singleton_client = LLMClient()
    return _singleton_client


async def start_llm_client() -> LLMClient:
    client = get_llm_singleton()
    await client.start()
    return client


async def stop_llm_client() -> None:
    global _singleton_client
    if _singleton_client is not None:
        await _singleton_client.close()
        _singleton_client = None


LLMDep = Annotated[LLMClient, Depends(get_llm_client)]


# Backward-compatible aliases
get_openrouter_client = get_llm_client
get_openrouter_singleton = get_llm_singleton
start_openrouter_client = start_llm_client
stop_openrouter_client = stop_llm_client
