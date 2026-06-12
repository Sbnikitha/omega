from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger("omega.pioneer")

PIONEER_OPENAI_BASE = "https://api.pioneer.ai/v1"
PIONEER_INFERENCE_URL = "https://api.pioneer.ai/inference"


def pioneer_is_active() -> bool:
    settings = get_settings()
    return bool(settings.pioneer_api_key) and not settings.omega_demo_mode


def extract_entities(text: str, *, schema: dict[str, Any] | None = None) -> dict[str, Any]:
    """Structured entity extraction via Pioneer native inference API."""
    if not pioneer_is_active():
        return {}

    settings = get_settings()
    body = {
        "model_id": settings.pioneer_model_id,
        "text": text[:8000],
        "schema": schema or {
            "entities": ["service", "root_cause", "severity", "company"],
        },
        "threshold": 0.5,
    }
    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(
                PIONEER_INFERENCE_URL,
                headers={"X-API-Key": settings.pioneer_api_key},
                json=body,
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("Pioneer inference failed: %s", exc)
        return {"error": str(exc)}


def openai_client():
    """OpenAI-compatible client pointed at Pioneer."""
    from openai import OpenAI

    settings = get_settings()
    return OpenAI(
        base_url=PIONEER_OPENAI_BASE,
        api_key=settings.pioneer_api_key,
    )
