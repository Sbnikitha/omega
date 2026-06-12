from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlparse

import httpx

from app.config import get_settings

logger = logging.getLogger("omega.composio")

COMPOSIO_PROXY_URL = "https://backend.composio.dev/api/v3/tools/execute/proxy"


def composio_is_active() -> bool:
    return bool(get_settings().composio_api_key)


def fetch_url(url: str) -> dict[str, Any]:
    """
    Fetch open-web URL for postmortem grounding.
    Uses Composio proxy when configured; otherwise direct httpx GET.
    """
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return {"ok": False, "error": "invalid URL scheme"}

    settings = get_settings()
    if composio_is_active():
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(
                    COMPOSIO_PROXY_URL,
                    headers={"x-api-key": settings.composio_api_key},
                    json={
                        "endpoint": url,
                        "method": "GET",
                        "parameters": [],
                    },
                )
                if resp.status_code < 400:
                    data = resp.json()
                    body = data.get("data") or data.get("body") or data
                    text = body if isinstance(body, str) else str(body)
                    return {
                        "ok": True,
                        "url": url,
                        "via": "composio_proxy",
                        "snippet": text[:4000],
                        "length": len(text),
                    }
        except Exception as exc:
            logger.warning("Composio proxy fetch failed, falling back: %s", exc)

    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            resp = client.get(url, headers={"User-Agent": "OMEGA-Agent/1.0"})
            resp.raise_for_status()
            text = resp.text
            return {
                "ok": True,
                "url": url,
                "via": "direct",
                "snippet": text[:4000],
                "length": len(text),
            }
    except Exception as exc:
        return {"ok": False, "url": url, "error": str(exc)}


def fetch_postmortem_context(source_url: str | None, *, service: str) -> dict[str, Any]:
    """Fetch postmortem page or GitHub status context for Observer/Scientist."""
    if source_url:
        result = fetch_url(source_url)
        result["service"] = service
        return result

    status_feeds = {
        "github": "https://www.githubstatus.com/history.rss",
        "cloudflare": "https://www.cloudflarestatus.com/history.rss",
        "aws": "https://status.aws.amazon.com/rss/all.rss",
    }
    feed = status_feeds.get(service.lower())
    if feed:
        feed_result = fetch_url(feed)
        feed_result["service"] = service
        feed_result["feed"] = feed
        return feed_result

    return {"ok": False, "service": service, "reason": "no source URL or known status feed"}
