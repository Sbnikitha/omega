#!/usr/bin/env python3
"""Golden dataset regression gate — fails if accuracy drops below threshold."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from app.agents.graph import scientist_node  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.langfuse_client import get_langfuse  # noqa: E402
from app.models import ClassifiedEvent, IncidentEvent, IncidentState, RootCauseReport, Severity  # noqa: E402
from app.services.incidents import store  # noqa: E402

THRESHOLD = 0.80


def evaluate_match(predicted: RootCauseReport, expected: str) -> float:
    if not predicted:
        return 0.0
    if predicted.root_cause.lower() == expected.lower():
        return 1.0
    if expected.lower() in predicted.root_cause.lower() or predicted.root_cause.lower() in expected.lower():
        return 0.85
    return 0.0


def load_golden_items() -> list[dict]:
    settings = get_settings()
    lf = get_langfuse()
    if lf is not None:
        try:
            dataset = lf.get_dataset(settings.golden_dataset_name)
            return [
                {"input": item.input, "expected_output": item.expected_output}
                for item in dataset.items
            ]
        except Exception:
            pass

    # Fallback: use locally stored approved incidents
    items = []
    for incident in store.list_incidents(limit=100):
        if incident.human_approved and incident.root_cause:
            items.append(
                {
                    "input": {
                        "event": incident.event.model_dump(),
                        "dependency_graph": incident.event.dependency_graph,
                    },
                    "expected_output": {"root_cause": incident.root_cause.root_cause},
                }
            )
    return items


def run_regression() -> float:
    golden = load_golden_items()
    if not golden:
        print("No golden dataset items found — skipping regression (pass)")
        return 1.0

    scores = []
    for item in golden:
        event_data = item["input"]["event"]
        event = IncidentEvent(**event_data)
        classified = ClassifiedEvent(
            event_id="regression",
            event_type=event.type,
            service=event.service,
            severity=event.severity,
            severity_label=Severity.HIGH,
            classified_at=event.timestamp,
            dependency_graph=item["input"].get("dependency_graph", event.dependency_graph),
            metrics=event.metrics,
        )
        incident = IncidentState(event=event, classified=classified)
        result = scientist_node({"incident": incident})
        predicted = result["incident"].root_cause
        expected = item["expected_output"].get("root_cause", "")
        scores.append(evaluate_match(predicted, expected))

    avg = sum(scores) / len(scores)
    print(json.dumps({"cases": len(scores), "average_accuracy": round(avg, 3), "threshold": THRESHOLD}))
    return avg


def main() -> None:
    avg = run_regression()
    if avg < THRESHOLD:
        print(f"REGRESSION FAILED: accuracy {avg:.0%} < {THRESHOLD:.0%}")
        sys.exit(1)
    print(f"REGRESSION PASSED: accuracy {avg:.0%}")
    sys.exit(0)


if __name__ == "__main__":
    main()
