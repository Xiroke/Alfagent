"""resize pgvector columns for Qwen3-Embedding-0.6B (1024)

Revision ID: 0004_embedding_1024
Revises: 0003_knowledge_documents
Create Date: 2026-07-16 10:15:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_embedding_1024"
down_revision: Union[str, None] = "0003_knowledge_documents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    # Old OpenAI 1536-dim vectors are incompatible with Qwen3-Embedding-0.6B (1024).
    if _table_exists("knowledge_embeddings"):
        op.execute("TRUNCATE TABLE knowledge_embeddings")
        op.execute(
            "ALTER TABLE knowledge_embeddings "
            "ALTER COLUMN embedding TYPE vector(1024)"
        )
    if _table_exists("knowledge_documents"):
        op.execute("TRUNCATE TABLE knowledge_documents")
        op.execute(
            "ALTER TABLE knowledge_documents "
            "ALTER COLUMN embedding TYPE vector(1024)"
        )


def downgrade() -> None:
    if _table_exists("knowledge_embeddings"):
        op.execute("TRUNCATE TABLE knowledge_embeddings")
        op.execute(
            "ALTER TABLE knowledge_embeddings "
            "ALTER COLUMN embedding TYPE vector(1536)"
        )
    if _table_exists("knowledge_documents"):
        op.execute("TRUNCATE TABLE knowledge_documents")
        op.execute(
            "ALTER TABLE knowledge_documents "
            "ALTER COLUMN embedding TYPE vector(1536)"
        )
