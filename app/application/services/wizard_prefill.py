"""LLM-based extraction of registration wizard fields from document text."""

from __future__ import annotations

import json
import logging
import re
from decimal import Decimal
from typing import Any

from app.ai.clients.llm import LLMClient
from app.core.config import Settings, get_settings
from app.core.exceptions import LLMError, ValidationAppError
from app.domain.enums import AddressType, TaxRegime
from app.schemas.wizard_prefill import (
    PrefillAddressOut,
    PrefillCompanyOut,
    PrefillFounderOut,
    PrefillTaxOut,
    WizardPrefillResponse,
)

logger = logging.getLogger(__name__)

_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)

WIZARD_PREFILL_SYSTEM = """
Ты — ассистент платформы регистрации ООО Alfagent.
По тексту документа (устав, анкета, договор, Excel-таблица учредителей и т.п.)
извлеки данные для мастера регистрации.

Верни ТОЛЬКО валидный JSON без markdown и комментариев:
{
  "company": {
    "name": "полное наименование ООО",
    "short_name": "краткое наименование или пустая строка",
    "okved_codes": ["62.01"],
    "authorized_capital": 10000
  },
  "founders": [
    {
      "full_name": "ФИО",
      "email": "",
      "phone": "",
      "inn": "12 цифр или пусто",
      "ownership_share": 100,
      "is_director": true
    }
  ],
  "address": {
    "address_type": "rental или home",
    "region": "",
    "city": "",
    "street": "",
    "building": "",
    "apartment": "",
    "postal_code": "6 цифр",
    "full_address": "собранный адрес одной строкой",
    "founder_full_name_for_home": "ФИО учредителя для домашнего адреса или null"
  },
  "tax": {
    "tax_regime": "osn, usn или ausn"
  },
  "model_notes": "кратко: что удалось извлечь, что не найдено"
}

Правила:
- Не выдумывай данные: если поля нет в тексте — пустая строка, 0 или null.
- okved_codes — только коды формата NN.NN или NN.NN.NN.
- Сумма ownership_share по учредителям должна быть 100; ровно один is_director=true.
- ИНН физлица — 12 цифр без пробелов.
- authorized_capital — число в рублях (минимум 10000 для ООО, если не указано иное).
- address_type=home только если явно домашний/прописка учредителя.
""".strip()


