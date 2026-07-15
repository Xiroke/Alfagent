from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence
from uuid import UUID

from sqlalchemy import Select, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.agents import KnowledgeCategory
from app.infrastructure.models import KnowledgeEmbedding


@dataclass(slots=True, frozen=True)
class RetrievedChunk:
    id: UUID
    source: str
    category: str
    title: str | None
    content: str
    score: float
    metadata: dict[str, Any]


class KnowledgeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def upsert_chunk(
        self,
        *,
        source: str,
        category: KnowledgeCategory | str,
        content: str,
        embedding: list[float],
        title: str | None = None,
        metadata: dict[str, Any] | None = None,
        chunk_id: UUID | None = None,
    ) -> KnowledgeEmbedding:
        category_value = (
            category.value if isinstance(category, KnowledgeCategory) else category
        )
        if chunk_id is not None:
            existing = await self._session.get(KnowledgeEmbedding, chunk_id)
            if existing is not None:
                existing.source = source
                existing.category = category_value
                existing.title = title
                existing.content = content
                existing.embedding = embedding
                existing.metadata_ = metadata or {}
                await self._session.flush()
                return existing

        row = KnowledgeEmbedding(
            source=source,
            category=category_value,
            title=title,
            content=content,
            embedding=embedding,
            metadata_=metadata or {},
        )
        if chunk_id is not None:
            row.id = chunk_id
        self._session.add(row)
        await self._session.flush()
        return row

    async def similarity_search(
        self,
        query_embedding: list[float],
        *,
        top_k: int = 5,
        categories: Sequence[str] | None = None,
        similarity_threshold: float = 0.35,
    ) -> list[RetrievedChunk]:
        """Cosine distance via pgvector: similarity = 1 - cosine_distance."""
        # Bind embedding as literal vector string for asyncpg + pgvector.
        vector_literal = "[" + ",".join(str(float(x)) for x in query_embedding) + "]"

        filters = ["embedding IS NOT NULL"]
        params: dict[str, Any] = {
            "query_vec": vector_literal,
            "top_k": top_k,
            "threshold": similarity_threshold,
        }
        if categories:
            filters.append("category = ANY(:categories)")
            params["categories"] = list(categories)

        where_sql = " AND ".join(filters)
        stmt = text(
            f"""
            SELECT
                id,
                source,
                category,
                title,
                content,
                metadata,
                1 - (embedding <=> CAST(:query_vec AS vector)) AS score
            FROM knowledge_embeddings
            WHERE {where_sql}
              AND 1 - (embedding <=> CAST(:query_vec AS vector)) >= :threshold
            ORDER BY embedding <=> CAST(:query_vec AS vector)
            LIMIT :top_k
            """
        )
        result = await self._session.execute(stmt, params)
        rows = result.mappings().all()
        return [
            RetrievedChunk(
                id=row["id"],
                source=row["source"],
                category=row["category"],
                title=row["title"],
                content=row["content"],
                score=float(row["score"]),
                metadata=dict(row["metadata"] or {}),
            )
            for row in rows
        ]

    async def list_by_source(self, source: str) -> list[KnowledgeEmbedding]:
        stmt: Select[tuple[KnowledgeEmbedding]] = select(KnowledgeEmbedding).where(
            KnowledgeEmbedding.source == source
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
