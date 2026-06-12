"use client";

import { ArrowRight } from "lucide-react";
import type { SimulationState } from "@/lib/omega-api";

export function CascadeTimeline({ simulation }: { simulation?: SimulationState | null }) {
  const order = simulation?.cascade?.order ?? [];
  if (!order.length) return null;

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
      <p className="text-[9px] uppercase tracking-widest text-red-400/80 mb-3">Cascade Propagation Path</p>
      <div className="flex flex-wrap items-center gap-1">
        {order.map((node, i) => (
          <div key={`${node}-${i}`} className="flex items-center gap-1">
            <span
              className={`text-[10px] font-mono px-2 py-1 rounded border ${
                i === 0
                  ? "border-red-500/50 bg-red-500/10 text-red-300"
                  : "border-amber-500/30 bg-amber-500/5 text-amber-300"
              }`}
            >
              {node}
            </span>
            {i < order.length - 1 && <ArrowRight className="w-3 h-3 text-zinc-600" />}
          </div>
        ))}
      </div>
      <p className="text-[9px] text-zinc-600 mt-2 font-mono">
        blast_radius_score: {simulation?.cascade?.blast_radius_score ?? "—"} · affected:{" "}
        {simulation?.cascade?.affected_count ?? order.length} services
      </p>
    </div>
  );
}
