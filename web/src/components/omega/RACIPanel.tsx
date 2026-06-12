"use client";

import type { Incident } from "@/lib/omega-api";

const RACI_ROWS = [
  { role: "Incident Commander", type: "Human", r: "Approve/Reject", a: "Outcome", c: "All agents", i: "Stakeholders" },
  { role: "Observer", type: "Agent", r: "Classify", a: "Severity", c: "—", i: "Scientist" },
  { role: "Scientist", type: "Agent", r: "Root cause", a: "RCA accuracy", c: "Graph", i: "Simulator" },
  { role: "Simulator", type: "Agent", r: "Digital twin", a: "Risk score", c: "Twin mesh", i: "Response" },
  { role: "Response", type: "Agent", r: "Action plan", a: "Safety", c: "Composio", i: "IC" },
  { role: "Platform Admin", type: "Human", r: "Deploy prompts", a: "CI/infra", c: "Langfuse", i: "Team" },
];

export function RACIPanel({ incident }: { incident?: Incident | null }) {
  const status = incident?.status ?? "—";
  const commander = incident?.incident_commander ?? "on-call-engineer";

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
      <p className="text-[9px] uppercase tracking-widest text-violet-400 mb-2">RACI · Roles & Accountability</p>
      <p className="text-[10px] text-zinc-500 mb-3 font-mono">
        IC: <span className="text-zinc-300">{commander}</span> · status: <span className="text-amber-400">{status}</span>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-zinc-600 border-b border-zinc-800">
              <th className="text-left py-1 pr-2">Role</th>
              <th className="text-left py-1 px-1">R</th>
              <th className="text-left py-1 px-1">A</th>
              <th className="text-left py-1 px-1">C</th>
              <th className="text-left py-1 pl-1">I</th>
            </tr>
          </thead>
          <tbody>
            {RACI_ROWS.map((row) => (
              <tr key={row.role} className="border-b border-zinc-900 text-zinc-400">
                <td className="py-1.5 pr-2">
                  <span className="text-zinc-300">{row.role}</span>
                  <span className="text-zinc-600 ml-1">({row.type})</span>
                </td>
                <td className="py-1.5 px-1 text-cyan-500/80">{row.r}</td>
                <td className="py-1.5 px-1 text-emerald-500/80">{row.a}</td>
                <td className="py-1.5 px-1 text-amber-500/80">{row.c}</td>
                <td className="py-1.5 pl-1 text-zinc-500">{row.i}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
