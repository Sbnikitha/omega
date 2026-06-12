# OMEGA Sponsor Integrations — Score Analytics

Hackathon prize lane scores (0–10) based on **code integration depth** + **env configured**.

Live scores: `GET /sponsors` on the OMEGA backend.

---

## Summary table

| Sponsor | Prize | Why we use it | How integrated | Improved | Score (code) | Score (keys ON) |
|---------|-------|---------------|----------------|----------|----------------|-----------------|
| **Langfuse** | $350 impressive use | Observability + self-improvement loop | Traces, judge, human scores, prompts, optimizer, CI | +trace visibility, +approval after optimizer | **10** | **10** |
| **OpenUI** | $2,000 (2 winners) | Generative ops UI | Copilot tab, react-lang, custom components, Guide compare | −60% tokens vs markdown ops | **8** | **10** |
| **ClickHouse** | $1,600 | Safe incident store at scale | ReplacingMergeTree, migration, analytics | +indexed queries vs JSON | **6** | **9** |
| **Senso** | $2k credits | cited.md agent publishing | `POST /org/engine/publish` on approve/replay | +discoverable agent output | **6** | **9** |
| **Guild.ai** | $2,800 | Production agent control plane | Incident Commander agent + OpenAPI | +versioned deploy vs raw REST | **7** | **8** |
| **Pioneer** | $500 | Vendor-neutral inference | Entity extraction + optional LLM backend | +typed RCA entities | **5** | **8** |
| **Composio** | $200 execution | Open-web tool execution | `fetch_url` in Observer, proxy API | +grounded postmortem context | **6** | **8** |
| **Airbyte** | $1,750 | Open-web context ingestion | Agent Engine search in Observer (+ RSS fallback) | +live status signals | **5** | **8** |
| **TrueFoundry** | $1k credits | Prod deploy for LangGraph | `truefoundry/agent_server.py` + deploy spec | +managed service deploy | **5** | **7** |
| **Render** | credits | Public judge demo | `render.yaml` two-service blueprint | +public URL | **6** | **8** |

---

## Guild.ai — detailed

### Why LangGraph + Guild (not either/or)

```
Operator → Guild Incident Commander (typed, versioned, published)
              ↓ REST + x402
         OMEGA FastAPI
              ↓
    LangGraph swarm: Observer → Scientist → Simulator → Response
              ↓
    Langfuse trace · Senso cited.md · ClickHouse store
```

| Layer | Tool | Role |
|-------|------|------|
| Reasoning | **LangGraph** | Multi-agent RCA pipeline |
| Control plane | **Guild.ai** | Ship, version, credential-manage operator agent |
| Observability | **Langfuse** | Trace every agent span |
| Publish | **Senso** | cited.md network |
| Store | **ClickHouse** | Incident analytics |

### How we use Guild

1. **`guild/omega-commander/agent.ts`** — typed commander agent
2. Calls `POST /public-incidents/{id}/replay` with `X-402-Payment`
3. Publish: `guild agent save --message "v1" --wait --publish`
4. **`docs/guild-openapi.yaml`** — optional typed Guild integration

### Score analytics (Guild track)

| Metric | Before | After |
|--------|--------|-------|
| Guild prize fit | 2/10 | **8/10** |
| Agent versioning | None | Guild publish flow |
| Multi-agent narrative | Internal swarm only | Commander + swarm |
| Demo surface | curl | Guild agent test |

---

## Per-sponsor env vars

```bash
# Senso
SENSO_API_KEY=tgr_...
SENSO_GEO_QUESTION_ID=...

# Pioneer
PIONEER_API_KEY=pio_sk_...
PIONEER_AS_LLM=true          # optional: route LLM via Pioneer OpenAI API

# Composio
COMPOSIO_API_KEY=...

# Airbyte Agent Engine
AIRBYTE_CLIENT_ID=...
AIRBYTE_CLIENT_SECRET=...
AIRBYTE_CONNECTOR_ID=...     # RSS connector in your workspace

# TrueFoundry
TFY_HOST=https://<org>.truefoundry.cloud
TFY_API_KEY=...

# Render — connect repo, uses render.yaml
# Guild — guild CLI + OMEGA_API_URL credential in Guild UI
```

---

## Recommended 3-minute demo order

1. **Guild** — `guild agent test` replay (or show published agent)
2. **Incidents** — public postmortem + OMEGA RCA compare
3. **Guide** — sponsor score panel + Langfuse/CH/OpenUI toggles
4. **Copilot** — OpenUI generative UI
5. **Senso** — show cited.md publish (`GET /cited`)
6. **Langfuse** — live trace + approve → score

---

## API endpoints (sponsor tooling)

| Endpoint | Sponsor |
|----------|---------|
| `GET /sponsors` | All — score analytics |
| `GET /cited` | Senso |
| `GET /tools/fetch-url?url=` | Composio |
| `GET /tools/airbyte-context?service=` | Airbyte |
| `POST /public-incidents/{id}/replay` | Guild + x402 |
| `GET /health` | All — feature flags |
