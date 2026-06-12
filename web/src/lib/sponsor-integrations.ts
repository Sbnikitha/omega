export type EnvVarSetup = {
  var: string;
  required?: boolean;
  hint?: string;
};

export type SponsorIntegration = {
  id: string;
  name: string;
  category: string;
  accent: string;
  why: string;
  without: string[];
  with: string[];
  outcome: string;
  inOmega: string[];
  healthKey?: string;
  /** Code is wired; live requires env keys */
  alwaysIntegrated?: boolean;
  /** Vars in omega/backend/.env — health.sponsors[id] turns true when set */
  envSetup?: EnvVarSetup[];
  setupNote?: string;
};

/** All keys to flip integrations from "needs keys" → live (backend/.env) */
export const BACKEND_ENV_SETUP: EnvVarSetup[] = [
  { var: "OMEGA_DEMO_MODE", required: true, hint: "false — required for real LLM + Pioneer live checks" },
  { var: "GOOGLE_API_KEY", required: true, hint: "Gemini — powers the agent swarm" },
  { var: "LANGFUSE_PUBLIC_KEY", required: true },
  { var: "LANGFUSE_SECRET_KEY", required: true },
  { var: "LANGFUSE_HOST", hint: "https://cloud.langfuse.com" },
  { var: "SENSO_API_KEY" },
  { var: "PIONEER_API_KEY" },
  { var: "COMPOSIO_API_KEY" },
  { var: "AIRBYTE_CLIENT_ID" },
  { var: "AIRBYTE_CLIENT_SECRET" },
  { var: "AIRBYTE_CONNECTOR_ID", hint: "optional — RSS fallback works without" },
  { var: "OMEGA_CLICKHOUSE_ENABLED", hint: "true + running ClickHouse" },
  { var: "CLICKHOUSE_HOST", hint: "localhost when using local CH" },
  { var: "OPENAI_API_KEY", hint: "OpenUI streaming + optional LLM fallback" },
  { var: "TFY_API_KEY" },
  { var: "TFY_HOST" },
];