class WizardPrefillService:
    def __init__(
        self,
        client: LLMClient,
        settings: Settings | None = None,
    ) -> None:
        self._client = client
        self._settings = settings or get_settings()

    async def prefill_from_text(
        self,
        text: str,
        *,
        source_filename: str,
    ) -> WizardPrefillResponse:
        clipped = text[:12_000]
        user_prompt = (
            f"Имя файла: {source_filename}\n\n"
            f"### Текст документа\n{clipped}\n\n"
            "Извлеки структуру для регистрации ООО."
        )
        try:
            raw = await self._client.chat_completion(
                [
                    {"role": "system", "content": WIZARD_PREFILL_SYSTEM},
                    {"role": "user", "content": user_prompt},
                ],
                model=self._settings.llm_chat_model,
                temperature=0.1,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
        except LLMError:
            raise
        except Exception as exc:
            raise LLMError(f"Не удалось разобрать документ: {exc}") from exc

        parsed = self._parse_json(raw)
        return self._normalize(parsed, extracted_chars=len(text), source_filename=source_filename)

    @staticmethod
    def _parse_json(raw: str) -> dict[str, Any]:
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            pass
        match = _JSON_RE.search(raw)
        if not match:
            raise ValidationAppError("Модель вернула невалидный JSON")
        data = json.loads(match.group(0))
        if not isinstance(data, dict):
            raise ValidationAppError("Ответ модели не является JSON-объектом")
        return data

    def _normalize(
        self,
        data: dict[str, Any],
        *,
        extracted_chars: int,
        source_filename: str,
    ) -> WizardPrefillResponse:
        company_raw = data.get("company") if isinstance(data.get("company"), dict) else {}
        address_raw = data.get("address") if isinstance(data.get("address"), dict) else {}
        tax_raw = data.get("tax") if isinstance(data.get("tax"), dict) else {}
        founders_raw = data.get("founders") if isinstance(data.get("founders"), list) else []

        okved_codes = self._clean_okved(company_raw.get("okved_codes"))
        company = PrefillCompanyOut(
            name=str(company_raw.get("name", "")).strip(),
            short_name=str(company_raw.get("short_name", "")).strip(),
            okved_codes=okved_codes,
            authorized_capital=self._to_float(
                company_raw.get("authorized_capital"),
                default=10_000,
            ),
        )

        founders = [self._normalize_founder(item) for item in founders_raw if isinstance(item, dict)]
        if not founders:
            founders = [PrefillFounderOut(is_director=True, ownership_share=100)]
        founders = self._rebalance_founders(founders)

        address = PrefillAddressOut(
            address_type=address_raw.get("address_type", AddressType.RENTAL),
            region=str(address_raw.get("region", "")).strip(),
            city=str(address_raw.get("city", "")).strip(),
            street=str(address_raw.get("street", "")).strip(),
            building=str(address_raw.get("building", "")).strip(),
            apartment=str(address_raw.get("apartment", "")).strip(),
            postal_code=self._digits_only(address_raw.get("postal_code"), length=6),
            full_address=str(address_raw.get("full_address", "")).strip(),
            founder_full_name_for_home=(
                str(address_raw.get("founder_full_name_for_home")).strip()
                if address_raw.get("founder_full_name_for_home")
                else None
            ),
        )
        if not address.full_address:
            address = address.model_copy(
                update={"full_address": self._compose_address(address)},
            )

        tax = PrefillTaxOut(tax_regime=tax_raw.get("tax_regime", TaxRegime.USN))

        notes = data.get("model_notes")
        model_notes = str(notes).strip() if notes else None

        return WizardPrefillResponse(
            company=company,
            founders=founders,
            address=address,
            tax=tax,
            extracted_chars=extracted_chars,
            source_filename=source_filename,
            model_notes=model_notes,
        )

    @staticmethod
    def _normalize_founder(raw: dict[str, Any]) -> PrefillFounderOut:
        inn = WizardPrefillService._digits_only(raw.get("inn"), length=12)
        return PrefillFounderOut(
            full_name=str(raw.get("full_name", "")).strip(),
            email=str(raw.get("email", "")).strip(),
            phone=str(raw.get("phone", "")).strip(),
            inn=inn,
            ownership_share=WizardPrefillService._to_float(raw.get("ownership_share"), default=0),
            is_director=bool(raw.get("is_director", False)),
        )

    @staticmethod
    def _rebalance_founders(founders: list[PrefillFounderOut]) -> list[PrefillFounderOut]:
        if len(founders) == 1:
            return [
                founders[0].model_copy(
                    update={"ownership_share": 100.0, "is_director": True},
                ),
            ]

        total = sum(f.ownership_share for f in founders)
        if total <= 0:
            share = round(100 / len(founders), 2)
            founders = [f.model_copy(update={"ownership_share": share}) for f in founders]

        directors = [i for i, f in enumerate(founders) if f.is_director]
        if len(directors) != 1:
            founders = [
                f.model_copy(update={"is_director": i == 0}) for i, f in enumerate(founders)
            ]
        return founders

    @staticmethod
    def _clean_okved(value: object) -> list[str]:
        if not isinstance(value, list):
            return []
        pattern = re.compile(r"^\d{2}(\.\d{1,2}){0,2}$")
        codes: list[str] = []
        for item in value:
            code = str(item).strip()
            if pattern.match(code) and code not in codes:
                codes.append(code)
        return codes

    @staticmethod
    def _digits_only(value: object, *, length: int) -> str:
        digits = re.sub(r"\D", "", str(value or ""))
        return digits[:length] if len(digits) >= length else digits

    @staticmethod
    def _to_float(value: object, *, default: float) -> float:
        if value is None or value == "":
            return default
        try:
            return float(Decimal(str(value).replace(" ", "").replace(",", ".")))
        except Exception:
            return default

    @staticmethod
    def _compose_address(address: PrefillAddressOut) -> str:
        parts = [
            address.postal_code,
            address.region,
            address.city,
            address.street,
            f"д. {address.building}" if address.building else "",
            f"кв. {address.apartment}" if address.apartment else "",
        ]
        return ", ".join(p for p in parts if p)
