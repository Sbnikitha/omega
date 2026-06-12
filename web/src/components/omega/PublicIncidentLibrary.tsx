"use client";

import { CostSavingsDetail } from "@/components/omega/CostSavingsPanel";
import type { CostSavingsRow, PublicIncidentDetail, PublicIncidentSummary } from "@/lib/omega-api";
import { ExternalLink } from "lucide-react";

const SEV: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  medium: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export function PublicIncidentLibrary({
  incidents,
  selectedId,
  onSelect,
}: {
  incidents: PublicIncidentSummary[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-200">Real-world incidents</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Public postmortems & status pages</p>
      </div>
      <ul className="divide-y divide-zinc-900 max-h-[420px] overflow-y-auto custom-scrollbar">
        {incidents.map((inc) => (
          <li key={inc.id}>
            <button
              type="button"
              onClick={() => onSelect(inc.id)}
              className={`w-full text-left px-4 py-3 hover:bg-zinc-900/80 transition-colors ${
                selectedId === inc.id ? "bg-zinc-900 border-l-2 border-l-zinc-400" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-500">{inc.company}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${SEV[inc.severity] || SEV.medium}`}>
                  {inc.severity}
                </span>
              </div>
              <p className="text-sm text-zinc-200 mt-1 font-medium leading-snug">{inc.title}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {inc.date} · MTTR {inc.mttr_minutes}m
                {inc.cost_savings ? ` · saves ~$${Math.round(inc.cost_savings.net_savings_usd)}` : ""}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PublicIncidentMinimalDetail({
  incident,
  onReplay,
  replaying,
  comparison,
}: {
  incident: PublicIncidentDetail;
  onReplay: () => void;
  replaying: boolean;
  comparison?: {
    root_cause_match: boolean;
    comparison: {
      real_root_cause: string;
      omega_root_cause: string | null;
      real_resolution: string;
      omega_action: string | null;
      real_mttr_minutes: number;
    };
  } | null;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950">
      <div className="px-5 py-4 border-b border-zinc-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500">
              {incident.company} · {incident.date}
            </p>
            <h1 className="text-lg font-semibold text-zinc-100 mt-1">{incident.title}</h1>
          </div>
          <a
            href={incident.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-md px-2.5 py-1.5"
          >
            {incident.source_label} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5">
        <p className="text-sm text-zinc-400 leading-relaxed">{incident.summary}</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <MinimalField label="Root cause (published)" value={incident.root_cause} />
          <MinimalField label="Resolution (published)" value={incident.resolution} />
        </div>

        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Timeline</p>
          <ol className="space-y-2">
            {incident.timeline.map((t, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-zinc-600 font-mono text-xs w-12 shrink-0">{t.time}</span>
                <span className="text-zinc-300">{t.event}</span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Affected</p>
          <div className="flex flex-wrap gap-1.5">
            {incident.affected_services.map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                {s}
              </span>
            ))}
          </div>
        </div>

        {incident.cost_savings && <CostSavingsDetail row={incident.cost_savings} />}

        {comparison && (
          <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">OMEGA vs published report</p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-zinc-600 text-xs mb-1">Published RCA</p>
                <p className="text-zinc-300">{comparison.comparison.real_root_cause}</p>
              </div>
              <div>
                <p className="text-zinc-600 text-xs mb-1">OMEGA RCA</p>
                <p className="text-zinc-300">{comparison.comparison.omega_root_cause || "—"}</p>
              </div>
              <div>
                <p className="text-zinc-600 text-xs mb-1">Published fix</p>
                <p className="text-zinc-300">{comparison.comparison.real_resolution}</p>
              </div>
              <div>
                <p className="text-zinc-600 text-xs mb-1">OMEGA action</p>
                <p className="text-zinc-300">{comparison.comparison.omega_action || "—"}</p>
              </div>
            </div>
            <p className={`text-xs font-medium ${comparison.root_cause_match ? "text-emerald-500" : "text-amber-500"}`}>
              {comparison.root_cause_match ? "✓ Root cause aligned with published report" : "△ Partial match — review trace"}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onReplay}
          disabled={replaying}
          className="w-full py-2.5 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
        >
          {replaying ? "Running OMEGA analysis…" : "Analyze in OMEGA"}
        </button>
      </div>
    </div>
  );
}

function MinimalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-800 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-zinc-600 mb-1">{label}</p>
      <p className="text-sm text-zinc-300">{value}</p>
    </div>
  );
}
