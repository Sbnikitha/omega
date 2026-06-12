from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from app.agents.graph import run_incident_pipeline
from app.config import get_settings
from app.models import HumanFeedbackRequest, IncidentEvent, NLQueryRequest, OptimizePromptRequest
from app.services.airbyte_context import airbyte_is_active, ingest_context_for_service
from app.services.cited_publisher import read_cited
from app.services.clickhouse import clickhouse_is_active
from app.services.composio_tools import composio_is_active, fetch_url
from app.services.payment import payment_headers, require_analysis_payment
from app.services.pioneer import pioneer_is_active
from app.services.incidents import store
from app.services.prompt_optimizer import optimize_prompt
from app.services.public_incidents import (
    get_public_incident,
    list_public_incidents,
    public_incidents_savings_summary,
    replay_public_incident,
)
from app.services.senso import senso_is_active
from app.services.sponsor_analytics import sponsor_stack_report

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("omega")


def _normalize_origin(url: str) -> str:
    url = url.strip().rstrip("/")
    if not url:
        return url
    if url.startswith(("http://", "https://")):
        return url
    return f"https://{url}"


def _cors_origins() -> list[str]:
    settings = get_settings()
    origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]
    for url in (settings.frontend_url, os.getenv("FRONTEND_URL", "")):
        normalized = _normalize_origin(url)
        if normalized and normalized not in origins:
            origins.append(normalized)
    return origins


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    report = sponsor_stack_report()
    logger.info(
        "OMEGA starting | langfuse=%s | llm=%s (%s) | demo=%s | sponsors=%s",
        settings.langfuse_enabled,
        settings.llm_enabled,
        settings.llm_provider,
        settings.omega_demo_mode,
        report["enabled"],
    )
    yield


app = FastAPI(
    title="OMEGA — Autonomous Reality Defense System",
    description="Self-improving multi-agent crisis response with Langfuse observability",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    settings = get_settings()
    return {
        "status": "ok",
        "langfuse": settings.langfuse_enabled,
        "llm": settings.llm_enabled,
        "llm_provider": settings.llm_provider,
        "demo_mode": settings.omega_demo_mode,
        "clickhouse": clickhouse_is_active(),
        "clickhouse_enabled": settings.clickhouse_enabled,
        "storage_backend": store.storage_backend(),
        "x402_enabled": settings.x402_enabled,
        "x402_price_usd": settings.x402_price_usd,
        "payment_bypass": settings.omega_demo_mode or not settings.x402_enabled,
        "sponsors": {
            "langfuse": settings.langfuse_enabled,
            "clickhouse": clickhouse_is_active(),
            "openui": settings.openui_live,
            "senso": senso_is_active(),
            "pioneer": pioneer_is_active(),
            "composio": composio_is_active(),
            "airbyte": airbyte_is_active(),
            "guild": settings.guild_integration_enabled,
            "render": settings.render_deploy_ready,
            "truefoundry": bool(settings.tfy_api_key),
        },
    }


@app.get("/sponsors")
def sponsors():
    """Hackathon prize-lane score analytics for all sponsor integrations."""
    return sponsor_stack_report()


@app.get("/incidents")
def list_incidents(limit: int = 50):
    return {"incidents": [i.model_dump() for i in store.list_incidents(limit)], "analytics": store.analytics()}


@app.get("/incidents/{incident_id}")
def get_incident(incident_id: str):
    incident = store.get(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident.model_dump()


@app.post("/incidents")
def create_incident(event: IncidentEvent, request: Request):
    require_analysis_payment(request, action="incident_analysis")
    incident = run_incident_pipeline(event)
    store.save(incident)
    return incident.model_dump()


@app.post("/feedback")
def submit_feedback(feedback: HumanFeedbackRequest):
    incident = store.record_feedback(feedback)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident.model_dump()


@app.post("/optimize")
def run_optimize(request: OptimizePromptRequest):
    return optimize_prompt(agent=request.agent, min_failures=request.min_failures)


@app.post("/query")
def natural_language_query(request: NLQueryRequest):
    return store.query_nl(request.query, limit=request.limit)


@app.get("/analytics")
def analytics():
    return store.analytics()


@app.get("/public-incidents")
def public_incidents_list():
    return {
        "incidents": list_public_incidents(),
        "source": "curated from public postmortems & status pages",
        "savings_summary": public_incidents_savings_summary(),
    }


@app.get("/public-incidents/{incident_id}")
def public_incident_detail(incident_id: str):
    item = get_public_incident(incident_id)
    if not item:
        raise HTTPException(status_code=404, detail="Public incident not found")
    return item


@app.post("/public-incidents/{incident_id}/replay")
def public_incident_replay(incident_id: str, request: Request):
    require_analysis_payment(request, action="public_incident_replay")
    try:
        return replay_public_incident(incident_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@app.get("/cited")
def get_cited():
    return {
        "path": "cited.md",
        "content": read_cited(),
        "payment": payment_headers(),
        "senso_enabled": senso_is_active(),
    }


@app.get("/tools/fetch-url")
def tool_fetch_url(url: str):
    """Composio-backed open-web fetch (postmortem grounding)."""
    return fetch_url(url)


@app.get("/tools/airbyte-context")
def tool_airbyte_context(service: str, source_url: str | None = None):
    """Airbyte Agent Engine context search for a service."""
    return ingest_context_for_service(service, source_url=source_url)
