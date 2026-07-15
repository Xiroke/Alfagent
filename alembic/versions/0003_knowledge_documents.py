"""knowledge_documents table for RAG Q&A

Revision ID: 0003_knowledge_documents
Revises: 0002_rag_metadata
Create Date: 2026-07-15 13:30:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_knowledge_documents"
down_revision: Union[str, None] = "0002_rag_metadata"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if _table_exists("knowledge_documents"):
        return

    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute(
        """
        CREATE TABLE knowledge_documents (
            id UUID NOT NULL,
            content TEXT NOT NULL,
            embedding vector(1536),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT pk_knowledge_documents PRIMARY KEY (id),
            CONSTRAINT uq_knowledge_documents_content UNIQUE (content)
        )
        """
    )


def downgrade() -> None:
    if _table_exists("knowledge_documents"):
        op.drop_table("knowledge_documents")
