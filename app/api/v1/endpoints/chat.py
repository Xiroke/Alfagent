from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from fastapi.responses import StreamingResponse

from app.ai.clients.openrouter import OpenRouterClient
from app.ai.orchestrator import MultiAgentOrchestrator
from app.ai.rag.embeddings import EmbeddingService
from app.api.deps import SessionDep, get_openrouter_client, get_openrouter_singleton
from app.core.exceptions import LLMConfigError
from app.infrastructure.database.session import get_session_factory
from app.schemas.chat import (
    ChatRequest,
    IntentClassifyRequest,
    IntentClassifyResponse,
    KnowledgeIngestRequest,
    KnowledgeIngestResponse,
    KnowledgeSearchHit,
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai-chat"])

OpenRouterDep = Annotated[OpenRouterClient, Depends(get_openrouter_client)]


def get_orchestrator(session: SessionDep, client: OpenRouterDep) -> MultiAgentOrchestrator:
    return MultiAgentOrchestrator(session, client)


OrchestratorDep = Annotated[MultiAgentOrchestrator, Depends(get_orchestrator)]


@router.post("/chat/stream", summary="SSE stream: router → RAG → agent reply")
async def chat_stream_sse(
    payload: ChatRequest,
    client: OpenRouterDep,
) -> StreamingResponse:
    """
    Server-Sent Events stream for frontend chat.

    Events: routing, rag, agent_start, token, error, done

    Session is opened inside the generator so it stays alive for the whole stream
    (FastAPI closes Depends() scopes when the endpoint returns StreamingResponse).
    """

    async def event_generator() -> AsyncIterator[str]:
        factory = get_session_factory()
        session = factory()
        try:
            orchestrator = MultiAgentOrchestrator(session, client)
            async for event in orchestrator.stream_reply(
                payload.message,
                forced_agent=payload.forced_agent,
                company_id=payload.company_id,
                company_profile=payload.company_profile,
            ):
                yield event.to_sse()
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.websocket("/chat/ws")
async def chat_stream_ws(websocket: WebSocket) -> None:
    """WebSocket alternative for bi-directional chat control."""
    await websocket.accept()
    factory = get_session_factory()
    client = get_openrouter_singleton()
    await client.start()

    try:
        while True:
            raw = await websocket.receive_json()
            try:
                payload = ChatRequest.model_validate(raw)
            except Exception as exc:  # noqa: BLE001
                await websocket.send_json(
                    {"event": "error", "message": f"Invalid payload: {exc}"}
                )
                continue

            async with factory() as session:
                orchestrator = MultiAgentOrchestrator(session, client)
                try:
                    async for event in orchestrator.stream_reply(
                        payload.message,
                        forced_agent=payload.forced_agent,
                        company_id=payload.company_id,
                        company_profile=payload.company_profile,
                    ):
                        await websocket.send_json({"event": event.event, **event.data})
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
    except WebSocketDisconnect:
        logger.info("AI chat websocket disconnected")
    except LLMConfigError as exc:
        await websocket.send_json({"event": "error", "message": exc.message, "code": exc.code})
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    except Exception as exc:  # noqa: BLE001
        logger.exception("AI chat websocket error")
        try:
            await websocket.send_json({"event": "error", "message": str(exc)})
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:  # noqa: BLE001
            pass


@router.post(
    "/intent/classify",
    response_model=IntentClassifyResponse,
    summary="Classify user intent without generating a full reply",
)
async def classify_intent(
    payload: IntentClassifyRequest,
    orchestrator: OrchestratorDep,
) -> IntentClassifyResponse:
    result = await orchestrator.classify_only(payload.message)
    return IntentClassifyResponse(
        agent=result.agent,
        confidence=result.confidence,
        rationale=result.rationale,
        source=result.source,
    )


@router.post(
    "/knowledge/ingest",
    response_model=KnowledgeIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a document into pgvector knowledge base",
)
async def ingest_knowledge(
    payload: KnowledgeIngestRequest,
    session: SessionDep,
    client: OpenRouterDep,
) -> KnowledgeIngestResponse:
    service = EmbeddingService(session, client)
    chunks = await service.ingest_document(
        source=payload.source,
        category=payload.category,
        content=payload.content,
        title=payload.title,
        metadata=payload.metadata,
    )
    return KnowledgeIngestResponse(
        chunks_created=len(chunks),
        chunk_ids=[c.id for c in chunks],
    )


@router.post(
    "/knowledge/search",
    response_model=KnowledgeSearchResponse,
    summary="Semantic search over knowledge base",
)
async def search_knowledge(
    payload: KnowledgeSearchRequest,
    session: SessionDep,
    client: OpenRouterDep,
) -> KnowledgeSearchResponse:
    service = EmbeddingService(session, client)
    categories = [payload.category.value] if payload.category else None
    hits = await service.search(payload.query, top_k=payload.top_k, categories=categories)
    return KnowledgeSearchResponse(
        hits=[
            KnowledgeSearchHit(
                id=h.id,
                source=h.source,
                category=h.category,
                title=h.title,
                content=h.content,
                score=h.score,
            )
            for h in hits
        ]
    )
