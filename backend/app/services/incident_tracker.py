from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from app.models import (
    ChangeLogEntry,
    IncidentState,
    SimulationState,
    SimulationStep,
    TimelineEntry,
)

SIMULATION_STEP_DEFS = [
    ("TWIN_BOOT", "Boot Digital Twin", "Simulator"),
    ("TOPOLOGY_LOADED", "Load Topology", "Simulator"),
    ("FAULT_INJECTED", "Inject Fault", "Simulator"),
    ("CASCADE_SIMULATED", "Propagate Cascade", "Simulator"),
    ("SCENARIOS_GENERATED", "Generate Scenarios", "Simulator"),
    ("SCENARIOS_RANKED", "Score & Rank", "Simulator"),
    ("RECOMMENDATION_READY", "Emit Recommendation", "Simulator"),
]

LIFECYCLE = [
    ("NEW", "System", "pending"),
    ("CLASSIFIED", "Observer", "classified"),
    ("ANALYZING", "Scientist", "analyzed"),
    ("SIMULATING", "Simulator", "simulated"),
    ("AWAITING_APPROVAL", "Incident Commander", "awaiting_approval"),
    ("RESOLVED", "Incident Commander", "approved"),
]


def _ts() -> str:
    return datetime.utcnow().isoformat()


def log_change(
    incident: IncidentState,
    actor: str,
    field: str,
    new_value: str,
    detail: str = "",
    old_value: str | None = None,
) -> None:
    incident.change_log.append(
        ChangeLogEntry(
            timestamp=_ts(),
            actor=actor,
            field=field,
            old_value=old_value,
            new_value=new_value,
            detail=detail or f"{field} updated",
        )
    )


def build_timeline(incident: IncidentState) -> list[TimelineEntry]:
    status = incident.status
    approved = incident.human_approved

    status_map = {
        "pending": 0,
        "classified": 1,
        "analyzed": 2,
        "simulated": 3,
        "awaiting_approval": 4,
        "auto_ready": 4,
        "approved": 5,
        "rejected": 5,
    }
    current_idx = status_map.get(status, 0)
    if approved is False:
        current_idx = 5

    entries: list[TimelineEntry] = []
    for i, (state, owner, _) in enumerate(LIFECYCLE):
        if i < current_idx:
            step_status = "done"
        elif i == current_idx:
            step_status = "active"
        else:
            step_status = "pending"
        if state == "RESOLVED" and approved is False:
            step_status = "done"
        entries.append(
            TimelineEntry(
                state=state,
                owner=owner,
                timestamp=incident.created_at if i == 0 else _ts(),
                status=step_status,
            )
        )
    return entries


def build_simulation(incident: IncidentState) -> SimulationState | None:
    if not incident.root_cause or not incident.scenarios:
        return None

    root = incident.root_cause
    scenarios = incident.scenarios
    graph = incident.event.dependency_graph
    node_count = len(graph) or 6
    affected = root.affected_services or [incident.event.service]
    blast = round(len(affected) / max(node_count, 1), 2)

    cascade_order = _cascade_order(incident.event.service, graph, affected)

    steps: list[SimulationStep] = []
    for step_id, name, owner in SIMULATION_STEP_DEFS:
        detail = _step_detail(step_id, incident, cascade_order, blast)
        steps.append(
            SimulationStep(
                step_id=step_id,
                name=name,
                owner=owner,
                status="completed",
                timestamp=_ts(),
                detail=detail,
            )
        )

    return SimulationState(
        simulation_id=str(uuid4()),
        steps=steps,
        steps_completed=[s[0] for s in SIMULATION_STEP_DEFS],
        fault_injection={
            "node": incident.event.service,
            "type": root.root_cause,
            "injected_at": _ts(),
        },
        cascade={
            "order": cascade_order,
            "blast_radius_score": blast,
            "affected_count": len(affected),
        },
        aggregate_risk_score=scenarios.risk_score,
        requires_human_approval=incident.action_plan.requires_human_approval if incident.action_plan else True,
    )


