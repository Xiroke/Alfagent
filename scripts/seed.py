"""Seed RAG knowledge base with Alfa-Bank Q&A pairs.

Usage:
  python -m scripts.seed

Requires OPENROUTER_API_KEY and running Postgres with pgvector.
Run migrations first: alembic upgrade head
"""

from __future__ import annotations

import asyncio
import logging

from app.ai.clients.openrouter import OpenRouterClient
from app.core.config import get_settings
from app.core.exceptions import LLMConfigError, LLMError
from app.infrastructure.database.session import dispose_db, init_db, session_scope
from app.infrastructure.repositories.knowledge_document import KnowledgeDocumentRepository

logger = logging.getLogger(__name__)

SEED_QA: list[dict[str, str]] = [
    {
        "question": "В чем разница между УСН и АУСН?",
        "answer": (
            "УСН (упрощенка) требует ведения бухгалтерии и сдачи деклараций. "
            "АУСН (автоматизированная упрощенка) освобождает от отчетности и взносов за сотрудников, "
            "налог рассчитывается автоматически по данным кассы и банка. "
            "Ставка АУСН чуть выше (8% доходы или 20% доходы минус расходы), "
            "но вы экономите на бухгалтере. Идеально для микробизнеса."
        ),
    },
    {
        "question": "Можно ли зарегистрировать ООО на домашний адрес?",
        "answer": (
            "Да, закон позволяет зарегистрировать ООО на домашний адрес учредителя "
            "(владеющего более 50% доли) или генерального директора. "
            "Для этого потребуется согласие всех собственников квартиры. "
            "Это полностью легально и избавляет от необходимости покупать юридический адрес."
        ),
    },
    {
        "question": "Как зарегистрировать ООО с несколькими учредителями онлайн?",
        "answer": (
            "Для онлайн-регистрации ООО с несколькими собственниками потребуется "
            "усиленная квалифицированная электронная подпись (УКЭП) для каждого учредителя. "
            "Мы сформируем пакет документов (решение, устав), каждый участник подпишет его "
            "своей УКЭП в нашем сервисе, и мы отправим всё в ФНС. Без визитов в налоговую."
        ),
    },
    {
        "question": "Зачем мне открывать счет в Альфа-Банке на этапе регистрации?",
        "answer": (
            "Открывая счет в Альфа-Банке одновременно с регистрацией ООО, "
            "вы получаете бесплатную онлайн-бухгалтерию, которая интегрирована с ФНС. "
            "Налоги будут рассчитываться автоматически. "
            "Кроме того, реквизиты счета вы получите сразу после внесения ООО в ЕГРЮЛ — "
            "можно сразу принимать платежи от клиентов."
        ),
    },
    {
        "question": "Какие основные требования для статуса участника Сколково или МИК?",
        "answer": (
            "Для Сколково: проект должен обладать технологической новизной, "
            "иметь потенциал коммерциализации и команду разработчиков. "
            "Обязательно наличие юрлица (ООО). "
            "Для Московского инновационного кластера (МИК): регистрация в Москве, "
            "статус юрлица или ИП, ведение деятельности в сфере науки, промышленности или ИТ. "
            "Наш сервис поможет подготовить устав с учетом этих требований."
        ),
    },
]


def format_content(question: str, answer: str) -> str:
    return f"Вопрос: {question}\n\nОтвет: {answer}"


async def seed_knowledge_base() -> None:
    settings = get_settings()
    if not settings.openrouter_configured:
        raise LLMConfigError(
            "OpenRouter API key is not configured (set OPENROUTER_API_KEY)",
        )

    init_db(settings)
    client = OpenRouterClient(settings)
    await client.start()

    inserted = 0
    skipped = 0

    try:
        async with session_scope() as session:
            repo = KnowledgeDocumentRepository(session)

            pending: list[tuple[str, str]] = []
            for item in SEED_QA:
                content = format_content(item["question"], item["answer"])
                if await repo.exists_by_content(content):
                    logger.info("Skip (exists): %s", item["question"])
                    skipped += 1
                    continue
                pending.append((content, item["question"]))

            if not pending:
                logger.info(
                    "Knowledge base already seeded (%s records). Nothing to insert.",
                    len(SEED_QA),
                )
                return

            texts = [content for content, _ in pending]
            try:
                vectors = await client.embed(texts)
            except LLMError:
                logger.exception("Failed to generate embeddings via OpenRouter")
                raise

            if len(vectors) != len(pending):
                raise LLMError(
                    f"Embedding count mismatch: expected {len(pending)}, got {len(vectors)}",
                )

            for (content, question), vector in zip(pending, vectors, strict=True):
                await repo.create(content=content, embedding=vector)
                inserted += 1
                logger.info("Inserted: %s", question)

            logger.info("Done. Inserted: %s, skipped: %s", inserted, skipped)
    finally:
        await client.close()
        await dispose_db()


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    try:
        await seed_knowledge_base()
    except LLMConfigError as exc:
        raise SystemExit(str(exc)) from exc
    except LLMError as exc:
        logger.error("Seeding aborted: %s", exc)
        raise SystemExit(1) from exc
    except Exception:
        logger.exception("Unexpected error during seeding")
        raise SystemExit(1) from None


if __name__ == "__main__":
    asyncio.run(main())
