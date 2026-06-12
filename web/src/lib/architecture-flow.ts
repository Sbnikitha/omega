import { SPONSOR_INTEGRATIONS } from "@/lib/sponsor-integrations";

export type FlowNodeKind =
  | "ingress"
  | "control"
  | "agent"
  | "human"
  | "publish"
  | "store"
  | "ui"
  | "deploy"
  | "platform";

export type ArchitectureNode = {
  id: string;
  title: string;
  subtitle: string;
  kind: FlowNodeKind;
  sponsors: string[];
  color: string;
  agent?: boolean;
};

/** Ordered execution path for the animated tour */
export const ARCHITECTURE_FLOW: ArchitectureNode[] = [
  {
    id: "open-web",
    title: "Open Web",
    subtitle: "Public postmortems · status RSS",
    kind: "ingress",
    sponsors: ["airbyte", "composio"],
    color: "#3b82f6",
  },
  {
    id: "payment",
    title: "x402 Gate",
    subtitle: "HTTP 402 before analysis",
    kind: "ingress",
    sponsors: ["senso"],
    color: "#06b6d4",
  },
  {
    id: "guild",
    title: "Guild Commander",
    subtitle: "Published operator agent",
    kind: "control",
    sponsors: ["guild"],
    color: "#f472b6",
  },
  {
    id: "observer",
    title: "Observer",
    subtitle: "Classify + ground context",
    kind: "agent",
    agent: true,
    sponsors: ["langfuse", "airbyte", "composio"],
    color: "#06b6d4",
  },
  {
    id: "scientist",
    title: "Scientist",
    subtitle: "Root cause + entities",
    kind: "agent",
    agent: true,
    sponsors: ["langfuse", "pioneer"],
    color: "#8b5cf6",
  },
  {
    id: "simulator",
    title: "Simulator",
    subtitle: "Digital twin scenarios",
    kind: "agent",
    agent: true,
    sponsors: ["langfuse"],
    color: "#f59e0b",
  },
  {
    id: "response",
    title: "Response",
    subtitle: "Action plan + tools",
    kind: "agent",
    agent: true,
    sponsors: ["langfuse", "composio"],
    color: "#10b981",
  },
  {
    id: "human",
    title: "Human Gate",
    subtitle: "Approve · reject · score",
    kind: "human",
    sponsors: ["langfuse"],
    color: "#ec4899",
  },
  {
    id: "publish",
    title: "Publish",
    subtitle: "cited.md · Senso engine",
    kind: "publish",
    sponsors: ["senso"],
    color: "#06b6d4",
  },
  {
    id: "clickhouse",
    title: "ClickHouse",
    subtitle: "Incident store + analytics",
    kind: "store",
    sponsors: ["clickhouse"],
    color: "#f59e0b",
  },
  {
    id: "openui",
    title: "OpenUI",
    subtitle: "Generative ops dashboard",
    kind: "ui",
    sponsors: ["openui"],
    color: "#ec4899",
  },
  {
    id: "deploy",
    title: "Ship to Prod",
    subtitle: "Render · TrueFoundry",
    kind: "deploy",
    sponsors: ["render", "truefoundry"],
    color: "#46e3b7",
  },
];

export function sponsorById(id: string) {
  return SPONSOR_INTEGRATIONS.find((s) => s.id === id);
}

export const AGENT_NODES = ARCHITECTURE_FLOW.filter((n) => n.agent);

export const PLATFORM_SPONSORS = ["langfuse"] as const;
