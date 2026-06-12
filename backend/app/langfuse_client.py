from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any, Generator
from uuid import uuid4

from langfuse import Langfuse, observe

from app.config import get_settings

logger = logging.getLogger(__name__)

_langfuse: Langfuse | None = None


def get_langfuse() -> Langfuse | None:
    global _langfuse
    settings = get_settings()
    if not settings.langfuse_enabled:
        return None
    if _langfuse is None:
        _langfuse = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
        )
    return _langfuse


@contextmanager
def incident_trace(
    incident_id: str,
    *,
    name: str = "omega-incident",
    input_data: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
    tags: list[str] | None = None,
) -> Generator[str, None, None]:
    """Create a root trace for an incident. Yields trace_id."""
    lf = get_langfuse()
    trace_id = incident_id
    if lf is None:
        yield trace_id
        return

    with lf.start_as_current_observation(
        as_type="span",
        name=name,
        trace_context={"trace_id": trace_id},
        input=input_data,
        metadata=metadata or {},
    ) as span:
        span.update_trace(
            name=name,
            user_id="omega-operator",
            session_id=incident_id,
            tags=tags or ["omega", "incident"],
            input=input_data,
        )
        try:
            yield trace_id
        finally:
            lf.flush()


def score_trace(
    trace_id: str,
    name: str,
    value: float,
    *,
    comment: str | None = None,
    observation_id: str | None = None,
    data_type: str = "NUMERIC",
) -> None:
    lf = get_langfuse()
    if lf is None:
        logger.info("Langfuse score (offline): %s=%s on %s", name, value, trace_id)
        return
    lf.create_score(
        trace_id=trace_id,
        observation_id=observation_id,
        name=name,
        value=value,
        comment=comment,
        data_type=data_type,
    )
    lf.flush()


def add_dataset_item(
    dataset_name: str,
    *,
    input_data: dict[str, Any],
    expected_output: dict[str, Any],
    metadata: dict[str, Any] | None = None,
    item_id: str | None = None,
) -> None:
    lf = get_langfuse()
    if lf is None:
        logger.info("Dataset item (offline): %s", dataset_name)
        return
    try:
        lf.create_dataset(name=dataset_name)
    except Exception:
        pass
    lf.create_dataset_item(
        dataset_name=dataset_name,
        id=item_id or str(uuid4()),
        input=input_data,
        expected_output=expected_output,
        metadata=metadata or {},
    )
    lf.flush()


__all__ = ["get_langfuse", "observe", "incident_trace", "score_trace", "add_dataset_item"]
