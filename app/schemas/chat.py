from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.domain.agents import AgentType, KnowledgeCategory


class ChatMessageIn(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1, max_length=16_000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8_000)
    company_id: UUID | None = None
    company_profile: str | None = Field(default=None, max_length=4_000)
    forced_agent: AgentType | None = None
    history: list[ChatMessageIn] = Field(default_factory=list, max_length=20)


class IntentClassifyRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8_000)


class IntentClassifyResponse(BaseModel):
    agent: AgentType
    confidence: float
    rationale: str
    source: str


class KnowledgeIngestRequest(BaseModel):
    source: str = Field(..., min_length=2, max_length=128)
    category: KnowledgeCategory
    content: str = Field(..., min_length=20, max_length=100_000)
    title: str | None = Field(default=None, max_length=512)
    metadata: dict[str, str] | None = None


class KnowledgeIngestResponse(BaseModel):
    chunks_created: int
    chunk_ids: list[UUID]


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=4_000)
    category: KnowledgeCategory | None = None
    top_k: int = Field(default=5, ge=1, le=20)


class KnowledgeSearchHit(BaseModel):
    id: UUID
    source: str
    category: str
    title: str | None
    content: str
    score: float


class KnowledgeSearchResponse(BaseModel):
    hits: list[KnowledgeSearchHit]
