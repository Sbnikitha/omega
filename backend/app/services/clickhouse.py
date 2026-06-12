from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from app.config import get_settings
from app.models import IncidentState

logger = logging.getLogger("omega.clickhouse")

_client: "ClickHouseClient | None" = None
_connect_failed = False


class ClickHouseClient:
    def __init__(self) -> None:
        settings = get_settings()
        import clickhouse_connect

        self.client = clickhouse_connect.get_client(
            host=settings.clickhouse_host,
            port=settings.clickhouse_port,
            username=settings.clickhouse_user,
            password=settings.clickhouse_password,
            database=settings.clickhouse_database,
        )
        self._init_db()

    def _init_db(self) -> None:
        self.client.command(
            """
            CREATE TABLE IF NOT EXISTS omega_incidents (
                incident_id String,
                trace_id String,
                service String,
                severity Float32,
                status String,
                root_cause String,
                confidence Float32,
                action_plan String,
                auto_score_quality Float32,
                human_approved Int8,
                payload String,
                created_at DateTime DEFAULT now(),
                updated_at DateTime DEFAULT now()
            ) ENGINE = ReplacingMergeTree(updated_at)
            ORDER BY (incident_id)
            """
        )

    def ping(self) -> bool:
        self.client.command("SELECT 1")
        return True

    def save_incident(self, incident: IncidentState) -> None:
        payload = json.dumps(incident.model_dump())
        now = datetime.utcnow()
        self.client.insert(
            "omega_incidents",
            [
                [
                    incident.incident_id,
                    incident.trace_id or "",
                    incident.event.service,
                    float(incident.event.severity),
                    incident.status,
                    incident.root_cause.root_cause if incident.root_cause else "",
                    float(incident.root_cause.confidence) if incident.root_cause else 0.0,
                    incident.action_plan.recommended_action_id if incident.action_plan else "",
                    float((incident.auto_scores or {}).get("root_cause_quality", 0.0)),
                    1 if incident.human_approved is True else (0 if incident.human_approved is False else -1),
                    payload,
                    now,
                    now,
                ]
            ],
            column_names=[
                "incident_id",
                "trace_id",
                "service",
                "severity",
                "status",
                "root_cause",
                "confidence",
                "action_plan",
                "auto_score_quality",
                "human_approved",
                "payload",
                "created_at",
                "updated_at",
            ],
        )

    def get_incident(self, incident_id: str) -> IncidentState | None:
        rows = self.client.query(
            """
            SELECT argMax(payload, updated_at) AS payload
            FROM omega_incidents
            WHERE incident_id = {id:String}
            GROUP BY incident_id
            """,
            parameters={"id": incident_id},
        ).result_rows
        if not rows or not rows[0][0]:
            return None
        return IncidentState.model_validate(json.loads(rows[0][0]))

    def list_incidents(self, limit: int = 50) -> list[IncidentState]:
        rows = self.client.query(
            """
            SELECT argMax(payload, updated_at) AS payload
            FROM omega_incidents
            GROUP BY incident_id
            ORDER BY max(updated_at) DESC
            LIMIT {lim:UInt32}
            """,
            parameters={"lim": limit},
        ).result_rows
        out: list[IncidentState] = []
        for row in rows:
            if row[0]:
                out.append(IncidentState.model_validate(json.loads(row[0])))
        return out

    def count_incidents(self) -> int:
        rows = self.client.query("SELECT count(DISTINCT incident_id) FROM omega_incidents").result_rows
        return int(rows[0][0]) if rows else 0

    def aggregate_analytics(self) -> dict[str, Any]:
        rows = self.client.query(
            """
            SELECT
                count(DISTINCT incident_id) AS total,
                avg(auto_score_quality) AS avg_quality,
                countIf(human_approved = 1) AS approved,
                countIf(human_approved = 0) AS rejected,
                countIf(human_approved >= 0) AS resolved,
                countIf(trace_id != '') AS with_trace
            FROM (
                SELECT
                    incident_id,
                    argMax(auto_score_quality, updated_at) AS auto_score_quality,
                    argMax(human_approved, updated_at) AS human_approved,
                    argMax(trace_id, updated_at) AS trace_id
                FROM omega_incidents
                GROUP BY incident_id
            )
            """
        ).result_rows
        if not rows:
            return {}
        total, avg_q, approved, rejected, resolved, with_trace = rows[0]
        rate = (approved / resolved) if resolved else 0.0
        return {
            "total": int(total),
            "avg_root_cause_quality": round(float(avg_q or 0), 3),
            "human_approval_rate": round(float(rate), 3),
            "with_langfuse_trace": int(with_trace),
            "resolved": int(resolved),
        }

    def by_service(self) -> dict[str, int]:
        rows = self.client.query(
            """
            SELECT service, count() AS c FROM (
                SELECT incident_id, argMax(service, updated_at) AS service
                FROM omega_incidents
                GROUP BY incident_id
            )
            GROUP BY service
            ORDER BY c DESC
            """
        ).result_rows
        return {str(r[0]): int(r[1]) for r in rows}

    def benchmark_query_ms(self) -> float:
        import time

        start = time.perf_counter()
        self.client.query(
            """
            SELECT service, avg(severity), count()
            FROM (
                SELECT incident_id,
                    argMax(service, updated_at) AS service,
                    argMax(severity, updated_at) AS severity
                FROM omega_incidents
                GROUP BY incident_id
            )
            GROUP BY service
            """
        )
        return round((time.perf_counter() - start) * 1000, 2)


def get_clickhouse() -> ClickHouseClient | None:
    global _client, _connect_failed
    settings = get_settings()
    if not settings.clickhouse_enabled:
        return None
    if _connect_failed:
        return None
    try:
        if _client is None:
            _client = ClickHouseClient()
            _client.ping()
            logger.info("ClickHouse connected at %s:%s", settings.clickhouse_host, settings.clickhouse_port)
        return _client
    except Exception as exc:
        logger.warning("ClickHouse unavailable, falling back to JSON file: %s", exc)
        _connect_failed = True
        return None


def clickhouse_is_active() -> bool:
    return get_clickhouse() is not None
