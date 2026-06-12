"use client";

import type { ChangeLogEntry } from "@/lib/omega-api";

export function ChangeLog({ entries }: { entries?: ChangeLogEntry[] }) {
  if (!entries?.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-[10px] text-zinc-600 font-mono">
        No field changes recorded yet
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 max-h-48 overflow-y-auto custom-scrollbar">
      <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-3">Change Log · Audit Trail</p>
      <div className="space-y-2">
        {[...entries].reverse().map((entry, i) => (
          <div key={`${entry.timestamp}-${i}`} className="border-l-2 border-cyan-500/30 pl-3 py-1">
            <div className="flex justify-between text-[9px] text-zinc-600 font-mono">
              <span>{entry.timestamp.slice(11, 19)}</span>
              <span className="text-violet-400">{entry.actor}</span>
            </div>
            <p className="text-[10px] text-zinc-300 mt-0.5">
              <span className="text-cyan-500">{entry.field}</span>
              {entry.old_value ? ` : ${entry.old_value} → ` : " → "}
              <span className="text-emerald-400">{entry.new_value}</span>
            </p>
            {entry.detail && <p className="text-[9px] text-zinc-500 mt-0.5">{entry.detail}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
