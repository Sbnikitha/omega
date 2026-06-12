#!/usr/bin/env bash
# Single Render web service: FastAPI (internal) + Next.js (public PORT)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_PORT="${OMEGA_INTERNAL_PORT:-8001}"

cleanup() {
  if [[ -n "${BPID:-}" ]]; then
    kill "$BPID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

cd "$ROOT/backend"
OMEGA_RELOAD=false OMEGA_API_HOST=127.0.0.1 OMEGA_API_PORT="$BACKEND_PORT" python3 run.py &
BPID=$!

echo "Waiting for OMEGA backend on :${BACKEND_PORT}..."
for _ in $(seq 1 45); do
  if curl -sf "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null 2>&1; then
    echo "Backend ready."
    break
  fi
  sleep 1
done

export OMEGA_API_URL="http://127.0.0.1:${BACKEND_PORT}"
cd "$ROOT/web"
exec npm start
