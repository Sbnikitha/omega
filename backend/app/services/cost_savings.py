from __future__ import annotations

from typing import Any

from app.config import get_settings

# Industry-style assumptions (override via env)
SEVERITY_MANUAL_HOURS: dict[str, float] = {
    "critical": 4.5,
    "high": 3.0,
    "medium": 1.5,
    "low": 0.75,
}


def _settings() -> dict[str, float | int]:
    s = get_settings()
    return {
        "hourly_usd": s.omega_engineer_hourly_usd,
        "bridge_size": s.omega_bridge_engineers,
        "llm_usd_per_incident": s.omega_llm_cost_per_incident,
        "omega_pipeline_min": s.omega_pipeline_minutes,
        "diagnosis_reduction_pct": s.omega_diagnosis_reduction_pct,
        "diagnosis_reduction_cap_min": s.omega_diagnosis_reduction_cap_min,
    }


def manual_bridge_cost(mttr_minutes: float, bridge_size: int | None = None, hourly_usd: float | None = None) -> float:
    cfg = _settings()
    engineers = bridge_size if bridge_size is not None else int(cfg["bridge_size"])
    rate = hourly_usd if hourly_usd is not None else float(cfg["hourly_usd"])
    return round((mttr_minutes / 60) * engineers * rate, 2)


def omega_assisted_mttr(mttr_minutes: float) -> float:
    cfg = _settings()
    saved = min(
        mttr_minutes * float(cfg["diagnosis_reduction_pct"]),
        float(cfg["diagnosis_reduction_cap_min"]),
    )
    return round(max(mttr_minutes - saved, float(cfg["omega_pipeline_min"])), 1)


def incident_savings_from_mttr(
    mttr_minutes: float,
    *,
    severity: str = "high",
    label: str | None = None,
) -> dict[str, Any]:
    cfg = _settings()
    bridge = int(cfg["bridge_size"])
    hourly = float(cfg["hourly_usd"])
    llm = float(cfg["llm_usd_per_incident"])
    pipeline_min = float(cfg["omega_pipeline_min"])

    manual_mttr = float(mttr_minutes)
    assisted_mttr = omega_assisted_mttr(manual_mttr)
    mttr_saved_min = round(manual_mttr - assisted_mttr, 1)

    manual_work_hours = round((manual_mttr / 60) * bridge, 2)
    assisted_work_hours = round((assisted_mttr / 60) * bridge, 2)
    work_hours_saved = round(manual_work_hours - assisted_work_hours, 2)

    manual_cost_usd = manual_bridge_cost(manual_mttr, bridge, hourly)
    assisted_cost_usd = manual_bridge_cost(assisted_mttr, bridge, hourly)
    gross_savings_usd = round(manual_cost_usd - assisted_cost_usd, 2)
    net_savings_usd = round(gross_savings_usd - llm, 2)

    triage_hours = SEVERITY_MANUAL_HOURS.get(severity.lower(), 2.5)
    manual_triage_hours = triage_hours * bridge
    omega_triage_hours = round((pipeline_min / 60) * bridge, 2)
    triage_hours_saved = round(manual_triage_hours - omega_triage_hours, 2)

    return {
        "label": label,
        "severity": severity,
        "manual_mttr_minutes": manual_mttr,
        "omega_assisted_mttr_minutes": assisted_mttr,
        "mttr_saved_minutes": mttr_saved_min,
        "bridge_engineers": bridge,
        "hourly_rate_usd": hourly,
        "manual_work_hours": manual_work_hours,
        "omega_work_hours": assisted_work_hours,
        "work_hours_saved": work_hours_saved,
        "manual_triage_hours": round(manual_triage_hours, 2),
        "omega_triage_hours": omega_triage_hours,
        "triage_hours_saved": triage_hours_saved,
        "manual_cost_usd": manual_cost_usd,
        "omega_cost_usd": assisted_cost_usd,
        "llm_cost_usd": llm,
        "gross_savings_usd": gross_savings_usd,
        "net_savings_usd": net_savings_usd,
        "assumptions": {
            "bridge_engineers": bridge,
            "hourly_rate_usd": hourly,
            "llm_cost_per_incident_usd": llm,
            "omega_pipeline_minutes": pipeline_min,
            "diagnosis_reduction_pct": float(cfg["diagnosis_reduction_pct"]),
        },
    }


def aggregate_public_savings(incidents: list[dict[str, Any]]) -> dict[str, Any]:
    rows = [
        incident_savings_from_mttr(
            i["mttr_minutes"],
            severity=i.get("severity", "high"),
            label=i.get("title"),
        )
        for i in incidents
    ]
    if not rows:
        return {"incident_count": 0, "totals": {}, "per_incident": []}

    totals = {
        "manual_work_hours": round(sum(r["manual_work_hours"] for r in rows), 1),
        "omega_work_hours": round(sum(r["omega_work_hours"] for r in rows), 1),
        "work_hours_saved": round(sum(r["work_hours_saved"] for r in rows), 1),
        "manual_cost_usd": round(sum(r["manual_cost_usd"] for r in rows), 2),
        "omega_cost_usd": round(sum(r["omega_cost_usd"] for r in rows), 2),
        "llm_cost_usd": round(sum(r["llm_cost_usd"] for r in rows), 2),
        "gross_savings_usd": round(sum(r["gross_savings_usd"] for r in rows), 2),
        "net_savings_usd": round(sum(r["net_savings_usd"] for r in rows), 2),
        "avg_mttr_saved_minutes": round(sum(r["mttr_saved_minutes"] for r in rows) / len(rows), 1),
    }
    return {
        "incident_count": len(rows),
        "totals": totals,
        "per_incident": rows,
        "methodology": (
            "Manual cost = MTTR × on-call bridge size × fully-loaded engineer rate. "
            "OMEGA-assisted MTTR assumes faster RCA (diagnosis time cut ~45%, capped). "
            "Net savings subtracts LLM pipeline cost per incident."
        ),
    }


def omega_incident_savings(severity: float, *, incident_id: str | None = None) -> dict[str, Any]:
    """Estimate savings for a synthetic/demo OMEGA run (no published MTTR)."""
    manual_mttr = round(30 + severity * 180, 1)  # 30–200 min from severity score
    sev_label = "critical" if severity >= 0.85 else "high" if severity >= 0.6 else "medium"
    row = incident_savings_from_mttr(manual_mttr, severity=sev_label, label=incident_id)
    row["estimated_manual_mttr"] = True
    return row


def session_savings(incidents: list[dict[str, Any]]) -> dict[str, Any]:
    rows = []
    for item in incidents:
        event = item.get("event") or {}
        sev = float(event.get("severity", 0.5))
        rows.append(omega_incident_savings(sev, incident_id=item.get("incident_id")))

    if not rows:
        cfg = _settings()
        return {
            "incident_count": 0,
            "totals": {
                "work_hours_saved": 0,
                "net_savings_usd": 0,
                "llm_cost_usd": 0,
            },
            "assumptions": cfg,
        }

    return {
        "incident_count": len(rows),
        "totals": {
            "work_hours_saved": round(sum(r["work_hours_saved"] for r in rows), 1),
            "manual_work_hours": round(sum(r["manual_work_hours"] for r in rows), 1),
            "omega_work_hours": round(sum(r["omega_work_hours"] for r in rows), 1),
            "net_savings_usd": round(sum(r["net_savings_usd"] for r in rows), 2),
            "llm_cost_usd": round(sum(r["llm_cost_usd"] for r in rows), 2),
            "gross_savings_usd": round(sum(r["gross_savings_usd"] for r in rows), 2),
        },
        "per_incident": rows[-10:],
    }
