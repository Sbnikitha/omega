from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class EventType(str, Enum):
    CPU_SPIKE = "cpu_spike"
    LATENCY_SPIKE = "latency_spike"
    ERROR_RATE = "error_rate"
    CONNECTION_POOL = "connection_pool_exhaustion"
    DEPLOY_FAILURE = "deploy_failure"
    DATABASE_TIMEOUT = "database_timeout"


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentEvent(BaseModel):
    type: str
    service: str
    severity: float = Field(ge=0.0, le=1.0)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    metrics: dict[str, Any] = Field(default_factory=dict)
    dependency_graph: dict[str, list[str]] = Field(default_factory=dict)


class ClassifiedEvent(BaseModel):
    event_id: str
    event_type: str
    service: str
    severity: float
    severity_label: Severity
    classified_at: str
    dependency_graph: dict[str, list[str]] = Field(default_factory=dict)
    metrics: dict[str, Any] = Field(default_factory=dict)


class RootCauseReport(BaseModel):
    root_cause: str
    confidence: float
    affected_services: list[str]
    reasoning: str


class ScenarioPlan(BaseModel):
    scenarios: list[dict[str, Any]]
    recommended_scenario_id: str
    risk_score: float


class ActionPlan(BaseModel):
    actions: list[dict[str, Any]]
    recommended_action_id: str
    requires_human_approval: bool
    rationale: str


class SimulationStep(BaseModel):
    step_id: str
    name: str
    owner: str
    status: str = "completed"
    timestamp: str = ""
    detail: str = ""


class SimulationState(BaseModel):
    simulation_id: str
    steps: list[SimulationStep] = Field(default_factory=list)
    steps_completed: list[str] = Field(default_factory=list)
    fault_injection: dict[str, Any] = Field(default_factory=dict)
    cascade: dict[str, Any] = Field(default_factory=dict)
    aggregate_risk_score: float = 0.0
    requires_human_approval: bool = True


class TimelineEntry(BaseModel):
    state: str
    owner: str
    timestamp: str
    status: str  # done | active | pending


class ChangeLogEntry(BaseModel):
    timestamp: str
    actor: str
    field: str
    old_value: str | None = None
    new_value: str = ""
    detail: str = ""


class IncidentState(BaseModel):
    incident_id: str = Field(default_factory=lambda: str(uuid4()))
    trace_id: str | None = None
    event: IncidentEvent
    classified: ClassifiedEvent | None = None
    root_cause: RootCauseReport | None = None
    scenarios: ScenarioPlan | None = None
    action_plan: ActionPlan | None = None
    status: str = "pending"
    human_approved: bool | None = None
    human_feedback_reason: str | None = None
    auto_scores: dict[str, float] = Field(default_factory=dict)
    langfuse_scores: dict[str, float] = Field(default_factory=dict)
    span_ids: dict[str, str] = Field(default_factory=dict)
    simulation: SimulationState | None = None
    timeline: list[TimelineEntry] = Field(default_factory=list)
    change_log: list[ChangeLogEntry] = Field(default_factory=list)
    prompt_version: str = "scientist-root-cause@production"
    incident_commander: str = "on-call-engineer"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    resolved_at: str | None = None
    sponsor_metadata: dict[str, Any] = Field(default_factory=dict)


class HumanFeedbackRequest(BaseModel):
    incident_id: str
    approved: bool
    reason: str = ""


class OptimizePromptRequest(BaseModel):
    agent: str = "scientist"
    min_failures: int = 3


class NLQueryRequest(BaseModel):
    query: str
    limit: int = 10
