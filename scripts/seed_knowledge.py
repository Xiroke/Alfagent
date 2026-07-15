"""Seed sample RAG corpus (Сколково / МИК / НК / недвижимость / банк).

Usage:
  python -m scripts.seed_knowledge
Requires OPENROUTER_API_KEY and running Postgres with pgvector.
"""

from __future__ import annotations

import asyncio
import logging

from app.ai.clients.openrouter import OpenRouterClient
from app.ai.rag.embeddings import EmbeddingService
from app.core.config import get_settings
from app.domain.agents import KnowledgeCategory
from app.infrastructure.database.session import dispose_db, init_db, session_scope

logger = logging.getLogger(__name__)

SEED_DOCUMENTS: list[dict[str, str]] = [
    {
        "source": "nk_rf_usn",
        "category": KnowledgeCategory.TAX.value,
        "title": "УСН — базовые условия",
        "content": (
            "Упрощённая система налогообложения (УСН) применяется организациями при соблюдении "
            "лимитов по доходам и численности. Объекты: «доходы» или «доходы минус расходы». "
            "НДС на УСН как правило не уплачивается (с оговорками по новым правилам). "
            "Для выбора УСН уведомление подаётся в ФНС. Перед выбором сверяйте актуальные лимиты НК РФ."
        ),
    },
    {
        "source": "nk_rf_osn",
        "category": KnowledgeCategory.TAX.value,
        "title": "ОСН — общий режим",
        "content": (
            "Общая система налогообложения (ОСН) включает налог на прибыль, НДС, налог на имущество. "
            "Подходит при превышении лимитов спецрежимов, работе с крупными контрагентами-плательщиками НДС "
            "или сложных схемах. Требует полноценного бухгалтерского учёта и отчётности."
        ),
    },
    {
        "source": "nk_rf_ausn",
        "category": KnowledgeCategory.TAX.value,
        "title": "АУСН — автоматизированная УСН",
        "content": (
            "АУСН — экспериментальный спецрежим с автоматизированным расчётом налогов на стороне ФНС "
            "и банка. Есть ограничения по видам деятельности, сотрудникам и доходам. "
            "Удобен микробизнесу с расчётами через уполномоченный банк."
        ),
    },
    {
        "source": "legal_address_guide",
        "category": KnowledgeCategory.REAL_ESTATE.value,
        "title": "Юридический адрес: аренда vs домашний",
        "content": (
            "Юридический адрес ООО может быть: арендованное нежилое помещение или адрес проживания "
            "учредителя/руководителя (при возможности по региональной практике). "
            "Аренда офиса повышает доверие банков и контрагентов, но дороже. "
            "Домашний адрес дешевле, но возможны вопросы при открытии счёта и массовых адресах. "
            "Нужны согласие собственника и корректные документы на помещение."
        ),
    },
    {
        "source": "skolkovo_requirements",
        "category": KnowledgeCategory.SKOLKOVO.value,
        "title": "Требования Сколково (обзор)",
        "content": (
            "Резидент Сколково — компания с инновационной деятельностью в приоритетных направлениях "
            "(IT, биомед, энергоэффективность и др.). Требуются: заявка, описание проекта, команда, "
            "интеллектуальная собственность / R&D план. Льготы могут включать налоговые преференции "
            "и упрощения. Статус не гарантируется — решение за фондом/экспертизой."
        ),
    },
    {
        "source": "mik_requirements",
        "category": KnowledgeCategory.MIK.value,
        "title": "МИК — инновационный кластер (обзор)",
        "content": (
            "Московский инновационный кластер (МИК) поддерживает технологические компании: "
            "акселерация, сервисы, меры поддержки. Для участия обычно нужны: российское юрлицо, "
            "инновационный продукт/услуга, соответствие критериям программы. "
            "Уточняйте актуальный перечень мер на официальных ресурсах МИК."
        ),
    },
    {
        "source": "bank_rko_accounting",
        "category": KnowledgeCategory.BANKING.value,
        "title": "РКО и онлайн-бухгалтерия",
        "content": (
            "Расчётно-кассовое обслуживание (РКО) — базовый банковский продукт для ООО: счёт, платежи, "
            "эквайринг, зарплатный проект. Онлайн-бухгалтерия упрощает УСН/АУСН: акты, взносы, отчётность. "
            "Для стартапов часто выгодны пакеты «старт» с бесплатным периодом и интеграцией с банком."
        ),
    },
]


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    settings = get_settings()
    if not settings.openrouter_configured:
        raise SystemExit("Set OPENROUTER_API_KEY before seeding")

    init_db(settings)
    client = OpenRouterClient(settings)
    await client.start()
    try:
        async with session_scope() as session:
            service = EmbeddingService(session, client, settings)
            total = 0
            for doc in SEED_DOCUMENTS:
                chunks = await service.ingest_document(
                    source=doc["source"],
                    category=doc["category"],
                    content=doc["content"],
                    title=doc["title"],
                )
                total += len(chunks)
                logger.info("Seeded %s -> %s chunks", doc["source"], len(chunks))
            logger.info("Done. Total chunks: %s", total)
    finally:
        await client.close()
        await dispose_db()


if __name__ == "__main__":
    asyncio.run(main())
