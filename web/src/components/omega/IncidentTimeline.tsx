"use client";

import type { TimelineEntry } from "@/lib/omega-api";

const STATE_LABELS: Record<string, string> = {
  NEW: "New",
  CLASSIFIED: "Classified",
  ANALYZING: "Analyzing",
  SIMULATING: "Simulating",
  AWAITING_APPROVAL: "Awaiting Approval",
  RESOLVED: "Resolved",
};

export function IncidentTimeline({ timeline, incidentId }: { timeline?: TimelineEntry[]; incidentId?: string }) {
  if (!timeline?.length) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="flex justify-between mb-3">
        <p className="text-[9px] uppercase tracking-widest text-zinc-500">Incident Lifecycle Tracker</p>
        {incidentId && (
          <span className="text-[9px] font-mono text-cyan-500/70">INC-{incidentId.slice(0, 8)}</span>
        )}
      </div>
      <div className="relative pl-4 border-l border-zinc-800 space-y-3">
        {timeline.map((entry) => (
          <div key={entry.state} className="relative">
            <span
              className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                entry.status === "done"
                  ? "bg-emerald-500 border-emerald-400"
                  : entry.status === "active"
                    ? "bg-amber-500 border-amber-400 animate-pulse"
                    : "bg-zinc-900 border-zinc-700"
              }`}
            />
            <div className="flex justify-between items-baseline gap-2">
              <div>
                <p className={`text-xs font-bold ${entry.status === "active" ? "text-amber-400" : "text-zinc-300"}`}>
                  {STATE_LABELS[entry.state] || entry.state}
                </p>
                <p className="text-[9px] text-zinc-600">owner: {entry.owner}</p>
              </div>
              <span
                className={`text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded ${
                  entry.status === "done"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : entry.status === "active"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-zinc-800 text-zinc-600"
                }`}
              >
                {entry.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
