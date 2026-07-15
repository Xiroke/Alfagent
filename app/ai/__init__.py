"""
Multi-agent AI module (OpenRouter + RAG).

Orchestration choice: raw HTTPX (see app.ai.clients.openrouter).
LangChain is intentionally not used — keep the stack thin and streaming-first.
"""

from app.ai.orchestrator import ChatStreamEvent, MultiAgentOrchestrator

__all__ = ["ChatStreamEvent", "MultiAgentOrchestrator"]
