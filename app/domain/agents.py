from enum import StrEnum


class AgentType(StrEnum):
    """Registered AI agent kinds. Add new values here to extend the router."""

    TAX = "tax"
    REAL_ESTATE = "real_estate"
    SALES = "sales"
    CERTIFICATION = "certification"
    GENERAL = "general"


class KnowledgeCategory(StrEnum):
    """Knowledge-base corpus tags used for RAG filtering."""

    TAX = "tax"
    SKOLKOVO = "skolkovo"
    MIK = "mik"
    REAL_ESTATE = "real_estate"
    BANKING = "banking"
    GENERAL = "general"
