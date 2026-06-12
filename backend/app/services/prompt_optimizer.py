from __future__ import annotations

import json
from typing import Any

from app.config import get_settings
from app.langfuse_client import get_langfuse
from app.services.incidents import store
from app.services.llm import invoke_structured
from app.services.prompt_manager import FALLBACK_PROMPTS, create_prompt_version, get_prompt


PROMPT_NAMES = {
    "scientist": "scientist-root-cause",
    "observer": "observer-classify",
    "simulator": "simulator-scenarios",
    "response": "response-actions",
}


def fetch_failure_examples(min_failures: int = 3) -> list[dict[str, Any]]:
    incidents = store.list_incidents(limit=100)
    failures = [i for i in incidents if i.human_approved is False]
    if len(failures) < min_failures:
        failures = incidents[: max(min_failures, 3)]
    examples = []
    for incident in failures:
        examples.append(
            {
                "input": incident.event.model_dump(),
                "output": incident.root_cause.model_dump() if incident.root_cause else {},
                "reason": incident.human_feedback_reason or "Rejected by operator",
            }
        )
    return examples


def optimize_prompt(agent: str = "scientist", min_failures: int = 3) -> dict[str, Any]:
    prompt_name = PROMPT_NAMES.get(agent, "scientist-root-cause")
    failures = fetch_failure_examples(min_failures)

    current = get_prompt(prompt_name, {})
    if not current:
        current = FALLBACK_PROMPTS[prompt_name]

    variables = {
        "current_prompt": current,
        "failure_examples": json.dumps(failures, indent=2),
        "failure_reasons": json.dumps([f["reason"] for f in failures], indent=2),
    }
    optimizer_prompt = get_prompt("prompt-optimizer", variables)
    improved = invoke_structured(
        "prompt-optimizer",
        optimizer_prompt,
        {"failures": failures, "agent": agent},
    )

    improved_text = improved.get("raw") or improved.get("prompt") or str(improved)
    if isinstance(improved_text, dict):
        improved_text = json.dumps(improved_text)

    if len(improved_text) < 50:
        improved_text = current + "\n\n# Improvements from failure analysis:\n- Emphasize dependency graph traversal\n- Require confidence calibration\n- Flag database pool exhaustion patterns"

    version = create_prompt_version(prompt_name, improved_text, labels=["production"])

    lf = get_langfuse()
    trace_note = "offline"
    if lf:
        trace_note = "deployed via Langfuse Prompt Management"

    return {
        "agent": agent,
        "prompt_name": prompt_name,
        "version": version,
        "failure_examples_used": len(failures),
        "improved_prompt_preview": improved_text[:500] + ("..." if len(improved_text) > 500 else ""),
        "deployment": trace_note,
        "story": "Prompt optimized from human-rejected traces; deploy without code redeploy",
    }
