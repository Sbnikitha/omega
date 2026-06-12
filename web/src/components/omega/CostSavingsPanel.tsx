"use client";

import { motion } from "framer-motion";
import { Clock, DollarSign, Users } from "lucide-react";
import type { CostSavingsRow, CostSavingsSummary } from "@/lib/omega-api";

function fmtUsd(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
}

export function CostSavingsSummaryBar({ summary }: { summary: CostSavingsSummary }) {
  const t = summary.totals;
  if (!summary.incident_count) return null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
      <p className="text-xs text-zinc-500 mb-3">
        Manual vs OMEGA-assisted cost · {summary.incident_count} real incidents · 3 engineers @ $150/hr
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Work hours saved" value={`${t.work_hours_saved}h`} icon={Clock} />
        <Stat label="Manual cost" value={fmtUsd(t.manual_cost_usd)} icon={Users} muted />
        <Stat label="OMEGA-assisted" value={fmtUsd(t.omega_cost_usd)} icon={Users} muted />
        <Stat label="Net savings" value={fmtUsd(t.net_savings_usd)} icon={DollarSign} highlight />
      </div>
    </div>
  );
}

export function CostSavingsDetail({ row }: { row: CostSavingsRow }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Cost & work time</p>
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <Row label="Published MTTR" value={`${row.manual_mttr_minutes} min`} />
          <Row label="Est. with OMEGA" value={`${row.omega_assisted_mttr_minutes} min`} />
          <Row label="MTTR saved" value={`${row.mttr_saved_minutes} min`} accent="text-emerald-500" />
        </div>
        <div className="space-y-2">
          <Row label="Manual bridge work" value={`${row.manual_work_hours}h`} />
          <Row label="OMEGA bridge work" value={`${row.omega_work_hours}h`} />
          <Row label="Triage hours saved" value={`${row.triage_hours_saved}h`} accent="text-emerald-500" />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-zinc-800 grid sm:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-zinc-600 text-xs">Manual cost</p>
          <p className="text-zinc-300 font-medium">${row.manual_cost_usd.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-zinc-600 text-xs">LLM pipeline</p>
          <p className="text-zinc-300 font-medium">${row.llm_cost_usd.toFixed(3)}</p>
        </div>
        <div>
          <p className="text-zinc-600 text-xs">Net savings</p>
          <p className="text-emerald-400 font-semibold">${row.net_savings_usd.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export function OpsCostTicker({
  workHoursSaved,
  netSavingsUsd,
  llmCostUsd,
}: {
  workHoursSaved: number;
  netSavingsUsd: number;
  llmCostUsd: number;
}) {
  return (
    <motion.div
      className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
      whileHover={{ borderColor: "rgba(16,185,129,0.4)" }}
    >
      <p className="text-[9px] uppercase tracking-widest text-emerald-600">Manual Cost Saved</p>
      <p className="text-2xl font-black font-mono text-emerald-400">{fmtUsd(netSavingsUsd)}</p>
      <p className="text-[9px] text-zinc-600 mt-1 font-mono">
        {workHoursSaved}h eng time · LLM ${llmCostUsd.toFixed(2)}
      </p>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`rounded-md border px-3 py-2 ${highlight ? "border-emerald-500/30 bg-emerald-500/5" : "border-zinc-800"}`}>
      <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
        <Icon className="w-3 h-3" />
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-lg font-semibold ${highlight ? "text-emerald-400" : muted ? "text-zinc-500" : "text-zinc-200"}`}>
        {value}
      </p>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-zinc-500">{label}</span>
      <span className={accent || "text-zinc-200"}>{value}</span>
    </div>
  );
}