def _cascade_order(service: str, graph: dict[str, list[str]], affected: list[str]) -> list[str]:
    order = [service]
    for node, deps in graph.items():
        if service in deps and node not in order:
            order.append(node)
    for a in affected:
        if a not in order:
            order.append(a)
    return order


def _step_detail(step_id: str, incident: IncidentState, cascade: list[str], blast: float) -> str:
    root = incident.root_cause
    if not root:
        return ""
    graph = incident.event.dependency_graph
    if step_id == "TWIN_BOOT":
        return f"simulation engine online :: incident={incident.incident_id[:8]}"
    if step_id == "TOPOLOGY_LOADED":
        return f"nodes={len(graph)} edges={sum(len(v) for v in graph.values())}"
    if step_id == "FAULT_INJECTED":
        return f"fault@{incident.event.service} type={root.root_cause}"
    if step_id == "CASCADE_SIMULATED":
        return f"blast_radius={blast} path={' → '.join(cascade)}"
    if step_id == "SCENARIOS_GENERATED":
        n = len(incident.scenarios.scenarios) if incident.scenarios else 0
        return f"generated {n} intervention scenarios"
    if step_id == "SCENARIOS_RANKED":
        rec = incident.scenarios.recommended_scenario_id if incident.scenarios else "—"
        return f"ranked by risk_score :: winner={rec}"
    if step_id == "RECOMMENDATION_READY":
        risk = incident.scenarios.risk_score if incident.scenarios else 0
        human = incident.action_plan.requires_human_approval if incident.action_plan else True
        return f"aggregate_risk={risk} human_gate={human}"
    return ""


def _synthesize_change_log(incident: IncidentState) -> list[ChangeLogEntry]:
    """Backfill audit trail for incidents saved before change_log existed."""
    entries: list[ChangeLogEntry] = []
    if incident.classified:
        entries.append(
            ChangeLogEntry(
                timestamp=incident.created_at,
                actor="Observer",
                field="status",
                new_value="classified",
                detail=incident.classified.event_type,
            )
        )
    if incident.root_cause:
        entries.append(
            ChangeLogEntry(
                timestamp=incident.created_at,
                actor="Scientist",
                field="root_cause",
                new_value=incident.root_cause.root_cause,
                detail=f"confidence={incident.root_cause.confidence:.0%}",
            )
        )
    if incident.scenarios:
        entries.append(
            ChangeLogEntry(
                timestamp=incident.created_at,
                actor="Simulator",
                field="recommended_scenario",
                new_value=incident.scenarios.recommended_scenario_id,
                detail=f"risk={incident.scenarios.risk_score:.0%}",
            )
        )
    if incident.action_plan:
        entries.append(
            ChangeLogEntry(
                timestamp=incident.created_at,
                actor="Response",
                field="recommended_action",
                new_value=incident.action_plan.recommended_action_id,
                detail=incident.action_plan.rationale,
            )
        )
    if incident.human_approved is not None:
        entries.append(
            ChangeLogEntry(
                timestamp=incident.resolved_at or incident.created_at,
                actor=incident.incident_commander,
                field="human_approved",
                new_value=str(incident.human_approved),
                detail=incident.human_feedback_reason or "",
            )
        )
    return entries


def enrich_incident(incident: IncidentState) -> IncidentState:
    if not incident.timeline:
        incident.timeline = build_timeline(incident)
    if not incident.simulation and incident.scenarios:
        incident.simulation = build_simulation(incident)
    if not incident.change_log:
        incident.change_log = _synthesize_change_log(incident)
    merge_langfuse_scores(incident)
    return incident


def merge_langfuse_scores(incident: IncidentState) -> None:
    incident.langfuse_scores = dict(incident.auto_scores)
    if incident.human_approved is not None:
        incident.langfuse_scores["human_approval"] = 1.0 if incident.human_approved else 0.0
        incident.langfuse_scores["resolution_accuracy"] = incident.langfuse_scores["human_approval"]
