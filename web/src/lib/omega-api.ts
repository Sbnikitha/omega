const API_BASE =
  process.env.NEXT_PUBLIC_OMEGA_API_URL?.replace(/\/$/, "") || "http://localhost:8001";

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
  human_approved?: boolean | null;
  human_feedback_reason?: string | null;
  span_ids?: Record<string, string>;
};

export type Analytics = {
  total: number;
  human_approval_rate: number;
  avg_root_cause_quality: number;
  by_service: Record<string, number>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function getHealth() {
  return request<{ status: string; langfuse: boolean; llm: boolean; demo_mode: boolean }>("/health");
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
