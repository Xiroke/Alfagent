import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import get_settings


async def main() -> None:
    engine = create_async_engine(str(get_settings().database_url))
    async with engine.connect() as conn:
        try:
            ver = await conn.execute(text("SELECT version_num FROM alembic_version"))
            print("alembic_version:", ver.fetchall())
        except Exception as exc:
            print("alembic_version: missing", exc)
            await conn.rollback()

        for table in ("users", "companies", "knowledge_embeddings"):
            result = await conn.execute(
                text("SELECT to_regclass(:name)"),
                {"name": f"public.{table}"},
            )
            print(table, result.scalar())

        enums = await conn.execute(
            text(
                "SELECT typname FROM pg_type "
                "WHERE typname IN ('user_role','company_registration_status','tax_regime','address_type')"
            )
        )
        print("enums:", [row[0] for row in enums.fetchall()])
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
