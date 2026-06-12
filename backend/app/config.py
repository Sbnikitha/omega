from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"

    google_api_key: str = ""
    omega_model: str = "gemini-2.0-flash"
    openai_api_key: str = ""

    # Pioneer inference (structured extraction + optional LLM backend)
    pioneer_api_key: str = ""
    pioneer_model_id: str = "fastino/gliner2-base-v1"
    pioneer_chat_model: str = "gpt-4o-mini"
    pioneer_as_llm: bool = False

    # Senso cited.md publish
    senso_api_key: str = ""
    senso_base_url: str = "https://apiv2.senso.ai/api/v1"
    senso_geo_question_id: str = ""

    # Composio open-web tools
    composio_api_key: str = ""

    # Airbyte Agent Engine
    airbyte_client_id: str = ""
    airbyte_client_secret: str = ""
    airbyte_access_token: str = ""
    airbyte_connector_id: str = ""
    airbyte_workspace: str = "default"
    airbyte_rss_url: str = "https://www.githubstatus.com/history.rss"

    # TrueFoundry deploy
    tfy_host: str = ""
    tfy_api_key: str = ""

    # Guild + Render flags
    guild_integration_enabled: bool = True
    render_deploy_ready: bool = True
    frontend_url: str = ""

    redis_url: str = "redis://localhost:6379/0"
    omega_api_host: str = "0.0.0.0"
    omega_api_port: int = 8001
    omega_demo_mode: bool = False

    golden_dataset_name: str = "omega-incidents-golden-v1"
    confidence_threshold: float = 0.85

    # Cost / manual work savings model (USD, minutes)
    omega_engineer_hourly_usd: float = 150.0
    omega_bridge_engineers: int = 3
    omega_llm_cost_per_incident: float = 0.024
    omega_pipeline_minutes: float = 4.0
    omega_diagnosis_reduction_pct: float = 0.45
    omega_diagnosis_reduction_cap_min: float = 90.0

    # ClickHouse columnar incident store (set OMEGA_CLICKHOUSE_ENABLED=true)
    clickhouse_enabled: bool = Field(default=False, validation_alias="OMEGA_CLICKHOUSE_ENABLED")
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_user: str = "default"
    clickhouse_password: str = ""
    clickhouse_database: str = "default"

    # x402 / agent payment rails (402 until X-402-Payment header)
    omega_x402_enabled: bool = True
    omega_x402_price_usd: float = 0.02
    omega_x402_pay_to: str = "omega-agent@agentic.market"
    omega_x402_demo_token: str = "demo-paid"

    @property
    def x402_enabled(self) -> bool:
        return self.omega_x402_enabled

    @property
    def x402_price_usd(self) -> float:
        return self.omega_x402_price_usd

    @property
    def x402_pay_to(self) -> str:
        return self.omega_x402_pay_to

    @property
    def x402_demo_token(self) -> str:
        return self.omega_x402_demo_token

    @property
    def x402_accepted_tokens(self) -> set[str]:
        return {self.omega_x402_demo_token, "x402-receipt-demo", "cdp-paid", "mpp-paid"}

    @property
    def langfuse_enabled(self) -> bool:
        return bool(self.langfuse_public_key and self.langfuse_secret_key)

    @property
    def llm_enabled(self) -> bool:
        if self.omega_demo_mode:
            return False
        if self.pioneer_as_llm and self.pioneer_api_key:
            return True
        return bool(self.google_api_key or self.openai_api_key)

    @property
    def llm_provider(self) -> str:
        if self.omega_demo_mode:
            return "demo"
        if self.pioneer_as_llm and self.pioneer_api_key:
            return "pioneer"
        if self.google_api_key:
            return "gemini"
        if self.openai_api_key:
            return "openai"
        return "none"

    @property
    def openui_live(self) -> bool:
        return bool(self.openai_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
