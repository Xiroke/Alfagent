from __future__ import annotations

import hashlib
import logging
import re
from typing import Any, Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.clients.openrouter import OpenRouterClient
from app.core.config import Settings, get_settings
from app.domain.agents import KnowledgeCategory
from app.infrastructure.repositories.knowledge import KnowledgeRepository, RetrievedChunk

logger = logging.getLogger(__name__)

_WHITESPACE_RE = re.compile(r"\s+")


class EmbeddingService:
    """Creates embeddings via OpenRouter and persists / searches knowledge chunks."""

    def __init__(
        self,
        session: AsyncSession,
        client: OpenRouterClient,
        settings: Settings | None = None,
    ) -> None:
        self._session = session
        self._client = client
        self._settings = settings or get_settings()
        self._repo = KnowledgeRepository(session)

    @staticmethod
    def chunk_text(text: str, *, max_chars: int = 1200, overlap: int = 150) -> list[str]:
        cleaned = _WHITESPACE_RE.sub(" ", text).strip()
        if not cleaned:
            return []
        if len(cleaned) <= max_chars:
            return [cleaned]

        chunks: list[str] = []
        start = 0
        while start < len(cleaned):
            end = min(len(cleaned), start + max_chars)
            chunk = cleaned[start:end].strip()
            if chunk:
                chunks.append(chunk)
            if end >= len(cleaned):
                break
            start = max(0, end - overlap)
        return chunks

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        return await self._client.embed(list(texts))

    async def ingest_document(
        self,
        *,
        source: str,
        category: KnowledgeCategory | str,
        content: str,
        title: str | None = None,
        metadata: dict[str, Any] | None = None,
        max_chars: int = 1200,
    ) -> list[RetrievedChunk]:
        pieces = self.chunk_text(content, max_chars=max_chars)
        if not pieces:
            return []

        vectors = await self.embed_texts(pieces)
        stored: list[RetrievedChunk] = []
        for piece, vector in zip(pieces, vectors, strict=True):
            digest = hashlib.sha256(f"{source}:{piece}".encode("utf-8")).hexdigest()
            row = await self._repo.upsert_chunk(
                source=source,
                category=category,
                content=piece,
                embedding=vector,
                title=title,
                metadata={**(metadata or {}), "content_hash": digest},
            )
            stored.append(
                RetrievedChunk(
                    id=row.id,
                    source=row.source,
                    category=row.category,
                    title=row.title,
                    content=row.content,
                    score=1.0,
                    metadata=row.metadata_,
                )
            )
        logger.info("Ingested %s chunks for source=%s category=%s", len(stored), source, category)
        return stored

    async def search(
        self,
        query: str,
        *,
        top_k: int | None = None,
        categories: Sequence[str] | None = None,
        similarity_threshold: float | None = None,
    ) -> list[RetrievedChunk]:
        query_vec = await self._client.embed_one(query)
        return await self._repo.similarity_search(
            query_vec,
            top_k=top_k or self._settings.rag_top_k,
            categories=categories,
            similarity_threshold=(
                similarity_threshold
                if similarity_threshold is not None
                else self._settings.rag_similarity_threshold
            ),
        )