export const SPONSOR_INTEGRATIONS: SponsorIntegration[] = [
  {
    id: "langfuse",
    name: "Langfuse",
    category: "Observability & prompt lifecycle",
    accent: "#a78bfa",
    why: "A four-agent incident pipeline is impossible to debug or improve without a shared trace, quality scores, and a closed feedback loop from human operators.",
    without: [
      "Black-box LLM chain — no visibility into which agent failed",
      "Human rejections never reach training data",
      "Prompt changes require redeploy; regressions slip through",
    ],
    with: [
      "Single trace_id spans Observer → Scientist → Simulator → Response",
      "LLM-as-judge scores every run (quality, realism, safety)",
      "Human approve/reject writes scores + golden dataset items",
      "Prompt optimizer deploys v+1 with zero downtime; CI regression gate",
    ],
    outcome:
      "Operators see the full cascade in one trace. Failed runs feed the optimizer — approval trend improves as prompts iterate on real rejection data.",
    inOmega: [
      "app/agents/graph.py — @observe on every agent node",
      "app/langfuse_client.py — traces, scores, datasets",
      "POST /feedback — human_approval + resolution_accuracy scores",
      ".github/workflows/omega-regression.yml — golden dataset gate",
    ],
    healthKey: "langfuse",
    envSetup: [
      { var: "LANGFUSE_PUBLIC_KEY", required: true, hint: "pk-lf-… from cloud.langfuse.com" },
      { var: "LANGFUSE_SECRET_KEY", required: true, hint: "sk-lf-…" },
      { var: "LANGFUSE_HOST", hint: "https://cloud.langfuse.com" },
    ],
  },
  {
    id: "clickhouse",
    name: "ClickHouse",
    category: "Columnar incident store",
    accent: "#f59e0b",
    why: "JSON files do not scale for analytics, indexed queries, or production incident retention. ClickHouse gives OMEGA a real ops datastore.",
    without: [
      "incidents.json — full-file reads for every analytics query",
      "No indexed filters by service, severity, or status",
      "Risky concurrent writes during live incidents",
    ],
    with: [
      "ReplacingMergeTree table with payload JSON + indexed columns",
      "Automatic migration from legacy JSON on first connect",
      "Sub-second analytics on 10k+ incidents (vs Python loops)",
    ],
    outcome:
      "Stack analytics and Guide comparisons show measured query latency. Storage backend switches from json_file → clickhouse when enabled.",
    inOmega: [
      "app/services/clickhouse.py — store, list, analytics",
      "OMEGA_CLICKHOUSE_ENABLED=true",
      "Guide tab — ClickHouse WITH/OFF toggle + query ms",
    ],
    healthKey: "clickhouse",
    envSetup: [
      { var: "OMEGA_CLICKHOUSE_ENABLED", required: true, hint: "true" },
      { var: "CLICKHOUSE_HOST", required: true, hint: "localhost or cloud host" },
      { var: "CLICKHOUSE_PORT", hint: "8123" },
      { var: "CLICKHOUSE_USER" },
      { var: "CLICKHOUSE_PASSWORD" },
      { var: "CLICKHOUSE_DATABASE", hint: "default" },
    ],
    setupNote: "ClickHouse server must be running — health checks a live connection.",
  },
  {
    id: "openui",
    name: "OpenUI",
    category: "Generative operator interface",
    accent: "#ec4899",
    why: "Incident commanders need structured, actionable UI during SEV1 — not markdown walls or static dashboards that lag behind the agent.",
    without: [
      "Static React panels — every new metric needs a deploy",
      "Markdown-only agent output — high token cost, slow to scan",
      "No typed components bound to incident schema",
    ],
    with: [
      "@openuidev/react-lang streaming in Guide compare + custom omega-library",
      "IncidentStatusCard, RootCauseInsight, CostSavingsChip components",
      "System prompt generated from registered component schemas",
    ],
    outcome:
      "~60% fewer tokens vs JSON-render trees for the same incident summary. Operators get approve-ready cards instead of prose.",
    inOmega: [
      "web/src/openui/omega-library.tsx — custom Lang components",
      "web/src/components/omega/OpenUICompare.tsx — WITH/OFF demo",
      "web/src/app/api/openui-chat/route.ts — streaming API",
    ],
    healthKey: "openui",
    envSetup: [
      { var: "OPENAI_API_KEY", required: true, hint: "sk-… — also set in web/.env.local for chat route" },
    ],
    setupNote: "Frontend: NEXT_PUBLIC_OMEGA_API_URL in web/.env.local",
  },
  {
    id: "senso",
    name: "Senso.ai",
    category: "cited.md agent publishing",
    accent: "#06b6d4",
    why: "Agent output must be discoverable, citable, and monetizable on the open web — not buried in a private database after human approve.",
    without: [
      "RCA lives only in OMEGA DB — not discoverable by other agents",
      "No standard publish format for agentic web",
      "No payment rail tied to published analysis",
    ],
    with: [
      "POST /org/engine/publish on human approve + public replay",
      "Local cited.md + Senso API dual publish",
      "Grounded entries link to public postmortem URLs + Langfuse trace",
    ],
    outcome:
      "Every approved incident becomes a citable artifact. Pairs with HTTP 402 / x402 gate on paid analysis endpoints.",
    inOmega: [
      "app/services/senso.py — KB ingest + engine publish",
      "app/services/cited_publisher.py — auto-append on approve/replay",
      "GET /cited — live published output",
    ],
    healthKey: "senso",
    envSetup: [
      { var: "SENSO_API_KEY", required: true, hint: "tgr_… from Senso dashboard" },
      { var: "SENSO_GEO_QUESTION_ID", hint: "optional engine question id" },
      { var: "SENSO_BASE_URL", hint: "https://apiv2.senso.ai/api/v1" },
    ],
  },
  {
    id: "guild",
    name: "Guild.ai",
    category: "Agent control plane",
    accent: "#f472b6",
    why: "LangGraph runs the reasoning swarm; production still needs versioned operator agents, credential management, and publish/rollback — Guild's control plane.",
    without: [
      "Operators call raw REST — no agent versioning",
      "API keys in .env — no governed credential scope",
      "No publish artifact for other teams to fork",
    ],
    with: [
      "Incident Commander agent (TypeScript) dispatches OMEGA REST",
      "guild agent save --publish — versioned deploy",
      "OpenAPI integration spec for typed tool calls",
    ],
    outcome:
      "Clear separation: Guild ships the operator agent; LangGraph runs RCA inside OMEGA. Multi-agent story spans control plane + reasoning layer.",
    inOmega: [
      "guild/omega-commander/agent.ts",
      "docs/guild-openapi.yaml",
      "POST /public-incidents/{id}/replay with X-402-Payment",
    ],
    healthKey: "guild",
    alwaysIntegrated: true,
    setupNote: "No backend API key — live when guild/ agent is published. See guild/README.md",
  },
  {
    id: "pioneer",
    name: "Pioneer",
    category: "Structured inference",
    accent: "#8b5cf6",
    why: "Root-cause analysis benefits from typed entity extraction and vendor-neutral LLM routing — not only free-form Gemini prose.",
    without: [
      "Unstructured LLM JSON — inconsistent RCA fields",
      "Single-vendor lock-in for all agent calls",
      "Hard to validate extracted services / causes",
    ],
    with: [
      "POST api.pioneer.ai/inference — schema-bound entity extraction in Scientist",
      "Optional OpenAI-compatible chat backend (PIONEER_AS_LLM=true)",
      "Pioneer entities attached to root_cause span metadata",
    ],
    outcome:
      "RCA outputs include typed entities (service, root_cause, severity) for downstream automation and judge-visible structure.",
    inOmega: [
      "app/services/pioneer.py — extract_entities()",
      "app/services/llm.py — Pioneer / Gemini / OpenAI routing",
    ],
    healthKey: "pioneer",
    envSetup: [
      { var: "PIONEER_API_KEY", required: true, hint: "pio_sk_… from Pioneer" },
      { var: "OMEGA_DEMO_MODE", required: true, hint: "must be false — Pioneer disabled in demo mode" },
      { var: "PIONEER_AS_LLM", hint: "true to route all LLM calls via Pioneer" },
    ],
  },
  {
    id: "composio",
    name: "Composio",
    category: "Open-web tool execution",
    accent: "#10b981",
    why: "Observer must ground classifications in real postmortem pages and status feeds — not synthetic metrics alone.",
    without: [
      "Hardcoded incident context — no live URL fetch",
      "No authenticated proxy to GitHub / status pages",
      "Response agent actions stay theoretical",
    ],
    with: [
      "composio.tools.proxy fetch_url on public postmortem URLs",
      "Observer node enriches event with composio_snippet",
      "GET /tools/fetch-url for debugging open-web grounding",
    ],
    outcome:
      "Replay of GitHub/Google outages pulls live source context into the Scientist prompt — RCA grounded in published RCA text.",
    inOmega: [
      "app/services/composio_tools.py",
      "app/agents/graph.py — observer_node open_web_context",
    ],
    healthKey: "composio",
    envSetup: [{ var: "COMPOSIO_API_KEY", required: true, hint: "from composio.dev dashboard" }],
  },
  {
    id: "airbyte",
    name: "Airbyte Agent Engine",
    category: "Open-web context ingestion",
    accent: "#3b82f6",
    why: "Status page RSS and context stores give Observer continuous open-web signals instead of static curated JSON only.",
    without: [
      "Static public_incidents.json — manual curation only",
      "No live status feed ingestion",
      "Observer lacks external outage context at classify time",
    ],
    with: [
      "Agent Engine context_store_search on RSS connectors",
      "githubstatus.com / AWS RSS fallback when API configured",
      "GET /tools/airbyte-context?service= — per-service search",
    ],
    outcome:
      "Incidents tab real outages + Airbyte-fed status context = defensible open-web agent narrative.",
    inOmega: [
      "app/services/airbyte_context.py",
      "app/agents/graph.py — sponsor_metadata.airbyte",
    ],
    healthKey: "airbyte",
    envSetup: [
      { var: "AIRBYTE_CLIENT_ID", required: true },
      { var: "AIRBYTE_CLIENT_SECRET", required: true },
      { var: "AIRBYTE_CONNECTOR_ID", hint: "optional — RSS URL used as fallback" },
      { var: "AIRBYTE_RSS_URL", hint: "https://www.githubstatus.com/history.rss" },
    ],
  },
  {
    id: "truefoundry",
    name: "TrueFoundry",
    category: "Production agent deploy",
    accent: "#6366f1",
    why: "Production agent code must ship to a managed runtime with health checks — not only localhost uvicorn.",
    without: [
      "Local-only FastAPI — no shared endpoint for demos or integrations",
      "No liveness/readiness probes on LangGraph service",
      "Manual env management per machine",
    ],
    with: [
      "truefoundry/agent_server.py — TFY-compatible FastAPI wrapper",
      "truefoundry/deploy.py — service spec + /health probe",
      "Optional TFY AI Gateway for LLM routing",
    ],
    outcome:
      "Same LangGraph pipeline runs on TrueFoundry with TFY_SERVICE_ROOT_PATH and managed deploy lifecycle.",
    inOmega: ["truefoundry/agent_server.py", "truefoundry/deploy.py"],
    healthKey: "truefoundry",
    envSetup: [
      { var: "TFY_API_KEY", required: true },
      { var: "TFY_HOST", required: true, hint: "https://your-org.truefoundry.cloud" },
    ],
  },
  {
    id: "render",
    name: "Render",
    category: "Public demo hosting",
    accent: "#46e3b7",
    why: "Operators need a stable public URL for the dashboard + API — render.yaml wires both services.",
    without: [
      "localhost:8001 / :3001 — demo breaks off your machine",
      "Manual CORS and env sync between frontend/backend",
      "No health-checked public deploy",
    ],
    with: [
      "render.yaml — omega-backend + omega-web blueprint",
      "fromService env linking NEXT_PUBLIC_OMEGA_API_URL",
      "FRONTEND_URL CORS for production origin",
    ],
    outcome:
      "One-click deploy gives a live endpoint to verify the full stack in production-like conditions.",
    inOmega: ["render.yaml", "backend/run.py PORT binding", "main.py CORS from FRONTEND_URL"],
    healthKey: "render",
    alwaysIntegrated: true,
    setupNote: "Deploy via render.yaml — set FRONTEND_URL in Render dashboard for CORS.",
  },
];
