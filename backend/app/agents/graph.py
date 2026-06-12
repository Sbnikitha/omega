from __future__ import annotations

import json
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.evaluators.llm_judge import evaluate_incident
from langfuse import observe

from app.langfuse_client import get_langfuse, incident_trace
from app.models import (
    ActionPlan,
    ClassifiedEvent,
    IncidentEvent,
    IncidentState,
    RootCauseReport,
    ScenarioPlan,
    Severity,
)
from app.services.incident_tracker import build_simulation, build_timeline, log_change, merge_langfuse_scores
from app.services.llm import flush_langfuse, invoke_structured
from app.services.prompt_manager import get_prompt


class GraphState(TypedDict):
    incident: IncidentState


def _severity_label(score: float) -> Severity:
    if score >= 0.9:
        return Severity.CRITICAL
    if score >= 0.75:
        return Severity.HIGH
    if score >= 0.5:
        return Severity.MEDIUM
    return Severity.LOW


@observe(name="observe")
def observer_node(state: GraphState) -> GraphState:
    incident = state["incident"]
    event = incident.event
    payload = {"event_json": json.dumps(event.model_dump())}
    prompt = get_prompt("observer-classify", payload)
    result = invoke_structured("observer-classify", prompt, event.model_dump())

    classified = ClassifiedEvent(
        event_id=incident.incident_id,
        event_type=result.get("event_type", event.type),
        service=event.service,
        severity=event.severity,
        severity_label=Severity(result.get("severity_label", _severity_label(event.severity).value)),
        classified_at=event.timestamp,
        dependency_graph=event.dependency_graph,
        metrics=event.metrics,
    )
    incident.classified = classified
    incident.status = "classified"
    log_change(incident, "Observer", "status", "classified", "Event classified", "pending")
    log_change(incident, "Observer", "severity_label", classified.severity_label.value, classified.event_type)
    lf = get_langfuse()
    if lf:
        obs = lf.get_current_observation_id()
        if obs:
            incident.span_ids["observer"] = obs
    return {"incident": incident}


@observe(name="root_cause_analysis")
def scientist_node(state: GraphState) -> GraphState:
    incident = state["incident"]
    classified = incident.classified
    assert classified is not None

    variables = {
        "event_json": json.dumps(classified.model_dump()),
        "dependency_graph": json.dumps(classified.dependency_graph),
    }
    prompt = get_prompt("scientist-root-cause", variables)
    result = invoke_structured("scientist-root-cause", prompt, classified.model_dump())

    incident.root_cause = RootCauseReport(
        root_cause=result.get("root_cause", "unknown"),
        confidence=float(result.get("confidence", 0.5)),
        affected_services=result.get("affected_services", [classified.service]),
        reasoning=result.get("reasoning", ""),
    )
    incident.status = "analyzed"
    log_change(
        incident,
        "Scientist",
        "root_cause",
        incident.root_cause.root_cause,
        f"confidence={incident.root_cause.confidence:.0%}",
    )
    lf = get_langfuse()
    if lf:
        obs = lf.get_current_observation_id()
        if obs:
            incident.span_ids["scientist"] = obs
    return {"incident": incident}


@observe(name="scenario_simulation")
def simulator_node(state: GraphState) -> GraphState:
    incident = state["incident"]
    root = incident.root_cause
    classified = incident.classified
    assert root is not None and classified is not None

    variables = {
        "root_cause_json": json.dumps(root.model_dump()),
        "dependency_graph": json.dumps(classified.dependency_graph),
    }
    prompt = get_prompt("simulator-scenarios", variables)
    result = invoke_structured("simulator-scenarios", prompt, root.model_dump())

    incident.scenarios = ScenarioPlan(
        scenarios=result.get("scenarios", []),
        recommended_scenario_id=result.get("recommended_scenario_id", "default"),
        risk_score=float(result.get("risk_score", 0.5)),
    )
    incident.status = "simulated"
    incident.simulation = build_simulation(incident)
    log_change(
        incident,
        "Simulator",
        "recommended_scenario",
        incident.scenarios.recommended_scenario_id,
        f"risk={incident.scenarios.risk_score:.0%}",
    )
    lf = get_langfuse()
    if lf:
        obs = lf.get_current_observation_id()
        if obs:
            incident.span_ids["simulator"] = obs
    return {"incident": incident}


@observe(name="action_planning")
def response_node(state: GraphState) -> GraphState:
    incident = state["incident"]
    scenarios = incident.scenarios
    classified = incident.classified
    assert scenarios is not None and classified is not None

    recommended = next(
        (s for s in scenarios.scenarios if s.get("id") == scenarios.recommended_scenario_id),
        scenarios.scenarios[0] if scenarios.scenarios else {},
    )
    variables = {
        "scenario_json": json.dumps(recommended),
        "severity": classified.severity_label.value,
    }
    prompt = get_prompt("response-actions", variables)
    result = invoke_structured("response-actions", prompt, {"scenario": recommended, "classified": classified.model_dump()})

    requires_approval = bool(result.get("requires_human_approval", True))
    if classified.severity_label in {Severity.HIGH, Severity.CRITICAL}:
        requires_approval = True

    incident.action_plan = ActionPlan(
        actions=result.get("actions", []),
        recommended_action_id=result.get("recommended_action_id", "none"),
        requires_human_approval=requires_approval,
        rationale=result.get("rationale", ""),
    )
    incident.status = "awaiting_approval" if requires_approval else "auto_ready"
    log_change(
        incident,
        "Response",
        "recommended_action",
        incident.action_plan.recommended_action_id,
        incident.action_plan.rationale,
    )
    incident.timeline = build_timeline(incident)
    lf = get_langfuse()
    if lf:
        obs = lf.get_current_observation_id()
        if obs:
            incident.span_ids["response"] = obs
    return {"incident": incident}


def build_graph() -> Any:
    graph = StateGraph(GraphState)
    graph.add_node("observer", observer_node)
    graph.add_node("scientist", scientist_node)
    graph.add_node("simulator", simulator_node)
    graph.add_node("response", response_node)
    graph.set_entry_point("observer")
    graph.add_edge("observer", "scientist")
    graph.add_edge("scientist", "simulator")
    graph.add_edge("simulator", "response")
    graph.add_edge("response", END)
    return graph.compile()


def run_incident_pipeline(event: IncidentEvent) -> IncidentState:
    incident = IncidentState(event=event)
    incident.trace_id = incident.incident_id

    with incident_trace(
        incident.incident_id,
        name="omega-incident",
        input_data=event.model_dump(),
        metadata={"service": event.service, "severity": event.severity},
        tags=["omega", "incident", event.service],
    ):
        graph = build_graph()
        result = graph.invoke({"incident": incident})
        incident = result["incident"]
        incident.auto_scores = evaluate_incident(incident)
        merge_langfuse_scores(incident)
        if not incident.simulation:
            incident.simulation = build_simulation(incident)
        if not incident.timeline:
            incident.timeline = build_timeline(incident)
        flush_langfuse()

    return incident
