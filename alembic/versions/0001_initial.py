"""initial schema with pgvector

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-15 11:30:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# create_type=False: enums are created explicitly below (avoids DuplicateObject on retry).
user_role = postgresql.ENUM(
    "owner", "admin", "applicant", name="user_role", create_type=False
)
company_registration_status = postgresql.ENUM(
    "draft",
    "submitted",
    "documents_review",
    "pending_bank",
    "registered",
    "rejected",
    "cancelled",
    name="company_registration_status",
    create_type=False,
)
tax_regime = postgresql.ENUM("osn", "usn", "ausn", name="tax_regime", create_type=False)
address_type = postgresql.ENUM("rental", "home", name="address_type", create_type=False)


def _create_enum_if_missing(name: str, values: str) -> None:
    op.execute(
        f"""
        DO $$ BEGIN
            CREATE TYPE {name} AS ENUM ({values});
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    _create_enum_if_missing("user_role", "'owner', 'admin', 'applicant'")
    _create_enum_if_missing(
        "company_registration_status",
        "'draft', 'submitted', 'documents_review', 'pending_bank', "
        "'registered', 'rejected', 'cancelled'",
    )
    _create_enum_if_missing("tax_regime", "'osn', 'usn', 'ausn'")
    _create_enum_if_missing("address_type", "'rental', 'home'")

    if not _table_exists("users"):
        op.create_table(
            "users",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("email", sa.String(length=320), nullable=False),
            sa.Column("phone", sa.String(length=32), nullable=True),
            sa.Column("full_name", sa.String(length=255), nullable=False),
            sa.Column("inn", sa.String(length=12), nullable=True),
            sa.Column("role", user_role, server_default="applicant", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
            sa.UniqueConstraint("email", name=op.f("uq_users_email")),
            sa.UniqueConstraint("inn", name=op.f("uq_users_inn")),
            sa.UniqueConstraint("phone", name=op.f("uq_users_phone")),
        )
        op.create_index(op.f("ix_users_email"), "users", ["email"], unique=False)
        op.create_index(op.f("ix_users_inn"), "users", ["inn"], unique=False)

    if not _table_exists("addresses"):
        op.create_table(
            "addresses",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("address_type", address_type, nullable=False),
            sa.Column("region", sa.String(length=128), nullable=False),
            sa.Column("city", sa.String(length=128), nullable=False),
            sa.Column("street", sa.String(length=255), nullable=False),
            sa.Column("building", sa.String(length=64), nullable=False),
            sa.Column("apartment", sa.String(length=64), nullable=True),
            sa.Column("postal_code", sa.String(length=16), nullable=False),
            sa.Column("fias_id", sa.String(length=36), nullable=True),
            sa.Column("full_address", sa.String(length=512), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_addresses")),
        )
        op.create_index(op.f("ix_addresses_fias_id"), "addresses", ["fias_id"], unique=False)

    if not _table_exists("companies"):
        op.create_table(
            "companies",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("short_name", sa.String(length=128), nullable=True),
            sa.Column("ogrn", sa.String(length=13), nullable=True),
            sa.Column("inn", sa.String(length=10), nullable=True),
            sa.Column("kpp", sa.String(length=9), nullable=True),
            sa.Column(
                "registration_status",
                company_registration_status,
                server_default="draft",
                nullable=False,
            ),
            sa.Column("tax_regime", tax_regime, server_default="usn", nullable=False),
            sa.Column("authorized_capital", sa.Numeric(precision=14, scale=2), nullable=False),
            sa.Column("applicant_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("legal_address_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.CheckConstraint(
                "authorized_capital > 0",
                name=op.f("ck_companies_authorized_capital_positive"),
            ),
            sa.ForeignKeyConstraint(
                ["applicant_id"],
                ["users.id"],
                name=op.f("fk_companies_applicant_id_users"),
                ondelete="RESTRICT",
            ),
            sa.ForeignKeyConstraint(
                ["legal_address_id"],
                ["addresses.id"],
                name=op.f("fk_companies_legal_address_id_addresses"),
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_companies")),
            sa.UniqueConstraint("inn", name=op.f("uq_companies_inn")),
            sa.UniqueConstraint("legal_address_id", name=op.f("uq_companies_legal_address_id")),
            sa.UniqueConstraint("ogrn", name=op.f("uq_companies_ogrn")),
        )
        op.create_index(
            op.f("ix_companies_applicant_id"), "companies", ["applicant_id"], unique=False
        )
        op.create_index(op.f("ix_companies_inn"), "companies", ["inn"], unique=False)
        op.create_index(op.f("ix_companies_ogrn"), "companies", ["ogrn"], unique=False)
        op.create_index(
            op.f("ix_companies_registration_status"),
            "companies",
            ["registration_status"],
            unique=False,
        )

    if not _table_exists("founder_links"):
        op.create_table(
            "founder_links",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("ownership_share", sa.Numeric(precision=5, scale=2), nullable=False),
            sa.Column("is_director", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("contribution_amount", sa.Numeric(precision=14, scale=2), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.CheckConstraint(
                "ownership_share > 0 AND ownership_share <= 100",
                name=op.f("ck_founder_links_ownership_share_range"),
            ),
            sa.ForeignKeyConstraint(
                ["company_id"],
                ["companies.id"],
                name=op.f("fk_founder_links_company_id_companies"),
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.id"],
                name=op.f("fk_founder_links_user_id_users"),
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id", name=op.f("pk_founder_links")),
            sa.UniqueConstraint("user_id", "company_id", name="uq_founder_user_company"),
        )
        op.create_index(
            op.f("ix_founder_links_company_id"),
            "founder_links",
            ["company_id"],
            unique=False,
        )
        op.create_index(
            op.f("ix_founder_links_user_id"), "founder_links", ["user_id"], unique=False
        )

    if not _table_exists("knowledge_embeddings"):
        op.execute(
            """
            CREATE TABLE knowledge_embeddings (
                id UUID PRIMARY KEY,
                source VARCHAR(128) NOT NULL,
                content TEXT NOT NULL,
                embedding vector(1536),
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS knowledge_embeddings")
    if _table_exists("founder_links"):
        op.drop_index(op.f("ix_founder_links_user_id"), table_name="founder_links")
        op.drop_index(op.f("ix_founder_links_company_id"), table_name="founder_links")
        op.drop_table("founder_links")
    if _table_exists("companies"):
        op.drop_index(op.f("ix_companies_registration_status"), table_name="companies")
        op.drop_index(op.f("ix_companies_ogrn"), table_name="companies")
        op.drop_index(op.f("ix_companies_inn"), table_name="companies")
        op.drop_index(op.f("ix_companies_applicant_id"), table_name="companies")
        op.drop_table("companies")
    if _table_exists("addresses"):
        op.drop_index(op.f("ix_addresses_fias_id"), table_name="addresses")
        op.drop_table("addresses")
    if _table_exists("users"):
        op.drop_index(op.f("ix_users_inn"), table_name="users")
        op.drop_index(op.f("ix_users_email"), table_name="users")
        op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS address_type")
    op.execute("DROP TYPE IF EXISTS tax_regime")
    op.execute("DROP TYPE IF EXISTS company_registration_status")
    op.execute("DROP TYPE IF EXISTS user_role")
