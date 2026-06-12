#!/usr/bin/env python3
"""One-shot KB ingest for OMEGA Senso onboarding."""
from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FOLDERS = {
    "company-overview": "3d6b6d75-facb-4669-94e0-4c57ea2445f4",
    "products-and-services": "611b8156-b3bc-43b5-ae92-f1b8488a95a9",
    "competitive-landscape": "0480c5d0-6d7a-4c3e-b06c-f75f3f8461e5",
    "industry-context": "e257e87c-bebe-4551-bf8f-26766c910fb1",
    "case-studies": "3a31f3e4-db84-4a67-bb6f-201dc16b525e",
    "faqs": "dda1c668-0799-4540-bd43-84fe4c219c5a",
}

DOCS: list[tuple[str, str, str]] = [
    (
        "company-overview",
        "2026-06-12 - OMEGA Overview",
        """Source: https://github.com/omega/README.md

OMEGA (Autonomous Reality Defense System) is a self-improving multi-agent incident response platform.
Flow: Monitor public postmortems → LangGraph swarm → Publish cited.md → Transact via HTTP 402/x402.
""",
    ),
    (
        "company-overview",
        "2026-06-12 - Agent Swarm Architecture",
        """Source: OMEGA backend app/agents/graph.py

Four agents: Observer (classify), Scientist (root cause), Simulator (digital twin), Response (action plan).
Human gate approves or rejects; Langfuse traces every span with quality scores.
""",
    ),
    (
        "products-and-services",
        "2026-06-12 - Ops Dashboard",
        """Source: OMEGA web/

Next.js dashboard with Incidents, Guide, and Ops center tabs. Public postmortem library, live replay, RCA comparison, sponsor stack analytics.
""",
    ),
    (
        "products-and-services",
        "2026-06-12 - x402 Paid Analysis",
        """Source: OMEGA backend app/services/payment.py

POST /incidents and POST /public-incidents/{id}/replay return HTTP 402 until X-402-Payment header is present.
Demo token: demo-paid. Pairs with Senso cited.md publishing on approve.
""",
    ),
    (
        "products-and-services",
        "2026-06-12 - Langfuse Observability Loop",
        """Source: OMEGA Langfuse integration

Single trace_id spans all agents. LLM-as-judge scores, human feedback to golden dataset, prompt optimizer, CI regression gate.
""",
    ),
    (
        "competitive-landscape",
        "2026-06-12 - vs Manual Bridge RCA",
        """Source: OMEGA Guide analytics

Without observability loop: ~45 min debug, ~61% approval. With Langfuse loop: ~4 min trace debug, ~89% approval after optimizer.
""",
    ),
    (
        "competitive-landscape",
        "2026-06-12 - vs Generic LLM Chatbot",
        """Source: OMEGA architecture

Generic chatbots lack structured swarm, open-web grounding, human gate, cited publish, and columnar incident store.
""",
    ),
    (
        "industry-context",
        "2026-06-12 - SEV1 Incident Response Trends",
        """Source: public postmortems library

Real outages from GitHub, Cloudflare, AWS, Google Gmail ingested as curated public_incidents.json for grounded replay.
""",
    ),
    (
        "industry-context",
        "2026-06-12 - Agentic Web Stack",
        """Source: OMEGA backend sponsor analytics (GET /sponsors)

Integrations: Langfuse, ClickHouse, OpenUI, Senso, Guild, Pioneer, Composio, Airbyte, TrueFoundry, Render.
""",
    ),
    (
        "case-studies",
        "2026-06-12 - GitHub October 2022 Outage Replay",
        """Source: public postmortems

OMEGA replays published GitHub outage RCA, compares OMEGA swarm output vs original postmortem, publishes approved analysis to cited.md.
""",
    ),
    (
        "case-studies",
        "2026-06-12 - Google Gmail Outage What-If",
        """Source: OMEGA Incidents tab

What-if panel estimates MTTR and cost savings when OMEGA multi-agent pipeline handles major email outages.
""",
    ),
    (
        "faqs",
        "2026-06-12 - FAQ What is OMEGA",
        """Source: OMEGA README

Q: What is OMEGA? A: Multi-agent incident response with LangGraph, Langfuse observability, Senso publish, and x402 transact.
""",
    ),
    (
        "faqs",
        "2026-06-12 - FAQ How to run locally",
        """Source: OMEGA README

Backend: port 8001. Web: port 3001. Set LANGFUSE keys, GOOGLE_API_KEY, SENSO_API_KEY in backend/.env.
""",
    ),
]

