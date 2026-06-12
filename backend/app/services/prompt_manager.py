from __future__ import annotations

from typing import Any

from app.config import get_settings
from app.langfuse_client import get_langfuse

FALLBACK_PROMPTS: dict[str, str] = {
    "observer-classify": """You are the OMEGA Observer agent. Classify infrastructure events by type and severity.
Return JSON with: event_type, severity_label (LOW|MEDIUM|HIGH|CRITICAL), summary.
Event: {{event_json}}""",
    "scientist-root-cause": """You are the OMEGA Scientist agent. Perform root cause analysis using the dependency graph.
Return JSON with: root_cause, confidence (0-1), affected_services (list), reasoning.
Event: {{event_json}}
Dependency graph: {{dependency_graph}}""",
    "simulator-scenarios": """You are the OMEGA Simulator agent. Project downstream impact of proposed interventions.
Return JSON with: scenarios (list of {id, action, predicted_impact, risk_score}), recommended_scenario_id, risk_score.
Root cause: {{root_cause_json}}
Dependency graph: {{dependency_graph}}""",
    "response-actions": """You are the OMEGA Response agent. Propose safe remediation actions.
Return JSON with: actions (list of {id, type, target, description, risk}), recommended_action_id, requires_human_approval, rationale.
Scenario: {{scenario_json}}
Severity: {{severity}}""",
    "prompt-optimizer": """You improve agent system prompts based on failure examples.
Current prompt:
{{current_prompt}}

Failure examples:
{{failure_examples}}

Failure reasons:
{{failure_reasons}}

Return ONLY the improved system prompt text, no markdown fences.""",
}

JUDGE_PROMPTS: dict[str, str] = {
    "root_cause_quality": "Rate this root cause analysis on accuracy, completeness, and reasoning. Score 0.0-1.0. Return only a number.",
    "scenario_realism": "Rate how realistic and actionable these intervention scenarios are. Score 0.0-1.0. Return only a number.",
    "action_safety": "Rate whether proposed actions are safe and appropriate for the severity. Score 0.0-1.0. Return only a number.",
}


def get_prompt(name: str, variables: dict[str, Any] | None = None) -> str:
    variables = variables or {}
    lf = get_langfuse()
    template = FALLBACK_PROMPTS.get(name, "")

    if lf is not None:
        try:
            prompt = lf.get_prompt(name, label="production")
            if prompt and hasattr(prompt, "compile"):
                return prompt.compile(**variables)
            if prompt and hasattr(prompt, "prompt"):
                text = prompt.prompt
                for key, value in variables.items():
                    text = text.replace(f"{{{{{key}}}}}", str(value))
                return text
        except Exception:
            pass

    text = template
    for key, value in variables.items():
        text = text.replace(f"{{{{{key}}}}}", str(value))
    return text


def create_prompt_version(name: str, prompt_text: str, labels: list[str] | None = None) -> str:
    lf = get_langfuse()
    if lf is None:
        return f"{name}-offline"
    created = lf.create_prompt(
        name=name,
        prompt=prompt_text,
        labels=labels or ["production"],
    )
    lf.flush()
    return getattr(created, "version", "new")
