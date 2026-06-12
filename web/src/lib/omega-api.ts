const API_BASE =
  process.env.NEXT_PUBLIC_OMEGA_API_URL?.replace(/\/$/, "") || "http://localhost:8001";

const PAYMENT_TOKEN = process.env.NEXT_PUBLIC_OMEGA_PAYMENT_TOKEN?.trim() || "";

function paymentHeaders(): Record<string, string> {
  if (!PAYMENT_TOKEN) return {};
  return { "X-402-Payment": PAYMENT_TOKEN };
}

export class PaymentRequiredError extends Error {
  detail: {
    message?: string;
    price_usd?: number;
    instructions?: string;
    action?: string;
  };

  constructor(detail: PaymentRequiredError["detail"]) {
    super(detail.message || "Payment required (HTTP 402)");
    this.name = "PaymentRequiredError";
    this.detail = detail;
  }
}

export type SimulationStep = {
  step_id: string;
  name: string;
  owner: string;
  status: string;
  timestamp: string;
  detail: string;
};

export type SimulationState = {
  simulation_id: string;
  steps: SimulationStep[];
  steps_completed: string[];
  fault_injection: Record<string, string>;
  cascade: { order: string[]; blast_radius_score: number; affected_count?: number };
  aggregate_risk_score: number;
  requires_human_approval: boolean;
};

export type TimelineEntry = {
  state: string;
  owner: string;
  timestamp: string;
  status: string;
};

export type ChangeLogEntry = {
  timestamp: string;
  actor: string;
  field: string;
  old_value?: string | null;
  new_value: string;
  detail: string;
};

export type Incident = {
  incident_id: string;
  trace_id?: string;
  status: string;
  event: {
    type: string;
    service: string;
    severity: number;
    timestamp: string;
    metrics: Record<string, number>;
    dependency_graph: Record<string, string[]>;
  };
  classified?: { severity_label: string; event_type: string };
  root_cause?: {
    root_cause: string;
    confidence: number;
    affected_services: string[];
    reasoning: string;
  };
  scenarios?: {
    scenarios: Array<{ id: string; action: string; predicted_impact: string; risk_score: number }>;
    recommended_scenario_id: string;
    risk_score: number;
  };
  action_plan?: {
    actions: Array<{ id: string; type: string; description: string }>;
    recommended_action_id: string;
    requires_human_approval: boolean;
    rationale: string;
  };
  auto_scores?: Record<string, number>;
  langfuse_scores?: Record<string, number>;
  human_approved?: boolean | null;
  human_feedback_reason?: string | null;
  span_ids?: Record<string, string>;
  simulation?: SimulationState;
  timeline?: TimelineEntry[];
  change_log?: ChangeLogEntry[];
  prompt_version?: string;
  incident_commander?: string;
};

export type CostSavingsRow = {
  manual_mttr_minutes: number;
  omega_assisted_mttr_minutes: number;
  mttr_saved_minutes: number;
  manual_work_hours: number;
  omega_work_hours: number;
  work_hours_saved: number;
  manual_triage_hours: number;
  omega_triage_hours: number;
  triage_hours_saved: number;
  manual_cost_usd: number;
  omega_cost_usd: number;
  llm_cost_usd: number;
  gross_savings_usd: number;
  net_savings_usd: number;
  bridge_engineers: number;
  hourly_rate_usd: number;
};

export type CostSavingsSummary = {
  incident_count: number;
  totals: {
    manual_work_hours: number;
    omega_work_hours: number;
    work_hours_saved: number;
    manual_cost_usd: number;
    omega_cost_usd: number;
    llm_cost_usd: number;
    gross_savings_usd: number;
    net_savings_usd: number;
    avg_mttr_saved_minutes?: number;
  };
  methodology?: string;
};

export type StackUsage = {
  total_incidents: number;
  langfuse_traced: number;
  langfuse_scored: number;
  clickhouse_stored: number;
  json_stored: number;
  openui_dashboard_ready: number;
  human_resolved: number;
  storage_backend: string;
  clickhouse_enabled: boolean;
  clickhouse_connected: boolean;
  langfuse_human_scored?: number;
  langfuse_golden?: number;
  openui_twin_ready?: number;
  per_incident: Array<{
    incident_id: string;
    service: string;
    status: string;
    langfuse_trace: string | null;
    langfuse_scores_auto: number;
    langfuse_scores_human: number;
    langfuse_scores_total: number;
    langfuse_human: string;
    langfuse_golden: boolean;
    langfuse_quality_pct: number;
    clickhouse_backend: string;
    clickhouse_indexed: string;
    openui_tier: string;
    openui_components: number;
    openui_tokens_est: number;
  }>;
  cost_savings_totals: CostSavingsSummary["totals"];
  without_stack: {
    langfuse_off_traces: number;
    no_clickhouse_query_ms: number;
    openui_markdown_only_tokens_est: number;
  };
  with_stack: {
    langfuse_traces: number;
    clickhouse_query_ms: number | null;
    openui_lang_tokens_est: number;
    net_savings_usd: number;
  };
};

