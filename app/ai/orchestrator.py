from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from dataclasses import asdict, dataclass
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agents.base import AgentRegistry, AgentReplyContext, build_default_registry
from app.ai.clients.openrouter import OpenRouterClient
from app.ai.rag.retriever import RAGRetriever
from app.ai.router.intent_classifier import IntentClassifier, IntentResult
from app.core.config import Settings, get_settings
from app.domain.agents import AgentType
from app.infrastructure.models import Company

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ChatStreamEvent:
    """Normalized SSE/WS event payload."""

    event: str
    data: dict[str, Any]

    def to_sse(self) -> str:
        return f"event: {self.event}\ndata: {json.dumps(self.data, ensure_ascii=False)}\n\n"

    def to_json(self) -> str:
        return json.dumps({"event": self.event, **self.data}, ensure_ascii=False)


class MultiAgentOrchestrator:
    """
    Pipeline: IntentClassifier → RAGRetriever → Agent.stream.

    Extending: register a new AgentType + BaseAgent subclass in build_default_registry()
    and add CATEGORY map + prompt — no changes to this orchestrator required.
    """

    def __init__(
        self,
        session: AsyncSession,
        client: OpenRouterClient,
        settings: Settings | None = None,
        registry: AgentRegistry | None = None,
    ) -> None:
        self._session = session
        self._client = client
        self._settings = settings or get_settings()
        self._registry = registry or build_default_registry()
        self._classifier = IntentClassifier(client, self._settings)
        self._retriever = RAGRetriever(session, client)

    async def stream_reply(
        self,
        message: str,
        *,
        forced_agent: AgentType | None = None,
        company_id: UUID | None = None,
        company_profile: str | None = None,
    ) -> AsyncIterator[ChatStreamEvent]:
        intent = await self._classifier.classify(message, forced_agent=forced_agent)
        yield ChatStreamEvent(
            event="routing",
            data={
                "agent": intent.agent.value,
                "confidence": intent.confidence,
                "rationale": intent.rationale,
                "source": intent.source,
            },
        )

        profile = company_profile
        if profile is None and company_id is not None:
            profile = await self._load_company_profile(company_id)

        chunks = await self._retriever.retrieve_for_agent(message, intent.agent)
        yield ChatStreamEvent(
            event="rag",
            data={
                "chunk_count": len(chunks),
                "sources": [
                    {
                        "id": str(c.id),
                        "source": c.source,
                        "category": c.category,
                        "title": c.title,
                        "score": round(c.score, 4),
                    }
                    for c in chunks
                ],
            },
        )

        agent = self._registry.get(intent.agent)
        ctx = AgentReplyContext(
            user_message=message,
            rag_chunks=chunks,
            company_profile=profile,
        )

        yield ChatStreamEvent(event="agent_start", data={"agent": intent.agent.value})

        try:
            async for token in agent.stream(self._client, ctx):
                yield ChatStreamEvent(event="token", data={"content": token})
        except Exception as exc:
            logger.exception("Agent stream failed")
            yield ChatStreamEvent(
                event="error",
                data={"message": str(exc), "code": getattr(exc, "code", "llm_error")},
            )
            return

        yield ChatStreamEvent(
            event="done",
            data={"agent": intent.agent.value, "intent": asdict(intent)},
        )

    async def classify_only(self, message: str) -> IntentResult:
        return await self._classifier.classify(message)

    async def _load_company_profile(self, company_id: UUID) -> str | None:
        company = await self._session.get(Company, company_id)
        if company is None:
            return None
        return (
            f"name={company.name}; tax_regime={company.tax_regime}; "
            f"authorized_capital={company.authorized_capital}; "
            f"status={company.registration_status}"
        )
