"use client";

import type { Incident } from "@/lib/omega-api";

export function ScenarioComparisonTable({ incident }: { incident: Incident }) {
  const scenarios = incident.scenarios?.scenarios ?? [];
  const recommended = incident.scenarios?.recommended_scenario_id;

  if (!scenarios.length) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden">
      <p className="text-[9px] uppercase tracking-widest text-zinc-500 px-4 py-3 border-b border-zinc-800">
        Scenario Comparison · Digital Twin Output
      </p>
      <table className="w-full text-[10px] font-mono">
        <thead>
          <tr className="text-zinc-600 border-b border-zinc-800">
            <th className="text-left p-2">ID</th>
            <th className="text-left p-2">Action</th>
            <th className="text-left p-2">Impact</th>
            <th className="text-right p-2">Risk</th>
            <th className="text-center p-2">Pick</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s) => (
            <tr
              key={s.id}
              className={`border-b border-zinc-900 ${s.id === recommended ? "bg-cyan-500/5" : ""}`}
            >
              <td className="p-2 text-cyan-500">{s.id}</td>
              <td className="p-2 text-zinc-300">{s.action}</td>
              <td className="p-2 text-zinc-500">{s.predicted_impact}</td>
              <td className="p-2 text-right text-amber-400">{Math.round(s.risk_score * 100)}%</td>
              <td className="p-2 text-center">{s.id === recommended ? "★" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
