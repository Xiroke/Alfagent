from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.api.deps import start_llm_client, stop_llm_client
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.infrastructure.database.session import dispose_db, get_session_factory, init_db


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    init_db(settings)
    factory = get_session_factory()
    async with factory() as session:
        await session.execute(text("SELECT 1"))

    llm = await start_llm_client()
    app.state.llm = llm
    yield
    await stop_llm_client()
    await dispose_db()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )
    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
