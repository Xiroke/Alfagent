from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass

from app.ai.clients.openrouter import OpenRouterClient
from app.ai.prompts.templates import INTENT_CLASSIFIER_SYSTEM
from app.core.config import Settings, get_settings
from app.domain.agents import AgentType

logger = logging.getLogger(__name__)

_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)

# Lightweight keyword fallback when classifier JSON is invalid / LLM unavailable.
_KEYWORD_RULES: list[tuple[AgentType, tuple[str, ...]]] = [
    (
        AgentType.TAX,
        ("усн", "осн", "аусн", "налог", "ндс", "страхов", "нал. кодекс", "нк рф"),
    ),
    (
        AgentType.REAL_ESTATE,
        ("адрес", "аренд", "офис", "домашн", "юридическ", "помещен"),
    ),
    (
        AgentType.SALES,
        ("рко", "счёт", "счет", "банк", "эквайр", "бухгалтер", "кредит"),
    ),
    (
        AgentType.CERTIFICATION,
        ("сколков", "мик", "резидент", "инновац", "льгот"),
    ),
]


@dataclass(slots=True, frozen=True)
class IntentResult:
    agent: AgentType
    confidence: float
    rationale: str
    source: str  # "llm" | "heuristic" | "forced"


class IntentClassifier:
    """Smart router: LLM JSON classification with heuristic fallback."""

    def __init__(
        self,
        client: OpenRouterClient,
        settings: Settings | None = None,
    ) -> None:
        self._client = client
        self._settings = settings or get_settings()

    async def classify(
        self,
        message: str,
        *,
        forced_agent: AgentType | None = None,
    ) -> IntentResult:
        if forced_agent is not None:
            return IntentResult(
                agent=forced_agent,
                confidence=1.0,
                rationale="Agent forced by client",
                source="forced",
            )

        try:
            raw = await self._client.chat_completion(
                [
                    {"role": "system", "content": INTENT_CLASSIFIER_SYSTEM},
                    {"role": "user", "content": message},
                ],
                model=self._settings.openrouter_classifier_model,
                temperature=0.0,
                max_tokens=256,
                response_format={"type": "json_object"},
            )
            parsed = self._parse_json(raw)
            raw_agent = str(parsed.get("agent", "general")).lower()
            try:
                agent = AgentType(raw_agent)
            except ValueError:
                agent = AgentType.GENERAL
            confidence = float(parsed.get("confidence", 0.5))
            rationale = str(parsed.get("rationale", ""))
            return IntentResult(
                agent=agent,
                confidence=max(0.0, min(1.0, confidence)),
                rationale=rationale,
                source="llm",
            )
        except Exception as exc:  # noqa: BLE001 — fallback is intentional for router resilience
            logger.warning("Intent classifier LLM failed, using heuristics: %s", exc)
            return self._heuristic(message)

    @staticmethod
    def _parse_json(raw: str) -> dict[str, object]:
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            pass
        match = _JSON_RE.search(raw)
        if not match:
            raise ValueError("Classifier response is not JSON")
        data = json.loads(match.group(0))
        if not isinstance(data, dict):
            raise ValueError("Classifier JSON is not an object")
        return data

    @staticmethod
    def _heuristic(message: str) -> IntentResult:
        lowered = message.lower()
        best_agent = AgentType.GENERAL
        best_hits = 0
        for agent, keywords in _KEYWORD_RULES:
            hits = sum(1 for kw in keywords if kw in lowered)
            if hits > best_hits:
                best_hits = hits
                best_agent = agent
        confidence = min(0.85, 0.35 + 0.15 * best_hits) if best_hits else 0.25
        return IntentResult(
            agent=best_agent,
            confidence=confidence,
            rationale="Keyword heuristic fallback",
            source="heuristic",
        )
