from __future__ import annotations

import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.langfuse_client import add_dataset_item, score_trace
from app.models import HumanFeedbackRequest, IncidentEvent, IncidentState
from app.services.clickhouse import clickhouse_is_active, get_clickhouse
from app.services.cost_savings import session_savings
from app.services.incident_tracker import build_timeline, enrich_incident, log_change, merge_langfuse_scores

logger = logging.getLogger("omega")

_STORE_PATH = Path(__file__).resolve().parents[2] / "data" / "incidents.json"


class IncidentStore:
    def __init__(self) -> None:
        _STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not _STORE_PATH.exists():
            _STORE_PATH.write_text("[]", encoding="utf-8")
        self._maybe_migrate_json_to_clickhouse()

    def _using_clickhouse(self) -> bool:
        return clickhouse_is_active()

    def _maybe_migrate_json_to_clickhouse(self) -> None:
        ch = get_clickhouse()
        if ch is None:
            return
        if ch.count_incidents() > 0:
            return
        items = self._load_json()
        if not items:
            return
        for item in items:
            ch.save_incident(IncidentState.model_validate(item))
        logger.info("Migrated %s incidents from JSON to ClickHouse", len(items))

    def _load_json(self) -> list[dict[str, Any]]:
        return json.loads(_STORE_PATH.read_text(encoding="utf-8"))

    def _save_json_all(self, items: list[dict[str, Any]]) -> None:
        _STORE_PATH.write_text(json.dumps(items, indent=2), encoding="utf-8")

    def _json_benchmark_ms(self) -> float:
        start = time.perf_counter()
        items = self._load_json()
        by_service: dict[str, int] = {}
        for item in items:
            svc = (item.get("event") or {}).get("service", "unknown")
            by_service[svc] = by_service.get(svc, 0) + 1
        _ = by_service
        return round((time.perf_counter() - start) * 1000, 2)

    def storage_backend(self) -> str:
        return "clickhouse" if self._using_clickhouse() else "json_file"

    def list_incidents(self, limit: int = 50) -> list[IncidentState]:
        ch = get_clickhouse()
        if ch:
            return [enrich_incident(i) for i in ch.list_incidents(limit)]
        items = self._load_json()
        return [enrich_incident(IncidentState.model_validate(i)) for i in items[-limit:]][::-1]

    def get(self, incident_id: str) -> IncidentState | None:
        ch = get_clickhouse()
        if ch:
            row = ch.get_incident(incident_id)
            return enrich_incident(row) if row else None
        for item in self._load_json():
            if item.get("incident_id") == incident_id:
                return enrich_incident(IncidentState.model_validate(item))
        return None

    def save(self, incident: IncidentState) -> None:
        ch = get_clickhouse()
        if ch:
            ch.save_incident(incident)
            return
        items = self._load_json()
        payload = incident.model_dump()
        replaced = False
        for idx, item in enumerate(items):
            if item.get("incident_id") == incident.incident_id:
                items[idx] = payload
                replaced = True
                break
        if not replaced:
            items.append(payload)
        self._save_json_all(items)

    def record_feedback(self, feedback: HumanFeedbackRequest) -> IncidentState | None:
        incident = self.get(feedback.incident_id)
        if incident is None:
            return None

        incident.human_approved = feedback.approved
        incident.human_feedback_reason = feedback.reason
        incident.status = "approved" if feedback.approved else "rejected"
        incident.resolved_at = datetime.utcnow().isoformat()
        log_change(
            incident,
            incident.incident_commander,
            "human_approved",
            str(feedback.approved),
            feedback.reason or ("Approved" if feedback.approved else "Rejected"),
        )
        incident.timeline = build_timeline(incident)
        merge_langfuse_scores(incident)

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

    def _all_items_raw(self) -> list[dict[str, Any]]:
        ch = get_clickhouse()
        if ch:
            return [i.model_dump() for i in ch.list_incidents(limit=10_000)]
        return self._load_json()

    def approval_trend(self) -> list[dict[str, Any]]:
        items = self._all_items_raw()
        resolved = [IncidentState.model_validate(i) for i in items if i.get("human_approved") is not None]
        if not resolved:
            return []
        window = 10
        trend = []
        for i in range(0, len(resolved), max(1, len(resolved) // 5)):
            chunk = resolved[: i + window]
            if not chunk:
                continue
            approved = sum(1 for x in chunk if x.human_approved)
            trend.append(
                {
                    "index": i + len(chunk),
                    "approval_rate": round(approved / len(chunk), 3),
                    "label": f"Incidents 1–{len(chunk)}",
                }
            )
        if resolved:
            approved_all = sum(1 for x in resolved if x.human_approved)
            trend.append(
                {
                    "index": len(resolved),
                    "approval_rate": round(approved_all / len(resolved), 3),
                    "label": "All resolved",
                }
            )
        return trend[-6:]

    def _per_incident_stack_row(self, item: dict[str, Any], ch_active: bool) -> dict[str, Any]:
        """One row = one OMEGA pipeline run and how each sponsor touched it."""
        inc = enrich_incident(IncidentState.model_validate(item))
        auto = inc.auto_scores or {}
        lf = inc.langfuse_scores or {}
        ha = inc.human_approved

        raw_sim = item.get("simulation") or {}
        raw_twin = len(raw_sim.get("steps_completed") or []) >= 7

        auto_n = len(auto)
        human_n = 2 if ha is not None else 0
        score_total = len(lf) if lf else auto_n + human_n

        if ha is True:
            human_label = "approved"
        elif ha is False:
            human_label = "rejected"
        elif inc.status in ("awaiting_approval", "auto_ready"):
            human_label = "pending"
        else:
            human_label = "—"

        if raw_twin:
            openui_tier = "7-step twin"
            openui_components = 6
        elif item.get("action_plan") and item.get("root_cause") and item.get("scenarios"):
            openui_tier = "dashboard"
            openui_components = 4
        elif item.get("root_cause"):
            openui_tier = "rca card"
            openui_components = 2
        else:
            openui_tier = "—"
            openui_components = 0

        backend = "clickhouse" if ch_active else "json_file"
        quality = round(float(auto.get("root_cause_quality", 0)) * 100)

        return {
            "incident_id": inc.incident_id[:8],
            "service": inc.event.service,
            "status": inc.status,
            "langfuse_trace": (inc.trace_id or "")[:8] or None,
            "langfuse_scores_auto": auto_n,
            "langfuse_scores_human": human_n,
            "langfuse_scores_total": score_total,
            "langfuse_human": human_label,
            "langfuse_golden": ha is True,
            "langfuse_quality_pct": quality,
            "clickhouse_backend": backend,
            "clickhouse_indexed": "svc·rca·sev·status" if ch_active else "full-json scan",
            "openui_tier": openui_tier,
            "openui_components": openui_components,
            "openui_tokens_est": 1226 if openui_components >= 4 else (480 if openui_components else 0),
        }

    def stack_usage(self, items: list[dict[str, Any]]) -> dict[str, Any]:
        settings = get_settings()
        total = len(items)
        enriched = [enrich_incident(IncidentState.model_validate(i)) for i in items]
        with_trace = sum(1 for i in enriched if i.trace_id)
        with_scores = sum(1 for i in enriched if (i.auto_scores or {}).get("root_cause_quality") is not None)
        with_simulation = sum(
            1
            for i in items
            if i.get("simulation") and len((i.get("simulation") or {}).get("steps_completed") or []) >= 7
        )
        with_human_score = sum(1 for i in enriched if i.human_approved is not None)
        with_golden = sum(1 for i in enriched if i.human_approved is True)
        with_openui_full = sum(
            1 for i in items if i.get("root_cause") and i.get("action_plan") and i.get("scenarios")
        )
        resolved = sum(1 for i in enriched if i.human_approved is not None)
        ch_active = self._using_clickhouse()

        per_incident = [
            self._per_incident_stack_row(i, ch_active) for i in items[-25:][::-1]
        ]

        savings = session_savings(items)
        return {
            "total_incidents": total,
            "langfuse_traced": with_trace,
            "langfuse_scored": with_scores,
            "langfuse_human_scored": with_human_score,
            "langfuse_golden": with_golden,
            "clickhouse_stored": total if ch_active else 0,
            "json_stored": total if not ch_active else 0,
            "openui_dashboard_ready": with_openui_full,
            "openui_twin_ready": with_simulation,
            "human_resolved": resolved,
            "storage_backend": self.storage_backend(),
            "clickhouse_enabled": settings.clickhouse_enabled,
            "clickhouse_connected": ch_active,
            "per_incident": per_incident,
            "cost_savings_totals": savings.get("totals", {}),
            "without_stack": {
                "langfuse_off_traces": total - with_trace,
                "no_clickhouse_query_ms": self._json_benchmark_ms(),
                "openui_markdown_only_tokens_est": total * 2247,
            },
            "with_stack": {
                "langfuse_traces": with_trace,
                "clickhouse_query_ms": get_clickhouse().benchmark_query_ms() if ch_active else None,
                "openui_lang_tokens_est": total * 1226,
                "net_savings_usd": savings.get("totals", {}).get("net_savings_usd", 0),
            },
        }

    def analytics(self) -> dict[str, Any]:
        items = self._all_items_raw()
        if not items:
            empty = {
                "total": 0,
                "human_approval_rate": 0.0,
                "avg_root_cause_quality": 0.0,
                "by_service": {},
                "approval_trend": [],
                "prompt_version": "scientist-root-cause@production",
                "cost_savings": session_savings([]),
                "stack": self.stack_usage([]),
                "storage": {"backend": self.storage_backend(), "clickhouse_connected": clickhouse_is_active()},
            }
            return empty

        ch = get_clickhouse()
        if ch:
            agg = ch.aggregate_analytics()
            by_service = ch.by_service()
            total = agg.get("total", len(items))
            approval_rate = agg.get("human_approval_rate", 0.0)
            avg_quality = agg.get("avg_root_cause_quality", 0.0)
        else:
            resolved = [i for i in items if i.get("human_approved") is not None]
            approved = [i for i in resolved if i.get("human_approved")]
            approval_rate = len(approved) / len(resolved) if resolved else 0.0
            quality_scores = []
            for item in items:
                scores = item.get("auto_scores") or {}
                if "root_cause_quality" in scores:
                    quality_scores.append(scores["root_cause_quality"])
            avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0.0
            by_service = {}
            for item in items:
                service = (item.get("event") or {}).get("service", "unknown")
                by_service[service] = by_service.get(service, 0) + 1
            total = len(items)

        json_ms = self._json_benchmark_ms()
        ch_ms = ch.benchmark_query_ms() if ch else None

        return {
            "total": total,
            "human_approval_rate": round(approval_rate, 3),
            "avg_root_cause_quality": round(avg_quality, 3),
            "by_service": by_service,
            "approval_trend": self.approval_trend(),
            "prompt_version": "scientist-root-cause@production",
            "cost_savings": session_savings(items),
            "stack": self.stack_usage(items),
            "storage": {
                "backend": self.storage_backend(),
                "clickhouse_enabled": get_settings().clickhouse_enabled,
                "clickhouse_connected": clickhouse_is_active(),
                "query_ms": {"clickhouse": ch_ms, "json_file": json_ms},
                "speedup_x": round(json_ms / ch_ms, 1) if ch_ms and ch_ms > 0 else None,
            },
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
