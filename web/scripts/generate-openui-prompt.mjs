/**
 * Generates omega-system-prompt.txt for the API route (server-safe, no React SSR).
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { openuiChatLibrary, openuiChatPromptOptions } from "@openuidev/react-ui/genui-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../src/generated");
const outFile = join(outDir, "omega-system-prompt.txt");

const OMEGA_TOOL_DESCRIPTORS = [
  {
    name: "omega_list_incidents",
    description: "List recent OMEGA pipeline incidents with RCA and status from the backend API.",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
    outputSchema: { type: "array", items: { type: "object" } },
  },
  {
    name: "omega_list_public_incidents",
    description: "List curated real-world postmortems with MTTR and cost savings.",
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

const OMEGA_TOOL_EXAMPLES = `Example — OMEGA incident dashboard:

root = Card([hdr, callout, tbl, followUps])
hdr = CardHeader("Auth outage", "OMEGA multi-agent pipeline")
callout = Callout("warning", "Human gate", "Severity HIGH — approval required before remediation")
tbl = Table([Col("Agent", agents), Col("Langfuse span", spans)])
agents = ["Observer", "Scientist", "Simulator", "Response"]
spans = ["observe", "root_cause_analysis", "scenario_simulation", "action_planning"]
followUps = FollowUpBlock([fu1, fu2])
fu1 = FollowUpItem("Show cost savings for this incident")
fu2 = FollowUpItem("Compare to GitHub DB routing postmortem")`;

const prompt = openuiChatLibrary.prompt({
  ...openuiChatPromptOptions,
  preamble: `You are OMEGA Copilot — an incident commander assistant for a multi-agent SRE system integrated with Langfuse.
Always respond with OpenUI Lang that renders interactive UI (Card, Table, charts, Callout, FollowUpBlock).
Use Query("omega_list_incidents") or Query("omega_list_public_incidents") to fetch live data before building dashboards.
Custom OMEGA components (when registered): IncidentStatusCard(service, severity, status, traceId), RootCauseInsight(rootCause, confidence, reasoning), CostSavingsChip(hoursSaved, netUsd, label).
Never return walls of plain markdown when a Card + Table or Chart would work.`,
  tools: OMEGA_TOOL_DESCRIPTORS,
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

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, prompt, "utf-8");
console.log("Wrote", outFile, `(${prompt.length} chars)`);
