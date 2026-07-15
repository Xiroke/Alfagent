from __future__ import annotations

from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass
from typing import Protocol

from app.ai.clients.openrouter import ChatMessage, OpenRouterClient
from app.ai.prompts.templates import build_user_prompt, get_agent_system_prompt
from app.domain.agents import AgentType
from app.infrastructure.repositories.knowledge import RetrievedChunk


@dataclass(slots=True, frozen=True)
class AgentReplyContext:
    user_message: str
    rag_chunks: Sequence[RetrievedChunk]
    company_profile: str | None = None


class Agent(Protocol):
    """Extensible agent contract — register new agents in AgentRegistry."""

    agent_type: AgentType

    def build_messages(self, ctx: AgentReplyContext) -> list[ChatMessage]: ...

    async def stream(
        self,
        client: OpenRouterClient,
        ctx: AgentReplyContext,
        *,
        model: str | None = None,
    ) -> AsyncIterator[str]: ...


class BaseAgent:
    agent_type: AgentType

    def build_messages(self, ctx: AgentReplyContext) -> list[ChatMessage]:
        from app.ai.rag.retriever import RAGRetriever

        rag_context = RAGRetriever.format_context(ctx.rag_chunks)
        return [
            {"role": "system", "content": get_agent_system_prompt(self.agent_type)},
            {
                "role": "user",
                "content": build_user_prompt(
                    user_message=ctx.user_message,
                    rag_context=rag_context,
                    company_profile=ctx.company_profile,
                ),
            },
        ]

    async def stream(
        self,
        client: OpenRouterClient,
        ctx: AgentReplyContext,
        *,
        model: str | None = None,
    ) -> AsyncIterator[str]:
        messages = self.build_messages(ctx)
        async for token in client.stream_chat_completion(messages, model=model):
            yield token


class TaxAgent(BaseAgent):
    agent_type = AgentType.TAX


class RealEstateAgent(BaseAgent):
    agent_type = AgentType.REAL_ESTATE


class SalesAgent(BaseAgent):
    agent_type = AgentType.SALES


class CertificationAgent(BaseAgent):
    agent_type = AgentType.CERTIFICATION


class GeneralAgent(BaseAgent):
    agent_type = AgentType.GENERAL


class AgentRegistry:
    """Registry of specialist agents. Register() to add a new agent without touching the router."""

    def __init__(self) -> None:
        self._agents: dict[AgentType, BaseAgent] = {}

    def register(self, agent: BaseAgent) -> None:
        self._agents[agent.agent_type] = agent

    def get(self, agent_type: AgentType) -> BaseAgent:
        try:
            return self._agents[agent_type]
        except KeyError as exc:
            raise KeyError(f"Agent '{agent_type}' is not registered") from exc

    def list_types(self) -> list[AgentType]:
        return list(self._agents.keys())


def build_default_registry() -> AgentRegistry:
    registry = AgentRegistry()
    for agent in (
        TaxAgent(),
        RealEstateAgent(),
        SalesAgent(),
        CertificationAgent(),
        GeneralAgent(),
    ):
        registry.register(agent)
    return registry
