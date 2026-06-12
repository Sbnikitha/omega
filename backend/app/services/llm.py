from __future__ import annotations

import json
import re
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings
from langfuse import observe

from app.langfuse_client import get_langfuse


def _demo_response(prompt_name: str, variables: dict[str, Any]) -> dict[str, Any]:
    service = json.loads(variables.get("event_json", "{}")).get("service", "auth")
    if prompt_name == "observer-classify":
        return {
            "event_type": "connection_pool_exhaustion",
            "severity_label": "HIGH",
            "summary": f"Detected anomaly on {service}",
        }
    if prompt_name == "scientist-root-cause":
        return {
            "root_cause": "connection_pool_exhaustion",
            "confidence": 0.91,
            "affected_services": [service, "api-gateway", "frontend"],
            "reasoning": "Connection pool saturation propagated upstream via dependency graph.",
        }
    if prompt_name == "simulator-scenarios":
        return {
            "scenarios": [
                {
                    "id": "scale-pool",
                    "action": "Scale connection pool + drain stale connections",
                    "predicted_impact": "Latency -40%, error rate -60%",
                    "risk_score": 0.2,
                },
                {
                    "id": "rollback",
                    "action": "Rollback last deploy",
                    "predicted_impact": "Restores baseline, 5min downtime",
                    "risk_score": 0.45,
                },
            ],
            "recommended_scenario_id": "scale-pool",
            "risk_score": 0.2,
        }
    if prompt_name == "response-actions":
        return {
            "actions": [
                {
                    "id": "pagerduty",
                    "type": "pagerduty",
                    "target": service,
                    "description": "Create PagerDuty incident",
                    "risk": 0.1,
                },
                {
                    "id": "scale",
                    "type": "scale",
                    "target": service,
                    "description": "Scale connection pool to 200",
                    "risk": 0.25,
                },
            ],
            "recommended_action_id": "scale",
            "requires_human_approval": True,
            "rationale": "High severity requires human approval before pool scaling.",
        }
    return {}


@observe(name="llm_invoke")
def invoke_structured(prompt_name: str, system_prompt: str, user_payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    if not settings.llm_enabled:
        return _demo_response(prompt_name, user_payload)

    llm = ChatGoogleGenerativeAI(
        model=settings.omega_model,
        google_api_key=settings.google_api_key,
        temperature=0.2,
    )
    response = llm.invoke(
        [
            SystemMessage(content=system_prompt),
            HumanMessage(content=json.dumps(user_payload, indent=2)),
        ]
    )
    text = response.content if isinstance(response.content, str) else str(response.content)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return {"raw": text}


@observe(name="llm_judge")
def invoke_judge(judge_prompt: str, content: str) -> float:
    settings = get_settings()
    if not settings.llm_enabled:
        return 0.82

    llm = ChatGoogleGenerativeAI(
        model=settings.omega_model,
        google_api_key=settings.google_api_key,
        temperature=0.0,
    )
    response = llm.invoke(
        [
            SystemMessage(content=judge_prompt),
            HumanMessage(content=content),
        ]
    )
    text = response.content if isinstance(response.content, str) else str(response.content)
    match = re.search(r"0?\.\d+|1\.0|1|0", text)
    if match:
        return max(0.0, min(1.0, float(match.group())))
    return 0.5


def flush_langfuse() -> None:
    lf = get_langfuse()
    if lf:
        lf.flush()
