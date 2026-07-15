from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models.knowledge_document import KnowledgeDocument


class KnowledgeDocumentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def count(self) -> int:
        result = await self._session.execute(select(func.count()).select_from(KnowledgeDocument))
        return int(result.scalar_one())

    async def exists_by_content(self, content: str) -> bool:
        stmt = (
            select(KnowledgeDocument.id)
            .where(KnowledgeDocument.content == content)
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def create(self, *, content: str, embedding: list[float]) -> KnowledgeDocument:
        row = KnowledgeDocument(content=content, embedding=embedding)
        self._session.add(row)
        await self._session.flush()
        return row

    async def get_by_id(self, document_id: UUID) -> KnowledgeDocument | None:
        return await self._session.get(KnowledgeDocument, document_id)