PROMPTS = [
    ("awareness", "What is OMEGA and what does it do for incident response?"),
    ("awareness", "What is autonomous multi-agent incident response?"),
    ("awareness", "How do AI agents help SRE teams during SEV1 outages?"),
    ("awareness", "What is the open web agent workflow for postmortems?"),
    ("awareness", "What is cited.md agent publishing?"),
    ("awareness", "What is HTTP 402 x402 agent payment gating?"),
    ("awareness", "What is LangGraph used for in OMEGA?"),
    ("awareness", "What is Langfuse observability for LLM agents?"),
    ("awareness", "What public outages does OMEGA replay?"),
    ("awareness", "What is a digital twin in incident simulation?"),
    ("consideration", "How does OMEGA compare to manual bridge RCA?"),
    ("consideration", "How does OMEGA compare to a generic ChatGPT incident bot?"),
    ("consideration", "OMEGA vs PagerDuty-only workflows"),
    ("consideration", "OMEGA vs runbook-only incident response"),
    ("consideration", "How does OMEGA use Composio for open-web grounding?"),
    ("consideration", "How does OMEGA use Airbyte for status RSS context?"),
    ("consideration", "Why use ClickHouse for incident storage in OMEGA?"),
    ("consideration", "Why use Senso to publish agent output?"),
    ("consideration", "Why use Guild with OMEGA LangGraph?"),
    ("consideration", "Why use Pioneer for structured RCA entities?"),
    ("evaluation", "How do I evaluate OMEGA for my SRE team?"),
    ("evaluation", "What is the OMEGA implementation process locally?"),
    ("evaluation", "How does OMEGA human-in-the-loop approval work?"),
    ("evaluation", "How does OMEGA prompt optimization use Langfuse traces?"),
    ("evaluation", "How accurate is OMEGA root cause analysis?"),
    ("evaluation", "How does OMEGA simulator reduce prod risk?"),
    ("evaluation", "What observability do I get from OMEGA Langfuse traces?"),
    ("evaluation", "How does OMEGA ingest public postmortems?"),
    ("evaluation", "What security model does OMEGA x402 gate provide?"),
    ("evaluation", "How does OMEGA store incidents in ClickHouse?"),
    ("decision", "What results can teams expect from OMEGA incident replay?"),
    ("decision", "What does OMEGA cost per incident analysis with x402?"),
    ("decision", "How fast is OMEGA pipeline vs manual RCA?"),
    ("decision", "What approval rate improvement does Langfuse loop provide?"),
    ("decision", "How do I deploy OMEGA on Render and TrueFoundry?"),
    ("decision", "What is published to cited.md after human approve?"),
    ("decision", "Can OMEGA run paid public incident replay APIs?"),
    ("decision", "What MTTR savings does OMEGA estimate on major outages?"),
    ("decision", "How do I start OMEGA backend and dashboard?"),
    ("decision", "What sponsor stack powers OMEGA in production?"),
]


def run(args: list[str]) -> str:
    env = os.environ.copy()
    key = env.get("SENSO_API_KEY") or ""
    if key:
        env["SENSO_API_KEY"] = key
    proc = subprocess.run(args, capture_output=True, text=True, env=env)
    out = (proc.stdout or "") + (proc.stderr or "")
    if proc.returncode != 0 and "409" not in out and "already exists" not in out.lower():
        raise RuntimeError(f"Command failed: {' '.join(args)}\n{out}")
    return out


def main() -> None:
    for folder, title, text in DOCS:
        data = json.dumps(
            {"title": title, "text": text, "kb_folder_node_id": FOLDERS[folder]}
        )
        run(["senso", "kb", "create-raw", "--data", data, "--output", "json", "--quiet"])
        print(f"ingested: {title}")

    for ptype, question in PROMPTS:
        data = json.dumps({"question_text": question, "type": ptype})
        try:
            run(["senso", "prompts", "create", "--data", data, "--output", "json", "--quiet"])
        except RuntimeError:
            pass
        print(f"prompt: {ptype} - {question[:50]}...")


if __name__ == "__main__":
    main()
