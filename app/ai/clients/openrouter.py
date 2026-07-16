"""Re-export LLM client (Cloud.ru Foundation Models).

Historically named openrouter; kept for import compatibility.
"""

from app.ai.clients.llm import ChatMessage, LLMClient, OpenRouterClient

__all__ = ["ChatMessage", "LLMClient", "OpenRouterClient"]
