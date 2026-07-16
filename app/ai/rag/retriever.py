from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.clients.llm import LLMClient
from app.ai.rag.embeddings import EmbeddingService
from app.domain.agents import AgentType, KnowledgeCategory
from app.infrastructure.repositories.knowledge import RetrievedChunk

# Maps agent → knowledge categories used for retrieval filtering.
AGENT_CATEGORY_MAP: dict[AgentType, list[str]] = {
    AgentType.TAX: [KnowledgeCategory.TAX.value],
    AgentType.REAL_ESTATE: [KnowledgeCategory.REAL_ESTATE.value],
    AgentType.SALES: [KnowledgeCategory.BANKING.value, KnowledgeCategory.GENERAL.value],
    AgentType.CERTIFICATION: [
        KnowledgeCategory.SKOLKOVO.value,
        KnowledgeCategory.MIK.value,
    ],
    AgentType.GENERAL: [KnowledgeCategory.GENERAL.value],
}


class RAGRetriever:
    """Retrieval-Augmented Generation context builder."""

    def __init__(
        self,
        session: AsyncSession,
        client: LLMClient,
    ) -> None:
        self._embeddings = EmbeddingService(session, client)

    async def retrieve_for_agent(
        self,
        query: str,
        agent: AgentType,
        *,
        top_k: int | None = None,
        extra_categories: Sequence[str] | None = None,
    ) -> list[RetrievedChunk]:
        categories = list(AGENT_CATEGORY_MAP.get(agent, [KnowledgeCategory.GENERAL.value]))
        if extra_categories:
            categories.extend(extra_categories)
        unique: list[str] = []
        seen: set[str] = set()
        for cat in categories:
            if cat not in seen:
                seen.add(cat)
                unique.append(cat)
        return await self._embeddings.search(query, top_k=top_k, categories=unique or None)

    @staticmethod
    def format_context(chunks: Sequence[RetrievedChunk]) -> str:
        if not chunks:
            return "Контекст из базы знаний не найден. Отвечай на основе общих знаний и явно укажи ограничения."

        blocks: list[str] = []
        for idx, chunk in enumerate(chunks, start=1):
            title = chunk.title or chunk.source
            blocks.append(
                f"[{idx}] source={chunk.source} category={chunk.category} "
                f"score={chunk.score:.3f} title={title}\n{chunk.content}"
            )
        return "\n\n".join(blocks)
