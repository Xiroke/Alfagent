"""Cloud.ru Foundation Models HTTP client (OpenAI-compatible).

Uses HTTPX async against https://foundation-models.api.cloud.ru/v1
(chat completions + embeddings). Same surface as the former OpenRouter client
so agents / RAG / orchestrator stay unchanged.
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator, Sequence
from typing import Any

import httpx

from app.core.config import Settings, get_settings
from app.core.exceptions import LLMConfigError, LLMError, LLMTimeoutError

logger = logging.getLogger(__name__)

ChatMessage = dict[str, str]


class LLMClient:
    """Async Cloud.ru Foundation Models client with retries and streaming."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._client: httpx.AsyncClient | None = None

    def _ensure_configured(self) -> None:
        if not self._settings.llm_configured:
            raise LLMConfigError(
                "Foundation Models API key is not configured (set API_KEY)",
            )

    async def __aenter__(self) -> LLMClient:
        await self.start()
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.close()

    async def start(self) -> None:
        if self._client is not None:
            return
        timeout = httpx.Timeout(
            self._settings.llm_timeout_seconds,
            connect=self._settings.llm_connect_timeout_seconds,
        )
        limits = httpx.Limits(max_connections=50, max_keepalive_connections=20)
        self._client = httpx.AsyncClient(
            base_url=self._settings.llm_base_url.rstrip("/"),
            timeout=timeout,
            limits=limits,
            headers=self._default_headers(),
        )

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    def _default_headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self._settings.api_key:
            headers["Authorization"] = f"Bearer {self._settings.api_key}"
        return headers

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError("LLMClient is not started. Call await client.start().")
        return self._client

    async def _request_with_retry(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
    ) -> httpx.Response:
        self._ensure_configured()
        client = self._get_client()
        attempts = self._settings.llm_max_retries + 1
        last_error: Exception | None = None

        for attempt in range(1, attempts + 1):
            try:
                response = await client.request(method, path, json=json_body)
                if response.status_code in {429, 500, 502, 503, 504} and attempt < attempts:
                    await asyncio.sleep(self._settings.llm_retry_backoff_seconds * attempt)
                    continue
                if response.status_code >= 400:
                    raise LLMError(
                        f"Foundation Models HTTP {response.status_code}: {response.text[:500]}",
                        details={"status_code": response.status_code},
                    )
                return response
            except httpx.TimeoutException as exc:
                last_error = exc
                if attempt >= attempts:
                    raise LLMTimeoutError("Foundation Models request timed out") from exc
                await asyncio.sleep(self._settings.llm_retry_backoff_seconds * attempt)
            except httpx.TransportError as exc:
                last_error = exc
                if attempt >= attempts:
                    raise LLMError("Foundation Models transport error") from exc
                await asyncio.sleep(self._settings.llm_retry_backoff_seconds * attempt)

        raise LLMError("Foundation Models request failed after retries") from last_error

    def _chat_body(
        self,
        messages: Sequence[ChatMessage],
        *,
        model: str | None,
        temperature: float | None,
        max_tokens: int | None,
        stream: bool,
        response_format: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "model": model or self._settings.llm_chat_model,
            "messages": list(messages),
            "temperature": (
                self._settings.llm_temperature if temperature is None else temperature
            ),
            "top_p": self._settings.llm_top_p,
            "presence_penalty": self._settings.llm_presence_penalty,
            "stream": stream,
        }
        tokens = self._settings.llm_max_tokens if max_tokens is None else max_tokens
        if tokens is not None:
            body["max_tokens"] = tokens
        if response_format is not None:
            body["response_format"] = response_format
        return body

    async def chat_completion(
        self,
        messages: Sequence[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        response_format: dict[str, Any] | None = None,
    ) -> str:
        body = self._chat_body(
            messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
            response_format=response_format,
        )

        try:
            response = await self._request_with_retry(
                "POST",
                "/chat/completions",
                json_body=body,
            )
        except LLMError as exc:
            # Some Cloud.ru models reject response_format — retry without it.
            if response_format is not None and "response_format" in str(exc).lower():
                body.pop("response_format", None)
                response = await self._request_with_retry(
                    "POST",
                    "/chat/completions",
                    json_body=body,
                )
            elif response_format is not None and getattr(exc, "details", {}).get(
                "status_code"
            ) in {400, 422}:
                body.pop("response_format", None)
                response = await self._request_with_retry(
                    "POST",
                    "/chat/completions",
                    json_body=body,
                )
            else:
                raise

        payload = response.json()
        try:
            content = payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise LLMError(
                "Unexpected Foundation Models chat response shape",
                details=payload if isinstance(payload, dict) else None,
            ) from exc
        if not isinstance(content, str):
            raise LLMError("Foundation Models returned non-text content")
        return content

    async def stream_chat_completion(
        self,
        messages: Sequence[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        """Yield text deltas from Foundation Models SSE stream."""
        self._ensure_configured()
        client = self._get_client()
        body = self._chat_body(
            messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        attempts = self._settings.llm_max_retries + 1
        for attempt in range(1, attempts + 1):
            try:
                async with client.stream("POST", "/chat/completions", json=body) as response:
                    if response.status_code >= 400:
                        text = (await response.aread()).decode("utf-8", errors="replace")
                        if response.status_code in {429, 500, 502, 503, 504} and attempt < attempts:
                            await asyncio.sleep(
                                self._settings.llm_retry_backoff_seconds * attempt
                            )
                            continue
                        raise LLMError(
                            f"Foundation Models stream HTTP {response.status_code}: {text[:500]}",
                            details={"status_code": response.status_code},
                        )
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if data == "[DONE]":
                            return
                        try:
                            chunk = json.loads(data)
                        except json.JSONDecodeError:
                            logger.debug("Skipping malformed SSE chunk: %s", data[:200])
                            continue
                        choices = chunk.get("choices") or []
                        if not choices:
                            continue
                        delta = choices[0].get("delta") or {}
                        content = delta.get("content")
                        if content:
                            yield content
                return
            except httpx.TimeoutException as exc:
                if attempt >= attempts:
                    raise LLMTimeoutError("Foundation Models stream timed out") from exc
                await asyncio.sleep(self._settings.llm_retry_backoff_seconds * attempt)
            except httpx.TransportError as exc:
                if attempt >= attempts:
                    raise LLMError("Foundation Models stream transport error") from exc
                await asyncio.sleep(self._settings.llm_retry_backoff_seconds * attempt)

    async def embed(self, texts: Sequence[str], *, model: str | None = None) -> list[list[float]]:
        if not texts:
            return []
        body = {
            "model": model or self._settings.llm_embedding_model,
            "input": list(texts),
        }
        response = await self._request_with_retry("POST", "/embeddings", json_body=body)
        payload = response.json()
        try:
            items = sorted(payload["data"], key=lambda row: row["index"])
            vectors = [list(map(float, row["embedding"])) for row in items]
        except (KeyError, TypeError, ValueError) as exc:
            raise LLMError(
                "Unexpected Foundation Models embeddings response",
                details=payload if isinstance(payload, dict) else None,
            ) from exc
        return vectors

    async def embed_one(self, text: str, *, model: str | None = None) -> list[float]:
        vectors = await self.embed([text], model=model)
        if not vectors:
            raise LLMError("Empty embedding response")
        return vectors[0]


# Backward-compatible alias
OpenRouterClient = LLMClient
