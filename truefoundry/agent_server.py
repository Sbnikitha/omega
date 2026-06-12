"""TrueFoundry-compatible FastAPI wrapper around OMEGA LangGraph pipeline."""
from __future__ import annotations

import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.agents.graph import run_incident_pipeline
from app.config import get_settings
from app.models import IncidentEvent
from app.services.payment import require_analysis_payment
from app.services.sponsor_analytics import sponsor_stack_report

app = FastAPI(
    title="OMEGA on TrueFoundry",
    version="1.0.0",
    root_path=os.getenv("TFY_SERVICE_ROOT_PATH", ""),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    settings = get_settings()
    return {
        "status": "ok",
        "platform": "truefoundry",
        "llm_provider": settings.llm_provider,
        "sponsors": sponsor_stack_report()["enabled"],
    }


@app.post("/incidents")
def create_incident(event: IncidentEvent, request: Request):
    require_analysis_payment(request, action="incident_analysis")
    return run_incident_pipeline(event).model_dump()
