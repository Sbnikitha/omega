from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"

    google_api_key: str = ""
    omega_model: str = "gemini-2.0-flash"

    redis_url: str = "redis://localhost:6379/0"
    omega_api_host: str = "0.0.0.0"
    omega_api_port: int = 8001
    omega_demo_mode: bool = False

    golden_dataset_name: str = "omega-incidents-golden-v1"
    confidence_threshold: float = 0.85

    @property
    def langfuse_enabled(self) -> bool:
        return bool(self.langfuse_public_key and self.langfuse_secret_key)

    @property
    def llm_enabled(self) -> bool:
        return bool(self.google_api_key) and not self.omega_demo_mode


@lru_cache
def get_settings() -> Settings:
    return Settings()
