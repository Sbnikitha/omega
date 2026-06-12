from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.langfuse_client import add_dataset_item, score_trace
from app.models import HumanFeedbackRequest, IncidentEvent, IncidentState

_STORE_PATH = Path(__file__).resolve().parents[2] / "data" / "incidents.json"


class IncidentStore:
    def __init__(self) -> None:
        _STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not _STORE_PATH.exists():
            _STORE_PATH.write_text("[]", encoding="utf-8")

    def _load(self) -> list[dict[str, Any]]:
        return json.loads(_STORE_PATH.read_text(encoding="utf-8"))

    def _save(self, items: list[dict[str, Any]]) -> None:
        _STORE_PATH.write_text(json.dumps(items, indent=2), encoding="utf-8")

    def list_incidents(self, limit: int = 50) -> list[IncidentState]:
        items = self._load()
        return [IncidentState.model_validate(i) for i in items[-limit:]][::-1]

    def get(self, incident_id: str) -> IncidentState | None:
        for item in self._load():
            if item.get("incident_id") == incident_id:
                return IncidentState.model_validate(item)
        return None

    def save(self, incident: IncidentState) -> None:
        items = self._load()
        replaced = False
        for idx, item in enumerate(items):
            if item.get("incident_id") == incident.incident_id:
                items[idx] = incident.model_dump()
                replaced = True
                break
        if not replaced:
            items.append(incident.model_dump())
        self._save(items)

    def record_feedback(self, feedback: HumanFeedbackRequest) -> IncidentState | None:
        incident = self.get(feedback.incident_id)
        if incident is None:
            return None

        incident.human_approved = feedback.approved
        incident.human_feedback_reason = feedback.reason
        incident.status = "approved" if feedback.approved else "rejected"
        incident.resolved_at = datetime.utcnow().isoformat()

        trace_id = incident.trace_id or incident.incident_id
        score_trace(
            trace_id,
            "human_approval",
            1.0 if feedback.approved else 0.0,
            comment=feedback.reason or ("Approved" if feedback.approved else "Rejected"),
            data_type="BOOLEAN",
        )

        if incident.root_cause and incident.action_plan:
            resolution_accuracy = 1.0 if feedback.approved else 0.0
            score_trace(
                trace_id,
                "resolution_accuracy",
                resolution_accuracy,
                comment="Post-resolution ground truth",
            )
            settings = get_settings()
            add_dataset_item(
                settings.golden_dataset_name,
                input_data={
                    "event": incident.event.model_dump(),
                    "dependency_graph": incident.event.dependency_graph,
                },
                expected_output={
                    "root_cause": incident.root_cause.root_cause,
                    "resolution": incident.action_plan.recommended_action_id,
                },
                metadata={
                    "severity": incident.event.severity,
                    "service": incident.event.service,
                    "human_approved": feedback.approved,
                },
                item_id=incident.incident_id,
            )

        self.save(incident)
        return incident

    def analytics(self) -> dict[str, Any]:
        items = self._load()
        if not items:
            return {
                "total": 0,
                "human_approval_rate": 0.0,
                "avg_root_cause_quality": 0.0,
                "by_service": {},
            }

        resolved = [i for i in items if i.get("human_approved") is not None]
        approved = [i for i in resolved if i.get("human_approved")]
        approval_rate = len(approved) / len(resolved) if resolved else 0.0

        quality_scores = []
        for item in items:
            scores = item.get("auto_scores") or {}
            if "root_cause_quality" in scores:
                quality_scores.append(scores["root_cause_quality"])
        avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0.0

        by_service: dict[str, int] = {}
        for item in items:
            service = (item.get("event") or {}).get("service", "unknown")
            by_service[service] = by_service.get(service, 0) + 1

        return {
            "total": len(items),
            "human_approval_rate": round(approval_rate, 3),
            "avg_root_cause_quality": round(avg_quality, 3),
            "by_service": by_service,
        }

    def query_nl(self, query: str, limit: int = 10) -> dict[str, Any]:
        q = query.lower()
        items = self.list_incidents(limit=200)
        results: list[IncidentState] = []

        if "wrong" in q or "reject" in q or "fail" in q:
            results = [i for i in items if i.human_approved is False]
        elif "approve" in q or "correct" in q:
            results = [i for i in items if i.human_approved is True]
        elif "database" in q or "db" in q:
            results = [
                i
                for i in items
                if "database" in (i.root_cause.root_cause if i.root_cause else "").lower()
                or "database" in i.event.service.lower()
            ]
        elif "cost" in q or "expensive" in q:
            results = sorted(items, key=lambda x: x.event.severity, reverse=True)
        else:
            results = items

        return {
            "query": query,
            "count": len(results[:limit]),
            "incidents": [r.model_dump() for r in results[:limit]],
            "analytics": self.analytics(),
            "mcp_note": "Powered by Langfuse MCP pattern — query incidents via natural language",
        }


store = IncidentStore()