export type Analytics = {
  total: number;
  human_approval_rate: number;
  avg_root_cause_quality: number;
  by_service: Record<string, number>;
  approval_trend?: Array<{ index: number; approval_rate: number; label: string }>;
  prompt_version?: string;
  cost_savings?: {
    incident_count: number;
    totals: CostSavingsSummary["totals"];
  };
  stack?: StackUsage;
  storage?: {
    backend: string;
    clickhouse_enabled: boolean;
    clickhouse_connected: boolean;
    query_ms?: { clickhouse: number | null; json_file: number };
    speedup_x?: number | null;
  };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...paymentHeaders(),
      ...init?.headers,
    },
  });
  if (res.status === 402) {
    let detail: PaymentRequiredError["detail"] = {};
    try {
      const body = await res.json();
      detail = body.detail ?? body;
    } catch {
      detail = { message: await res.text() };
    }
    throw new PaymentRequiredError(detail);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type HealthStatus = {
  status: string;
  langfuse: boolean;
  llm: boolean;
  llm_provider?: string;
  demo_mode: boolean;
  clickhouse: boolean;
  clickhouse_enabled?: boolean;
  storage_backend: string;
  x402_enabled?: boolean;
  x402_price_usd?: number;
  payment_bypass?: boolean;
  sponsors?: Record<string, boolean>;
};

export async function getHealth() {
  return request<HealthStatus>("/health");
}

export async function getCited() {
  return request<{ path: string; content: string; payment: Record<string, string>; senso_enabled?: boolean }>(
    "/cited"
  );
}

export type SponsorEntry = {
  enabled: boolean;
  depth: number;
  score: number;
  tier: string;
  why: string;
  improved: string;
};

export type SponsorReport = {
  sponsors: Record<string, SponsorEntry>;
  enabled_count: number;
  enabled: string[];
  average_score: number;
  prize_lane_scores: Record<string, number>;
  recommended_pitches: [string, number][];
};

export async function getSponsors() {
  return request<SponsorReport>("/sponsors");
}

export async function listIncidents(limit = 20) {
  return request<{ incidents: Incident[]; analytics: Analytics }>(`/incidents?limit=${limit}`);
}

export async function createIncident(event: Incident["event"]) {
  return request<Incident>("/incidents", {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export async function submitFeedback(incident_id: string, approved: boolean, reason: string) {
  return request<Incident>("/feedback", {
    method: "POST",
    body: JSON.stringify({ incident_id, approved, reason }),
  });
}

export async function optimizePrompt(agent = "scientist") {
  return request<{
    prompt_name: string;
    version: string;
    failure_examples_used: number;
    story: string;
  }>("/optimize", {
    method: "POST",
    body: JSON.stringify({ agent, min_failures: 3 }),
  });
}

export type PublicIncidentSummary = {
  id: string;
  company: string;
  date: string;
  title: string;
  category: string;
  severity: string;
  mttr_minutes: number;
  source_url: string;
  source_label: string;
  summary: string;
  root_cause: string;
  cost_savings?: CostSavingsRow;
};

export type PublicIncidentDetail = PublicIncidentSummary & {
  resolution: string;
  affected_services: string[];
  timeline: Array<{ time: string; event: string }>;
  omega_event: Incident["event"];
  expected_omega_root_cause: string;
  cost_savings?: CostSavingsRow;
};

export async function listPublicIncidents() {
  return request<{
    incidents: PublicIncidentSummary[];
    source: string;
    savings_summary: CostSavingsSummary;
  }>("/public-incidents");
}

export async function getPublicIncident(id: string) {
  return request<PublicIncidentDetail>(`/public-incidents/${id}`);
}

export async function replayPublicIncident(id: string) {
  return request<{
    public_incident: PublicIncidentDetail;
    omega_incident: Incident;
    omega_incident_id: string;
    root_cause_match: boolean;
    cited_published?: string;
    comparison: {
      real_root_cause: string;
      omega_root_cause: string | null;
      real_resolution: string;
      omega_action: string | null;
      real_mttr_minutes: number;
    };
  }>(`/public-incidents/${id}/replay`, { method: "POST" });
}

export async function queryIncidents(query: string, limit = 10) {
  return request<{
    query: string;
    count: number;
    incidents: Incident[];
    analytics: Analytics;
    mcp_note: string;
  }>("/query", {
    method: "POST",
    body: JSON.stringify({ query, limit }),
  });
}
