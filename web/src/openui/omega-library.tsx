import { createLibrary, defineComponent } from "@openuidev/react-lang";
import {
  openuiChatComponentGroups,
  openuiChatLibrary,
  openuiChatPromptOptions,
} from "@openuidev/react-ui/genui-lib";
import { z } from "zod/v4";

/** OMEGA-specific generative UI — incident status surfaced by the LLM in OpenUI Lang */
export const IncidentStatusCard = defineComponent({
  name: "IncidentStatusCard",
  description:
    "Live incident header: service name, severity label, pipeline status, and optional Langfuse trace id.",
  props: z.object({
    service: z.string(),
    severity: z.string(),
    status: z.string(),
    traceId: z.string().optional(),
  }),
  component: ({ props }) => (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 font-mono text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="text-cyan-300 font-bold">{props.service}</span>
        <span className="text-[10px] uppercase px-2 py-0.5 rounded border border-amber-500/40 text-amber-400">
          {props.severity}
        </span>
      </div>
      <p className="text-zinc-400 mt-2 text-xs">status: {props.status}</p>
      {props.traceId && <p className="text-violet-400/80 text-[10px] mt-1">trace:{props.traceId}</p>}
    </div>
  ),
});

export const RootCauseInsight = defineComponent({
  name: "RootCauseInsight",
  description: "Root cause analysis panel with confidence score and short reasoning.",
  props: z.object({
    rootCause: z.string(),
    confidence: z.number(),
    reasoning: z.string(),
  }),
  component: ({ props }) => (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
      <p className="text-[10px] uppercase tracking-widest text-violet-400 mb-1">Scientist · RCA</p>
      <p className="text-lg font-bold text-violet-100">{props.rootCause}</p>
      <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{props.reasoning}</p>
      <p className="text-[10px] text-emerald-400 mt-2 font-mono">confidence: {Math.round(props.confidence * 100)}%</p>
    </div>
  ),
});

export const CostSavingsChip = defineComponent({
  name: "CostSavingsChip",
  description: "Compact cost / work-time savings metric for an incident or session.",
  props: z.object({
    hoursSaved: z.number(),
    netUsd: z.number(),
    label: z.string().optional(),
  }),
  component: ({ props }) => (
    <div className="inline-flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
      <div>
        <p className="text-[9px] uppercase text-emerald-600">{props.label || "Manual savings"}</p>
        <p className="text-xl font-black text-emerald-400">${Math.round(props.netUsd).toLocaleString()}</p>
      </div>
      <div className="text-right">
        <p className="text-[9px] text-zinc-600">eng hours</p>
        <p className="text-sm font-mono text-zinc-300">{props.hoursSaved}h</p>
      </div>
    </div>
  ),
});

const chatComponents = Object.values(openuiChatLibrary.components);

export const omegaLibrary = createLibrary({
  root: "Card",
  componentGroups: [
    ...openuiChatComponentGroups,
    {
      name: "OMEGA Incident",
      components: ["IncidentStatusCard", "RootCauseInsight", "CostSavingsChip"],
    },
  ],
  components: [...chatComponents, IncidentStatusCard, RootCauseInsight, CostSavingsChip],
});

export const OMEGA_TOOL_DESCRIPTORS = [
  {
    name: "omega_list_incidents",
    description: "List recent OMEGA pipeline incidents with RCA and status from the backend API.",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
    outputSchema: { type: "array", items: { type: "object" } },
  },
  {
    name: "omega_list_public_incidents",
    description: "List curated real-world postmortems (GitHub, AWS, OpenAI, etc.) with MTTR and cost savings.",
    inputSchema: { type: "object", properties: {} },
    outputSchema: { type: "object" },
  },
  {
    name: "omega_analytics",
    description: "Get session analytics: approval rate, cost savings, incident count.",
    inputSchema: { type: "object", properties: {} },
    outputSchema: { type: "object" },
  },
];

export const OMEGA_TOOL_EXAMPLES = `Example — Incident dashboard with OMEGA components:

root = Card([hdr, status, rca, savings, tbl])
hdr = CardHeader("Auth outage", "OMEGA pipeline · generative UI")
status = IncidentStatusCard("auth", "critical", "awaiting_approval", "trace-a3f9")
rca = RootCauseInsight("connection_pool_exhaustion", 0.87, "Pool maxed during deploy cascade from api-gateway")
savings = CostSavingsChip(4.2, 315, "vs manual bridge")
tbl = Table([Col("Agent", agents), Col("Span", spans)])
agents = ["Observer", "Scientist", "Simulator", "Response"]
spans = ["observe", "root_cause_analysis", "scenario_simulation", "action_planning"]`;

export function getOmegaSystemPrompt(): string {
  return omegaLibrary.prompt({
    ...openuiChatPromptOptions,
    preamble: `You are OMEGA Copilot — an incident commander assistant for a multi-agent SRE system.
Always respond with OpenUI Lang that renders interactive UI (tables, charts, callouts, OMEGA components).
Use Query("omega_list_incidents") or Query("omega_list_public_incidents") to fetch live data before building dashboards.
Prefer IncidentStatusCard, RootCauseInsight, and CostSavingsChip for incident summaries.
Never return walls of plain markdown when a Card + Table or Chart would work.`,
    tools: [...OMEGA_TOOL_DESCRIPTORS],
    toolCalls: true,
    bindings: true,
    toolExamples: [OMEGA_TOOL_EXAMPLES, ...(openuiChatPromptOptions.examples ?? [])],
    additionalRules: [
      ...(openuiChatPromptOptions.additionalRules ?? []),
      "For incident comparisons use Callout with variant danger/warning/success.",
      "Show Langfuse trace spans in a Table when explaining the agent pipeline.",
      "Include FollowUpBlock with next actions (approve, replay, optimize).",
    ],
  });
}
