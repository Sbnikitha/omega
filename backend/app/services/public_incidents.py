from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.agents.graph import run_incident_pipeline
from app.models import IncidentEvent, IncidentState
from app.services.cost_savings import aggregate_public_savings, incident_savings_from_mttr
from app.services.incidents import store

_DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "public_incidents.json"


def _load() -> list[dict[str, Any]]:
    if not _DATA_PATH.exists():
        return []
    return json.loads(_DATA_PATH.read_text(encoding="utf-8"))


def list_public_incidents() -> list[dict[str, Any]]:
    items = _load()
    return [
        {
            "id": i["id"],
            "company": i["company"],
            "date": i["date"],
            "title": i["title"],
            "category": i["category"],
            "severity": i["severity"],
            "mttr_minutes": i["mttr_minutes"],
            "source_url": i["source_url"],
            "source_label": i["source_label"],
            "summary": i["summary"],
            "root_cause": i["root_cause"],
            "cost_savings": incident_savings_from_mttr(
                i["mttr_minutes"],
                severity=i.get("severity", "high"),
            ),
        }
        for i in items
    ]


def public_incidents_savings_summary() -> dict[str, Any]:
    return aggregate_public_savings(_load())


def get_public_incident(incident_id: str) -> dict[str, Any] | None:
    for item in _load():
        if item["id"] == incident_id:
            out = dict(item)
            out["cost_savings"] = incident_savings_from_mttr(
                item["mttr_minutes"],
                severity=item.get("severity", "high"),
            )
            return out
    return None


def replay_public_incident(incident_id: str) -> dict[str, Any]:
    public = get_public_incident(incident_id)
    if not public:
        raise ValueError("Public incident not found")

    event_data = public["omega_event"]
    event = IncidentEvent(**event_data)
    omega = run_incident_pipeline(event)
    omega_incident_id = omega.incident_id

    store.save(omega)

    match = False
    if omega.root_cause:
        expected = public.get("expected_omega_root_cause", "")
        actual = omega.root_cause.root_cause.lower()
        match = expected.lower() in actual or actual in expected.lower()

    return {
        "public_incident": public,
        "omega_incident": omega.model_dump(),
        "omega_incident_id": omega_incident_id,
        "root_cause_match": match,
        "comparison": {
            "real_root_cause": public["root_cause"],
            "omega_root_cause": omega.root_cause.root_cause if omega.root_cause else None,
            "real_resolution": public["resolution"],
            "omega_action": omega.action_plan.recommended_action_id if omega.action_plan else None,
            "real_mttr_minutes": public["mttr_minutes"],
        },
        "cost_savings": incident_savings_from_mttr(
            public["mttr_minutes"],
            severity=public.get("severity", "high"),
        ),
    }
