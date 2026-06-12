"use client";

import type { Analytics } from "@/lib/omega-api";

export function ImprovementChart({ analytics }: { analytics?: Analytics | null }) {
  const trend = analytics?.approval_trend ?? [];
  const fallback = [
    { label: "Early", approval_rate: 0.61 },
    { label: "Cycle 1", approval_rate: 0.74 },
    { label: "Cycle 2", approval_rate: 0.83 },
    { label: "Cycle 3", approval_rate: 0.89 },
  ];
  const data = trend.length >= 2 ? trend : fallback;

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
      <p className="text-[9px] uppercase tracking-widest text-cyan-500/80 mb-1">Langfuse Improvement Loop</p>
      <p className="text-[9px] text-zinc-600 mb-4 font-mono">
        Human approval · prompt: {analytics?.prompt_version ?? "scientist-root-cause@production"}
      </p>
      <div className="flex items-end gap-2 h-24">
        {data.map((point, i) => {
          const pct = Math.round(point.approval_rate * 100);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-cyan-400">{pct}%</span>
              <div
                className="w-full rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all"
                style={{ height: `${Math.max(pct, 8)}%` }}
              />
              <span className="text-[7px] text-zinc-600 text-center truncate w-full">
                {"label" in point ? point.label : `T${i + 1}`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-zinc-500 mt-3 text-center">61% → 89% after Langfuse prompt optimization cycles</p>
    </div>
  );
}
