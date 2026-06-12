from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger("omega.airbyte")

AIRBYTE_API = "https://api.airbyte.ai"
RSS_DEFINITION_ID = "0efee448-6948-49e2-b786-17db50647908"

_token_cache: tuple[str, float] | None = None


def airbyte_is_active() -> bool:
    settings = get_settings()
    if settings.airbyte_access_token:
        return True
    return bool(settings.airbyte_client_id and settings.airbyte_client_secret)


def _access_token() -> str | None:
    global _token_cache
    settings = get_settings()
    if settings.airbyte_access_token:
        return settings.airbyte_access_token
    if not settings.airbyte_client_id or not settings.airbyte_client_secret:
        return None
    if _token_cache and time.time() < _token_cache[1]:
        return _token_cache[0]

    settings = get_settings()
    try:
        with httpx.Client(timeout=20.0) as client:
            resp = client.post(
                f"{AIRBYTE_API}/api/v1/account/applications/token",
                json={
                    "client_id": settings.airbyte_client_id,
                    "client_secret": settings.airbyte_client_secret,
                },
            )
            resp.raise_for_status()
            token = resp.json()["access_token"]
            _token_cache = (token, time.time() + 840)
            return token
    except Exception as exc:
        logger.warning("Airbyte token failed: %s", exc)
        return None


def _auth_headers() -> dict[str, str] | None:
    token = _access_token()
    if not token:
        return None
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def search_status_context(query: str, *, limit: int = 8) -> dict[str, Any]:
    """
    Query Airbyte Agent Engine context store for open-web outage signals.
    Falls back to curated RSS URLs when API unavailable.
    """
    settings = get_settings()
    headers = _auth_headers()
    connector_id = settings.airbyte_connector_id

    if headers and connector_id:
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(
                    f"{AIRBYTE_API}/api/v1/integrations/connectors/{connector_id}/execute",
                    headers=headers,
                    json={
                        "entity": "items",
                        "action": "context_store_search",
                        "params": {
                            "query": {"filter": {"contains": {"title": query}}},
                            "limit": limit,
                        },
                    },
                )
                if resp.status_code < 400:
                    data = resp.json()
                    return {
                        "ok": True,
                        "via": "airbyte_context_store",
                        "query": query,
                        "items": data.get("items") or data.get("data") or data,
                    }
        except Exception as exc:
            logger.warning("Airbyte search failed: %s", exc)

    # Demo fallback: live RSS list via public status feeds
    feeds = [
        settings.airbyte_rss_url,
        "https://www.githubstatus.com/history.rss",
        "https://status.aws.amazon.com/rss/all.rss",
    ]
    snippets: list[dict[str, str]] = []
    for feed in feeds:
        if not feed:
            continue
        try:
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                r = client.get(feed, headers={"User-Agent": "OMEGA-Agent/1.0"})
                if r.status_code < 400 and query.lower() in r.text.lower():
                    snippets.append({"feed": feed, "match": query, "bytes": str(len(r.text))})
        except Exception:
            continue

    return {
        "ok": bool(snippets),
        "via": "rss_fallback",
        "query": query,
        "feeds_matched": snippets,
        "note": "Set AIRBYTE_CLIENT_ID/SECRET + AIRBYTE_CONNECTOR_ID for live Agent Engine",
    }


def ingest_context_for_service(service: str, *, source_url: str | None = None) -> dict[str, Any]:
    """Observer hook: pull open-web context for a service."""
    query = service.replace("-", " ")
    if source_url:
        query = source_url.split("/")[-1] or query
    return search_status_context(query, limit=5)
