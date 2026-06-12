from __future__ import annotations

import json

from app.langfuse_client import score_trace
from app.models import IncidentState
from app.services.llm import invoke_judge
from app.services.prompt_manager import JUDGE_PROMPTS


def evaluate_incident(state: IncidentState) -> dict[str, float]:
    scores: dict[str, float] = {}
    trace_id = state.trace_id or state.incident_id

    if state.root_cause:
        value = invoke_judge(
            JUDGE_PROMPTS["root_cause_quality"],
            json.dumps(state.root_cause.model_dump(), indent=2),
        )
        scores["root_cause_quality"] = value
        score_trace(
            trace_id,
            "root_cause_quality",
            value,
            comment="Auto-evaluated by OMEGA judge",
            observation_id=state.span_ids.get("scientist"),
        )

    if state.scenarios:
        value = invoke_judge(
            JUDGE_PROMPTS["scenario_realism"],
            json.dumps(state.scenarios.model_dump(), indent=2),
        )
        scores["scenario_realism"] = value
        score_trace(
            trace_id,
            "scenario_realism",
            value,
            comment="Auto-evaluated by OMEGA judge",
            observation_id=state.span_ids.get("simulator"),
        )

    if state.action_plan:
        value = invoke_judge(
            JUDGE_PROMPTS["action_safety"],
            json.dumps(state.action_plan.model_dump(), indent=2),
        )
        scores["action_safety"] = value
        score_trace(
            trace_id,
            "action_safety",
            value,
            comment="Auto-evaluated by OMEGA judge",
            observation_id=state.span_ids.get("response"),
        )

    return scores
