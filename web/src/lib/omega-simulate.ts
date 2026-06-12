import type { AgentId } from "@/components/omega/AgentPipeline";
import type { LogLine } from "@/components/omega/AgentTerminal";

let logCounter = 0;

function line(agent: string, level: LogLine["level"], msg: string, ts = "00:00:00.000"): LogLine {
  logCounter += 1;
  return { id: `seed-${agent}-${logCounter}`, ts, agent, level, msg };
}

export const PIPELINE_SCRIPT: Record<Exclude<AgentId, "idle" | "human">, LogLine[]> = {
  observer: [
    line("observer", "SYS", "redis-streams consumer group [omega-observer] polling..."),
    line("observer", "INFO", "event ingested :: type=connection_pool_exhaustion severity=0.87"),
    line("observer", "DEBUG", "normalizing metrics payload { error_rate: 0.12, p99_ms: 1840 }"),
    line("observer", "TRACE", "classifying via LangGraph node=observe span_parent=incident_root"),
    line("observer", "LANGFUSE", "langfuse.span.create name=observe tags=[omega,observer]"),
    line("observer", "INFO", "severity_label=HIGH service=auth → publishing crisis_detected"),
  ],
  scientist: [
    line("scientist", "SYS", "fetching prompt scientist-root-cause@production from Langfuse"),
    line("scientist", "LLM", "gemini-2.0-flash invoke :: tokens_in=1240 temp=0.2"),
    line("scientist", "DEBUG", "dependency_graph traversal :: auth → database,cache → api-gateway"),
    line("scientist", "TRACE", "bayesian scoring P(cause|symptoms) top=connection_pool_exhaustion"),
    line("scientist", "LANGFUSE", "langfuse.generation.end model=gemini cost=$0.0021 latency=412ms"),
    line("scientist", "INFO", "root_cause=connection_pool_exhaustion confidence=0.91"),
  ],
  simulator: [
    line("simulator", "SYS", "digital twin boot :: mesh_nodes=6 edges=5"),
    line("simulator", "LLM", "scenario projection :: scale-pool vs rollback-deploy"),
    line("simulator", "DEBUG", "monte_carlo n=1000 :: scale-pool risk=0.20 rollback risk=0.45"),
    line("simulator", "TRACE", "counterfactual: sector-9 latency +15% if rollback selected"),
    line("simulator", "LANGFUSE", "langfuse.score name=scenario_realism value=pending"),
    line("simulator", "INFO", "recommended=scale-pool predicted_impact latency-40% errors-60%"),
  ],
  response: [
    line("response", "SYS", "composio.actions.resolve :: pagerduty,slack,github,jira"),
    line("response", "LLM", "action planner invoke :: safety_constraints=HIGH severity"),
    line("response", "WARN", "circuit_breaker check passed :: 0/3 failures in window"),
    line("response", "TRACE", "human_gate.required=true confidence_threshold=0.85"),
    line("response", "LANGFUSE", "langfuse.score name=action_safety auto_judge=queued"),
    line("response", "INFO", "recommended_action=scale → awaiting human approval"),
  ],
};

/** Static seed logs — no Date.now() so SSR and client hydrate identically */
export const AMBIENT_LOGS: LogLine[] = [
  line("langfuse", "LANGFUSE", "otel.exporter batch flush :: 12 observations queued", "00:00:01.000"),
  line("redis", "DEBUG", "XREADGROUP omega-scientist block=5000 streams=crisis_detected", "00:00:02.000"),
  line("omega", "SYS", "heartbeat :: agents=4 uptime=99.97% incidents_processed=51", "00:00:03.000"),
  line("judge", "LLM", "llm-as-judge evaluator idle :: root_cause_quality threshold=0.80", "00:00:04.000"),
];

export function freshTimestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

export const AGENT_ORDER: Exclude<AgentId, "idle" | "human">[] = [
  "observer",
  "scientist",
  "simulator",
  "response",
];

export function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
