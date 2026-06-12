#!/usr/bin/env python3
"""Upload OMEGA agent prompts to Langfuse Prompt Management."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from app.config import get_settings  # noqa: E402
from app.services.prompt_manager import FALLBACK_PROMPTS, create_prompt_version  # noqa: E402


def main() -> None:
    settings = get_settings()
    if not settings.langfuse_enabled:
        print("Langfuse keys not configured. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY in .env")
        sys.exit(1)

    for name, text in FALLBACK_PROMPTS.items():
        version = create_prompt_version(name, text, labels=["production"])
        print(f"Uploaded prompt {name} -> version {version}")

    print("All prompts uploaded to Langfuse Prompt Management.")


if __name__ == "__main__":
    main()
