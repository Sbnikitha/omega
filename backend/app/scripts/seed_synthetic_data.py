#!/usr/bin/env python3
"""Seed 50 synthetic incidents with improving human approval trend for demo."""

from __future__ import annotations

import json
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from app.agents.graph import run_incident_pipeline  # noqa: E402
from app.models import IncidentEvent  # noqa: E402
from app.services.incidents import store  # noqa: E402

SERVICES = ["auth", "api-gateway", "frontend", "payments", "database", "cache"]
EVENT_TYPES = [
    "cpu_spike",
    "latency_spike",
    "error_rate",
    "connection_pool_exhaustion",
    "deploy_failure",
    "database_timeout",
]
ROOT_CAUSES = [
    "connection_pool_exhaustion",
    "bad_deploy",
    "database_timeout",
    "cache_stampede",
    "rate_limit_misconfig",
]

DEPENDENCY_GRAPH = {
    "frontend": ["api-gateway"],
    "api-gateway": ["auth", "payments"],
    "auth": ["database", "cache"],
    "payments": ["database"],
    "database": [],
    "cache": [],
}


def make_event(idx: int) -> IncidentEvent:
    service = random.choice(SERVICES)
    return IncidentEvent(
        type=random.choice(EVENT_TYPES),
        service=service,
        severity=round(random.uniform(0.45, 0.98), 2),
        timestamp=(datetime.utcnow() - timedelta(days=90 - idx)).isoformat(),
        metrics={"error_rate": round(random.uniform(0.01, 0.25), 3), "p99_ms": random.randint(200, 2000)},
        dependency_graph=DEPENDENCY_GRAPH,
    )


def main() -> None:
    random.seed(42)
    incidents = []
    for i in range(50):
        event = make_event(i)
        incident = run_incident_pipeline(event)
        # Simulate improving approval rate: early ~61%, later ~89%
        approval_prob = 0.61 + (i / 49) * 0.28
        approved = (i >= 35 and random.random() < 0.89) or (i < 15 and random.random() < 0.61) or random.random() < approval_prob
        incident.human_approved = approved
        incident.human_feedback_reason = (
            "Correct root cause and safe action" if approved else "Root cause missed secondary failure"
        )
        incident.status = "approved" if approved else "rejected"
        incident.resolved_at = datetime.utcnow().isoformat()
        store.save(incident)
        incidents.append(incident.model_dump())
        print(f"Seeded incident {i + 1}/50 | approved={approved}")

    out = ROOT / "data" / "seed_summary.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    approved_count = sum(1 for i in incidents if i.get("human_approved"))
    out.write_text(
        json.dumps(
            {
                "total": len(incidents),
                "approved": approved_count,
                "approval_rate": round(approved_count / len(incidents), 3),
                "story": "61% early approval trending to 89% after Langfuse prompt optimization cycles",
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Done. Approval rate: {approved_count}/{len(incidents)}")


if __name__ == "__main__":
    main()
