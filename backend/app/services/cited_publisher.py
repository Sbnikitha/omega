from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.models import IncidentState
from app.services.cost_savings import omega_incident_savings
from app.services.senso import ingest_kb, publish_to_cited_md, senso_is_active

logger = logging.getLogger("omega.cited")

_CITED_PATH = Path(__file__).resolve().parents[2] / "cited.md"


def cited_path() -> Path:
    return _CITED_PATH


def _ensure_header() -> None:
    if _CITED_PATH.exists():
        return
    settings = get_settings()
    header = f"""# OMEGA — Cited Agent Output

Autonomous incident analyses published by the OMEGA agent swarm.  
Each entry is grounded in **open-web sources** (public postmortems & status pages) with Langfuse trace IDs.

**Monetization:** ${settings.x402_price_usd} USD per full analysis (x402 / CDP / agentic.market)  
**Stack:** Langfuse · ClickHouse · OpenUI · LangGraph

---

"""
    _CITED_PATH.write_text(header, encoding="utf-8")


def _format_scores(incident: IncidentState) -> str:
    scores = incident.langfuse_scores or incident.auto_scores or {}
    if not scores:
        return "_no scores_"
    return ", ".join(f"`{k}`={v:.2f}" for k, v in scores.items())


def publish_omega_incident(
    incident: IncidentState,
    *,
    public_source: dict[str, Any] | None = None,
    event_type: str = "analysis",
) -> str:
    """Append one cited section to cited.md. Returns path."""
    _ensure_header()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    savings = omega_incident_savings(incident.event.severity, incident_id=incident.incident_id[:8])

    lines = [
        f"## {incident.event.service} · {event_type} · `{incident.incident_id[:8]}`",
        f"**Published:** {now}  ",
        f"**Service:** `{incident.event.service}` · **Severity:** {incident.event.severity:.0%} · **Status:** {incident.status}",
        "",
    ]

    if public_source:
        lines.extend(
            [
                "### Open-web source (ground truth)",
                f"- **{public_source.get('company', 'Unknown')}:** [{public_source.get('title', 'Postmortem')}]({public_source.get('source_url', '#')})",
                f"- **Published RCA:** {public_source.get('root_cause', '—')}",
                f"- **Published resolution:** {public_source.get('resolution', '—')}",
                f"- **MTTR:** {public_source.get('mttr_minutes', '—')} min",
                "",
            ]
        )

    if incident.root_cause:
        lines.extend(
            [
                "### OMEGA agent output",
                f"- **Root cause (Scientist):** {incident.root_cause.root_cause} ({incident.root_cause.confidence:.0%} confidence)",
                f"- **Reasoning:** {incident.root_cause.reasoning}",
                f"- **Blast radius:** {', '.join(incident.root_cause.affected_services)}",
                "",
            ]
        )

    if incident.action_plan:
        lines.extend(
            [
                f"- **Recommended action:** `{incident.action_plan.recommended_action_id}`",
                f"- **Rationale:** {incident.action_plan.rationale}",
                "",
            ]
        )

    if incident.human_approved is not None:
        verdict = "approved" if incident.human_approved else "rejected"
        lines.append(f"- **Human gate:** {verdict} — {incident.human_feedback_reason or '—'}")
        lines.append("")

    lines.extend(
        [
            "### Observability & stack",
            f"- **Langfuse trace:** `{incident.trace_id or incident.incident_id}`",
            f"- **Scores:** {_format_scores(incident)}",
            f"- **Est. manual savings:** ${savings['net_savings_usd']:.0f} · {savings['work_hours_saved']}h eng time",
            f"- **Prompt:** `{incident.prompt_version}`",
            "",
            "---",
            "",
        ]
    )

    block = "\n".join(lines)
    with _CITED_PATH.open("a", encoding="utf-8") as f:
        f.write(block)

    senso_result: dict[str, Any] = {}
    if senso_is_active():
        title = f"{incident.event.service} · {event_type}"
        ingest_kb(title, block)
        senso_result = publish_to_cited_md(
            markdown=block,
            seo_title=title,
            summary=(
                incident.root_cause.root_cause
                if incident.root_cause
                else f"OMEGA analysis for {incident.event.service}"
            ),
        )

    logger.info(
        "Published cited.md entry for %s (senso=%s)",
        incident.incident_id[:8],
        senso_result.get("published", False),
    )
    return str(_CITED_PATH)


def read_cited() -> str:
    _ensure_header()
    return _CITED_PATH.read_text(encoding="utf-8")
