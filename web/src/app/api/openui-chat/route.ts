import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";
import OpenAI from "openai";

function loadSystemPrompt(): string {
  try {
    return readFileSync(join(process.cwd(), "src/generated/omega-system-prompt.txt"), "utf-8");
  } catch {
    return `You are OMEGA Copilot. Respond with OpenUI Lang to render incident dashboards using Card, Table, Callout, IncidentStatusCard, RootCauseInsight, CostSavingsChip. Use tools omega_list_incidents, omega_list_public_incidents, omega_analytics.`;
  }
}

const OMEGA_OPENAI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "omega_list_incidents",
      description: "List recent OMEGA pipeline incidents with RCA and status.",
      parameters: { type: "object", properties: { limit: { type: "number" } } },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "omega_list_public_incidents",
      description: "List curated real-world postmortems with MTTR and cost savings.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "omega_analytics",
      description: "Session analytics: approval rate, cost savings, incident count.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const OMEGA_API =
  process.env.OMEGA_API_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_OMEGA_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8001";

async function omegaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${OMEGA_API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "omega_list_incidents": {
      const limit = Number(args.limit ?? 8);
      const data = await omegaFetch<{ incidents: unknown[] }>(`/incidents?limit=${limit}`);
      return JSON.stringify(data.incidents);
    }
    case "omega_list_public_incidents": {
      const data = await omegaFetch<{ incidents: unknown[]; savings_summary: unknown }>("/public-incidents");
      return JSON.stringify({ incidents: data.incidents, savings_summary: data.savings_summary });
    }
    case "omega_analytics": {
      const data = await omegaFetch<Record<string, unknown>>("/analytics");
      return JSON.stringify(data);
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

import { OMEGA_DEMO_LANG } from "@/openui/demo-lang";

function pickDemoLang(_messages: { role: string; content?: string }[]): string {
  return OMEGA_DEMO_LANG;
}

function sseChunk(content: string, finish?: string) {
  return `data: ${JSON.stringify({
    id: "omega-demo",
    object: "chat.completion.chunk",
    choices: [{ index: 0, delta: content ? { content } : {}, finish_reason: finish ?? null }],
  })}\n\n`;
}

async function streamDemo(messages: { role: string; content?: string }[]): Promise<Response> {
  const lang = pickDemoLang(messages);
  const lines = lang.split("\n");
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(sseChunk(`${line}\n`)));
        await new Promise((r) => setTimeout(r, 35));
      }
      controller.enqueue(encoder.encode(sseChunk("", "stop")));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return streamDemo(messages ?? []);
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const systemPrompt = loadSystemPrompt();
  const tools = OMEGA_OPENAI_TOOLS;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...(messages ?? []).filter((m: { role: string }) => m.role !== "tool"),
  ];

  const completion = await client.chat.completions.create({
    model,
    messages: chatMessages,
    tools,
    stream: true,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolCalls: Record<number, { id: string; name: string; arguments: string }> = {};

      for await (const chunk of completion) {
        const choice = chunk.choices[0];
        const delta = choice?.delta;

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCalls[idx]) {
              toolCalls[idx] = { id: tc.id || `tc-${idx}`, name: tc.function?.name || "", arguments: "" };
            }
            if (tc.function?.name) toolCalls[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments;
          }
        }

        if (delta?.content) {
          controller.enqueue(encoder.encode(sseChunk(delta.content)));
        }

        if (choice?.finish_reason === "tool_calls") {
          for (const tc of Object.values(toolCalls)) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.arguments || "{}");
            } catch {
              args = {};
            }
            const result = await runTool(tc.name, args);
            chatMessages.push({
              role: "assistant",
              tool_calls: [{ id: tc.id, type: "function", function: { name: tc.name, arguments: tc.arguments } }],
            });
            chatMessages.push({ role: "tool", tool_call_id: tc.id, content: result });
          }

          const followUp = await client.chat.completions.create({
            model,
            messages: chatMessages,
            tools,
            stream: true,
          });

          for await (const c2 of followUp) {
            const d2 = c2.choices[0]?.delta?.content;
            if (d2) controller.enqueue(encoder.encode(sseChunk(d2)));
            if (c2.choices[0]?.finish_reason === "stop") {
              controller.enqueue(encoder.encode(sseChunk("", "stop")));
            }
          }
        }

        if (choice?.finish_reason === "stop") {
          controller.enqueue(encoder.encode(sseChunk("", "stop")));
        }
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
