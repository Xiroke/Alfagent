"""rag knowledge metadata columns

Revision ID: 0002_rag_metadata
Revises: 0001_initial
Create Date: 2026-07-15 12:00:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_rag_metadata"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns(table_name)}
    return column_name in columns


def _index_exists(index_name: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(
        sa.text(
            "SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = :name LIMIT 1"
        ),
        {"name": index_name},
    )
    return result.scalar() is not None


def upgrade() -> None:
    if not _column_exists("knowledge_embeddings", "category"):
        op.add_column(
            "knowledge_embeddings",
            sa.Column("category", sa.String(length=64), server_default="general", nullable=False),
        )
    if not _column_exists("knowledge_embeddings", "title"):
        op.add_column(
            "knowledge_embeddings",
            sa.Column("title", sa.String(length=512), nullable=True),
        )
    if not _column_exists("knowledge_embeddings", "metadata"):
        op.add_column(
            "knowledge_embeddings",
            sa.Column(
                "metadata",
                postgresql.JSONB(astext_type=sa.Text()),
                server_default=sa.text("'{}'::jsonb"),
                nullable=False,
            ),
        )
    if not _index_exists("ix_knowledge_embeddings_category"):
        op.create_index(
            op.f("ix_knowledge_embeddings_category"),
            "knowledge_embeddings",
            ["category"],
            unique=False,
        )
    if not _index_exists("ix_knowledge_embeddings_source"):
        op.create_index(
            op.f("ix_knowledge_embeddings_source"),
            "knowledge_embeddings",
            ["source"],
            unique=False,
        )


def downgrade() -> None:
    if _index_exists("ix_knowledge_embeddings_source"):
        op.drop_index(op.f("ix_knowledge_embeddings_source"), table_name="knowledge_embeddings")
    if _index_exists("ix_knowledge_embeddings_category"):
        op.drop_index(op.f("ix_knowledge_embeddings_category"), table_name="knowledge_embeddings")
    if _column_exists("knowledge_embeddings", "metadata"):
        op.drop_column("knowledge_embeddings", "metadata")
    if _column_exists("knowledge_embeddings", "title"):
        op.drop_column("knowledge_embeddings", "title")
    if _column_exists("knowledge_embeddings", "category"):
        op.drop_column("knowledge_embeddings", "category")
