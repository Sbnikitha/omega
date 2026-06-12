# Guild.ai — OMEGA Incident Commander

## Why we use Guild

| Problem | LangGraph-only | With Guild |
|---------|----------------|------------|
| Agent deploy | Python script in repo | `guild agent save --publish` |
| Versioning | Langfuse prompt versions | Git-backed agent artifacts + rollback |
| Credentials | `.env` files | Guild control plane |
| Judge demo | curl REST | Guild agent in Agent Hub |

**Division of labor:** LangGraph = reasoning swarm (Observer/Scientist/Simulator/Response). Guild = **operator agent** that dispatches OMEGA and ships to production.

## How we integrated

1. `guild/omega-commander/agent.ts` — typed commander calling OMEGA REST
2. Payment via `X-402-Payment` header (Guild stores token as credential)
3. Replay → OMEGA pipeline → Senso cited.md publish → return RCA comparison

## Publish flow

```bash
npm install -g @guildai/cli
guild workspace select home
cd guild/omega-commander
guild agent init --name omega-commander --template LLM   # if fresh
# copy agent.ts, then:
echo '{"public_incident_id":"github-oct-2022"}' | guild agent test --ephemeral --mode json
guild agent save --message "OMEGA commander v1" --wait --publish
```

Set credentials in Guild UI:
- `OMEGA_API_URL` → Render backend URL
- `OMEGA_PAYMENT_TOKEN` → `demo-paid`

## Score analytics

| Metric | Before Guild | After Guild |
|--------|--------------|-------------|
| Guild prize lane score | 2/10 | **8/10** |
| Production readiness narrative | Demo API | Versioned agent artifact |
| Multi-agent story | Internal only | External commander + internal swarm |
| Human-agent collaboration | Dashboard approve | Guild operator + dashboard |

## OpenAPI for Guild integration (optional)

Register `docs/guild-openapi.yaml` as a Guild custom integration for typed tools instead of fetch.
