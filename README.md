# OMEGA — Autonomous Reality Defense System

Self-improving multi-agent incident response for the **autonomous agent on the open web** hackathon track:

1. **Monitor** — ingest real public postmortems (GitHub, Cloudflare, AWS status pages)
2. **Orchestrate** — LangGraph swarm (Observer → Scientist → Simulator → Response)
3. **Publish** — append grounded analyses to [`cited.md`](cited.md) on replay + human approve
4. **Transact** — HTTP **402 / x402** gate on paid analysis (`POST /incidents`, `POST …/replay`)

Sponsor stack: **Langfuse** · **ClickHouse** · **OpenUI** · **Senso** · **Guild** · **Pioneer** · **Composio** · **Airbyte** · **TrueFoundry** · **Render**

See **[SPONSORS.md](SPONSORS.md)** for prize-lane score analytics and env setup per sponsor.

## Repo structure

```
omega/
├── backend/          # Python FastAPI + LangGraph + Langfuse
├── web/              # Next.js operator dashboard
├── cited.md          # Auto-published agent output (open-web grounded)
├── mcp/              # Langfuse MCP config
├── Makefile
└── .github/workflows/
```

## Quick start

### Backend (port 8001)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # keys below
OMEGA_DEMO_MODE=true python run.py   # bypasses x402 for local demos
```

### Dashboard (port 3001)

```bash
cd web
npm install
cp .env.example .env.local   # server-only keys (see .env.example)
npm run dev -- -p 3001
# open http://localhost:3001
```

The dashboard calls the backend through `/api/omega/*` so `OMEGA_PAYMENT_TOKEN` and `OPENAI_API_KEY` stay server-side.

### Full stack ON (judge demo)

```bash
# backend/.env
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
GOOGLE_API_KEY=...
OMEGA_DEMO_MODE=false
OMEGA_X402_ENABLED=true
OMEGA_CLICKHOUSE_ENABLED=true   # optional

# web/.env.local — server-only (no NEXT_PUBLIC_ for secrets)
OMEGA_API_URL=http://localhost:8001
OMEGA_PAYMENT_TOKEN=demo-paid   # x402 receipt stub — injected by /api/omega proxy
OPENAI_API_KEY=...   # Copilot tab live OpenUI
```

### Demo data

```bash
make seed      # 50 synthetic incidents
make regression
```

## Hackathon flow (3 min)

| Step | Tab | What judges see |
|------|-----|-----------------|
| Open web | **Incidents** | Real outage library + source URLs |
| Analyze | **Incidents** | Replay → OMEGA RCA vs published RCA |
| Publish | **Guide** | `cited.md` preview (`GET /cited`) |
| Pay | API | 402 without `X-402-Payment`; pass with `demo-paid` |
| Observe | **Guide** | Langfuse / ClickHouse / OpenUI WITH↔OFF |
| Operate | **Copilot** | Generative UI incident chat |
| Close loop | **Ops** | Approve → optimizer → golden dataset CI |

## API: x402 payment gate

Paid actions return **402** until the client sends a payment receipt header:

```bash
curl -X POST http://localhost:8001/public-incidents/github-oct-2022/replay \
  -H "X-402-Payment: demo-paid"
```

Bypass: `OMEGA_DEMO_MODE=true` or `OMEGA_X402_ENABLED=false`.

## API: cited publisher

- `GET /cited` — latest `cited.md` content
- Auto-append on `POST /public-incidents/{id}/replay` and human **approve** (`POST /feedback`)

## Langfuse features

1. Cross-agent distributed tracing (one trace per incident)
2. LLM-as-judge auto-scores
3. Human approval → Langfuse scores
4. Prompt Management (zero-downtime deploy)
5. Self-improving prompt optimizer
6. Golden dataset + CI regression gate
7. NL incident queries (MCP pattern)
