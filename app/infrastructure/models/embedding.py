"""Enhanced ORM model for RAG knowledge chunks (pgvector)."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base


class KnowledgeEmbedding(Base):
    __tablename__ = "knowledge_embeddings"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    source: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    category: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="general",
        server_default="general",
        index=True,
    )
    title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1024), nullable=True)
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
