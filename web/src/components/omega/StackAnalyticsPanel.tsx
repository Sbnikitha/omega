"use client";

import type { Analytics } from "@/lib/omega-api";
import { motion } from "framer-motion";

function Badge({
  children,
  tone = "zinc",
}: {
  children: React.ReactNode;
  tone?: "violet" | "amber" | "fuchsia" | "emerald" | "red" | "zinc" | "cyan";
}) {
  const tones: Record<string, string> = {
    violet: "border-violet-500/40 bg-violet-500/10 text-violet-300",
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    fuchsia: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300",
    emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/40 bg-red-500/10 text-red-300",
    cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
    zinc: "border-zinc-700 bg-zinc-900 text-zinc-500",
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function StackAnalyticsPanel({ analytics }: { analytics: Analytics | null }) {
  const stack = analytics?.stack;
  const storage = analytics?.storage;
  if (!stack) return null;

  const withStack = stack.with_stack;
  const without = stack.without_stack;
  const chOn = stack.clickhouse_connected;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Per-incident stack usage</p>
        <h3 className="text-lg font-bold text-zinc-100 mt-1">
          {stack.total_incidents} OMEGA runs · one row each
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Langfuse = trace + judge scores + human feedback · ClickHouse = how this row is stored · OpenUI = what
          could render in Guide OpenUI compare for this incident
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          {
            sponsor: "Langfuse",
            color: "violet" as const,
            with: `${stack.langfuse_traced} traced · ${stack.langfuse_human_scored ?? 0} human-scored`,
            without: `${without.langfuse_off_traces} no trace`,
          },
          {
            sponsor: "ClickHouse",
            color: "amber" as const,
            with: chOn ? `${stack.clickhouse_stored} columnar rows` : `0 (enable CH)`,
            without: `${stack.json_stored} JSON blob scan`,
          },
          {
            sponsor: "OpenUI",
            color: "fuchsia" as const,
            with: `${stack.openui_twin_ready ?? 0} twin · ${stack.openui_dashboard_ready} dashboards`,
            without: `${stack.total_incidents - (stack.openui_dashboard_ready ?? 0)} text-only`,
          },
        ].map((s) => (
          <div key={s.sponsor} className="rounded-lg border border-zinc-800 bg-black/30 p-3">
            <p
              className={`text-[9px] uppercase font-bold ${
                s.color === "violet" ? "text-violet-400" : s.color === "amber" ? "text-amber-400" : "text-fuchsia-400"
              }`}
            >
              {s.sponsor}
            </p>
            <p className="text-xs text-emerald-400 mt-2 font-mono">WITH: {s.with}</p>
            <p className="text-xs text-zinc-600 mt-1 font-mono">WITHOUT: {s.without}</p>
          </div>
        ))}
      </div>

      {(storage?.query_ms?.clickhouse != null || storage?.query_ms?.json_file != null) && (
        <div className="flex flex-wrap gap-4 text-xs font-mono text-zinc-500">
          <span>Storage: <span className="text-amber-400">{stack.storage_backend}</span></span>
          <span>CH query: {storage?.query_ms?.clickhouse ?? "—"}ms</span>
          <span>JSON scan: {storage?.query_ms?.json_file ?? "—"}ms</span>
          {storage?.speedup_x != null && <span className="text-emerald-400">{storage.speedup_x}× faster</span>}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
              <th className="px-3 py-2">Incident</th>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2 text-violet-400">Langfuse</th>
              <th className="px-3 py-2 text-amber-400">ClickHouse</th>
              <th className="px-3 py-2 text-fuchsia-400">OpenUI</th>
            </tr>
          </thead>
          <tbody>
            {(stack.per_incident ?? []).map((row, i) => (
              <motion.tr
                key={`${row.incident_id}-${i}`}
                className="border-b border-zinc-900/80 hover:bg-zinc-900/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
              >
                <td className="px-3 py-2.5 font-mono text-zinc-400">
                  {row.incident_id}
                  <span className="block text-[9px] text-zinc-600">{row.status}</span>
                </td>
                <td className="px-3 py-2.5 text-zinc-300">{row.service}</td>
                <td className="px-3 py-2.5 space-y-1">
                  {row.langfuse_trace ? (
                    <Badge tone="violet">trace:{row.langfuse_trace}</Badge>
                  ) : (
                    <Badge tone="zinc">no trace</Badge>
                  )}
                  <div className="flex flex-wrap gap-1">
                    <Badge tone="cyan">
                      {row.langfuse_scores_auto}judge
                      {row.langfuse_scores_human ? `+${row.langfuse_scores_human}human` : ""}
                    </Badge>
                    {row.langfuse_human === "approved" && <Badge tone="emerald">✓ IC</Badge>}
                    {row.langfuse_human === "rejected" && <Badge tone="red">✗ IC</Badge>}
                    {row.langfuse_human === "pending" && <Badge tone="amber">⏳ gate</Badge>}
                    {row.langfuse_golden && <Badge tone="emerald">golden</Badge>}
                  </div>
                  <span className="text-[9px] text-zinc-600">quality {row.langfuse_quality_pct}%</span>
                </td>
                <td className="px-3 py-2.5 space-y-1">
                  <Badge tone={row.clickhouse_backend === "clickhouse" ? "amber" : "zinc"}>
                    {row.clickhouse_backend === "clickhouse" ? "CH row" : "JSON file"}
                  </Badge>
                  <span className="block text-[9px] text-zinc-600 font-mono">{row.clickhouse_indexed}</span>
                </td>
                <td className="px-3 py-2.5 space-y-1">
                  {row.openui_tier !== "—" ? (
                    <>
                      <Badge tone="fuchsia">{row.openui_tier}</Badge>
                      <span className="block text-[9px] text-zinc-600">
                        {row.openui_components} components · ~{row.openui_tokens_est} tok
                      </span>
                    </>
                  ) : (
                    <Badge tone="zinc">—</Badge>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-zinc-600 font-mono">
        Totals — Langfuse golden: {stack.langfuse_golden ?? 0} · Net savings: $
        {Math.round(withStack.net_savings_usd ?? 0)} · OpenUI WITH: {withStack.openui_lang_tokens_est} tok vs WITHOUT:{" "}
        {without.openui_markdown_only_tokens_est} tok (markdown)
      </p>
    </section>
  );
}
