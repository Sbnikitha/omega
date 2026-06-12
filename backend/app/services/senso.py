from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger("omega.senso")

SENSO_BASE_DEFAULT = "https://apiv2.senso.ai/api/v1"


def senso_is_active() -> bool:
    settings = get_settings()
    return bool(settings.senso_api_key)


def _headers() -> dict[str, str]:
    settings = get_settings()
    return {
        "X-API-Key": settings.senso_api_key,
        "Content-Type": "application/json",
    }


def _base() -> str:
    settings = get_settings()
    return settings.senso_base_url.rstrip("/")


def ingest_kb(title: str, text: str) -> dict[str, Any] | None:
    """Ingest markdown into Senso org KB for grounding."""
    if not senso_is_active():
        return None
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{_base()}/org/kb/raw",
                headers=_headers(),
                json={"title": title, "text": text},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("Senso KB ingest failed: %s", exc)
        return {"error": str(exc)}


def publish_to_cited_md(
    *,
    markdown: str,
    seo_title: str,
    summary: str,
    geo_question_id: str | None = None,
) -> dict[str, Any]:
    """
    Publish to cited.md network via Senso engine.
    Falls back to draft endpoint when geo_question_id is missing.
    """
    if not senso_is_active():
        return {"published": False, "reason": "SENSO_API_KEY not set"}

    settings = get_settings()
    qid = geo_question_id or settings.senso_geo_question_id
    payload: dict[str, Any] = {
        "raw_markdown": markdown,
        "seo_title": seo_title,
        "summary": summary,
    }
    if qid:
        payload["geo_question_id"] = qid

    try:
        with httpx.Client(timeout=45.0) as client:
            endpoint = "/org/engine/publish" if qid else "/org/engine/draft"
            resp = client.post(f"{_base()}{endpoint}", headers=_headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()
            data["published"] = True
            data["endpoint"] = endpoint
            logger.info("Senso publish ok via %s", endpoint)
            return data
    except Exception as exc:
        logger.warning("Senso publish failed: %s", exc)
        return {"published": False, "error": str(exc)}
