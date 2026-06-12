from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.agents.graph import run_incident_pipeline
from app.config import get_settings
from app.models import HumanFeedbackRequest, IncidentEvent, NLQueryRequest, OptimizePromptRequest
from app.services.incidents import store
from app.services.prompt_optimizer import optimize_prompt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("omega")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info(
        "OMEGA starting | langfuse=%s | llm=%s | demo=%s",
        settings.langfuse_enabled,
        settings.llm_enabled,
        settings.omega_demo_mode,
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
    allow_origins=["*"],
    allow_credentials=True,
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
        "demo_mode": settings.omega_demo_mode,
    }


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
def create_incident(event: IncidentEvent):
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
