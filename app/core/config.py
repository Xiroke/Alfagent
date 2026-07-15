from functools import lru_cache

from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Alfagent"
    app_env: str = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    database_url: PostgresDsn = Field(
        ...,
        description="Async SQLAlchemy URL, e.g. postgresql+asyncpg://user:pass@host:5432/db",
    )
    db_pool_size: int = Field(default=20, ge=1, le=100)
    db_max_overflow: int = Field(default=10, ge=0, le=100)
    db_pool_timeout: int = Field(default=30, ge=1)
    db_pool_recycle: int = Field(default=1800, ge=60)
    db_echo: bool = False
    db_pool_pre_ping: bool = True

    secret_key: str = Field(..., min_length=16)
    access_token_expire_minutes: int = 60

    # OpenRouter (OpenAI-compatible gateway)
    openrouter_api_key: str = Field(default="", description="Bearer token for OpenRouter")
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_chat_model: str = "openai/gpt-4o-mini"
    openrouter_classifier_model: str = "openai/gpt-4o-mini"
    openrouter_embedding_model: str = "openai/text-embedding-3-small"
    openrouter_http_referer: str = "https://alfagent.local"
    openrouter_app_title: str = "Alfagent"
    openrouter_timeout_seconds: float = Field(default=60.0, ge=5.0)
    openrouter_connect_timeout_seconds: float = Field(default=10.0, ge=1.0)
    openrouter_max_retries: int = Field(default=3, ge=0, le=8)
    openrouter_retry_backoff_seconds: float = Field(default=0.75, ge=0.1)

    # RAG
    rag_top_k: int = Field(default=5, ge=1, le=20)
    rag_similarity_threshold: float = Field(default=0.35, ge=0.0, le=1.0)
    embedding_dimensions: int = Field(default=1536, ge=256, le=3072)

    @field_validator("database_url", mode="before")
    @classmethod
    def ensure_asyncpg_driver(cls, value: object) -> object:
        if isinstance(value, str) and value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def openrouter_configured(self) -> bool:
        return bool(self.openrouter_api_key.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
