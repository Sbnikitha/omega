"""
TrueFoundry deploy entrypoint for OMEGA LangGraph backend.

Usage:
  pip install truefoundry
  tfy login --host $TFY_HOST --api-key $TFY_API_KEY
  python truefoundry/deploy.py

Or deploy via TrueFoundry UI with:
  start: uvicorn truefoundry.agent_server:app --host 0.0.0.0 --port 8000
  health: /health
"""
from __future__ import annotations

import os

SERVICE_NAME = os.getenv("TFY_SERVICE_NAME", "omega-langgraph-agent")
START_COMMAND = "uvicorn truefoundry.agent_server:app --host 0.0.0.0 --port 8000"
HEALTH_PATH = "/health"

DEPLOY_SPEC = {
    "name": SERVICE_NAME,
    "image": {"type": "build", "build_source": {"type": "local", "project_path": "backend"}},
    "ports": [{"port": 8000, "protocol": "TCP"}],
    "env": {
        "TFY_SERVICE_ROOT_PATH": "",
        "LANGFUSE_PUBLIC_KEY": "${LANGFUSE_PUBLIC_KEY}",
        "GOOGLE_API_KEY": "${GOOGLE_API_KEY}",
        "PIONEER_API_KEY": "${PIONEER_API_KEY}",
        "SENSO_API_KEY": "${SENSO_API_KEY}",
        "COMPOSIO_API_KEY": "${COMPOSIO_API_KEY}",
    },
    "resources": {"cpu_request": 0.5, "memory_request": 1024},
    "readiness_probe": {"path": HEALTH_PATH, "port": 8000},
    "liveness_probe": {"path": HEALTH_PATH, "port": 8000},
}

if __name__ == "__main__":
    print("TrueFoundry deploy spec for OMEGA:")
    print(f"  service: {SERVICE_NAME}")
    print(f"  start:   {START_COMMAND}")
    print(f"  health:  {HEALTH_PATH}")
    print("\nSet TFY_HOST + TFY_API_KEY then deploy via TrueFoundry UI or CLI.")
    print("See https://www.truefoundry.com/docs/deploy-service-programatically")
