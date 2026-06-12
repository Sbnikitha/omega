"use client";

import { motion } from "framer-motion";
import type { CostSavingsRow, PublicIncidentSummary } from "@/lib/omega-api";
import { computeWhatIf, formatFormula, improvementPct } from "@/lib/what-if-calc";

function LiveNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <motion.span key={value} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}>
      {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
      {suffix}
    </motion.span>
  );
}

type Props = {
  incident: Pick<PublicIncidentSummary, "company" | "title" | "mttr_minutes" | "severity" | "cost_savings">;
};

export function OmegaWhatIfPanel({ incident }: Props) {
  const row: CostSavingsRow =
    incident.cost_savings ?? computeWhatIf(incident.mttr_minutes, incident.severity);
  const pct = improvementPct(row);
  const formulas = formatFormula(row);

  return (
    <motion.div
      key={incident.title}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-zinc-950 to-zinc-950 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-emerald-500/80">If OMEGA ran this incident</p>
          <h2 className="text-base font-semibold text-zinc-100 mt-1">
            {incident.company} — {incident.title}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-600 uppercase">Cost reduction</p>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            <LiveNumber value={pct} suffix="%" />
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Published MTTR" value={`${row.manual_mttr_minutes}m`} sub="actual outage" muted />
        <StatCard label="With OMEGA" value={`${row.omega_assisted_mttr_minutes}m`} sub="est. assisted MTTR" accent />
        <StatCard
          label="Engineering time saved"
          value={`${row.work_hours_saved}h`}
          sub={`${row.bridge_engineers}-person bridge`}
          accent
        />
        <StatCard
          label="Net $ saved"
          value={`$${Math.round(row.net_savings_usd).toLocaleString()}`}
          sub={`incl. $${row.llm_cost_usd} LLM`}
          accent
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="rounded-md border border-zinc-800 bg-black/30 p-3">
          <p className="text-[10px] uppercase text-zinc-600 mb-2">Bridge cost comparison</p>
          <div className="space-y-2">
            <BarRow label="Manual" usd={row.manual_cost_usd} max={row.manual_cost_usd} color="bg-zinc-600" />
            <BarRow label="OMEGA" usd={row.omega_cost_usd} max={row.manual_cost_usd} color="bg-emerald-500" />
          </div>
        </div>
        <div className="rounded-md border border-zinc-800 bg-black/30 p-3 text-xs font-mono text-zinc-500 space-y-1.5 leading-relaxed">
          <p className="text-[10px] uppercase text-zinc-600 mb-2 not-font-mono">Calculation</p>
          {formulas.map((f) => (
            <p key={f}>{f}</p>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-zinc-600 leading-relaxed">
        Assumes 3 engineers on bridge @ $150/hr fully loaded. OMEGA cuts diagnosis time ~45% (cap 90 min). Pipeline
        runtime ~4 min. LLM cost $0.024/incident. Matches backend{" "}
        <code className="text-zinc-500">cost_savings.py</code> model.
      </p>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  muted,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`rounded-md border px-3 py-2 ${accent ? "border-emerald-500/30 bg-emerald-500/5" : "border-zinc-800"}`}>
      <p className="text-[9px] uppercase tracking-wide text-zinc-600">{label}</p>
      <p className={`text-lg font-bold font-mono ${muted ? "text-zinc-500" : accent ? "text-emerald-400" : "text-zinc-200"}`}>
        {value}
      </p>
      <p className="text-[9px] text-zinc-600">{sub}</p>
    </div>
  );
}

function BarRow({
  label,
  usd,
  max,
  color,
}: {
  label: string;
  usd: number;
  max: number;
  color: string;
}) {
  const width = max > 0 ? (usd / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
        <span>{label}</span>
        <span>${usd.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
