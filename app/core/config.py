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

    # Cloud.ru Foundation Models (OpenAI-compatible)
    # Env: API_KEY (preferred) or LLM_API_KEY
    api_key: str = Field(default="", description="Cloud.ru Foundation Models API key")
    llm_base_url: str = "https://foundation-models.api.cloud.ru/v1"
    llm_chat_model: str = "ai-sage/GigaChat3-10B-A1.8B"
    llm_classifier_model: str = "ai-sage/GigaChat3-10B-A1.8B"
    llm_embedding_model: str = "Qwen/Qwen3-Embedding-0.6B"
    llm_timeout_seconds: float = Field(default=60.0, ge=5.0)
    llm_connect_timeout_seconds: float = Field(default=10.0, ge=1.0)
    llm_max_retries: int = Field(default=3, ge=0, le=8)
    llm_retry_backoff_seconds: float = Field(default=0.75, ge=0.1)
    llm_temperature: float = Field(default=0.5, ge=0.0, le=2.0)
    llm_top_p: float = Field(default=0.95, ge=0.0, le=1.0)
    llm_presence_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    llm_max_tokens: int = Field(default=2500, ge=1, le=16_000)

    # RAG — Qwen3-Embedding-0.6B outputs 1024 dims
    rag_top_k: int = Field(default=5, ge=1, le=20)
    rag_similarity_threshold: float = Field(default=0.35, ge=0.0, le=1.0)
    embedding_dimensions: int = Field(default=1024, ge=256, le=3072)

    # Document upload for wizard prefill
    max_upload_bytes: int = Field(default=10 * 1024 * 1024, ge=1024, le=50 * 1024 * 1024)

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
    def llm_configured(self) -> bool:
        return bool(self.api_key.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
