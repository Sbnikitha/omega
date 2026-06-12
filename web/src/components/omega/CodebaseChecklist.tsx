"use client";

const CHECKS = [
  { id: 1, action: "Confirm symptom service", tool: "Observer / alert" },
  { id: 2, action: "Pull dependency graph", tool: "CMDB / mesh" },
  { id: 3, action: "Check deploys last 2h", tool: "GitHub CI" },
  { id: 4, action: "Review error_rate + p99", tool: "metrics payload" },
  { id: 5, action: "Map cascade path", tool: "Simulator mesh" },
  { id: 6, action: "Run OMEGA pipeline", tool: "POST /incidents" },
  { id: 7, action: "Validate RCA confidence ≥ 85%", tool: "Scientist" },
  { id: 8, action: "Compare scenarios risk < 50%", tool: "Simulator" },
  { id: 9, action: "IC approve/reject", tool: "Human gate" },
  { id: 10, action: "Add to golden dataset + retro", tool: "Langfuse CI" },
];

export function CodebaseChecklist({ completedThrough = 6 }: { completedThrough?: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-3">Codebase / Incident Playbook (15 min)</p>
      <div className="space-y-1.5">
        {CHECKS.map((c) => (
          <div
            key={c.id}
            className={`flex gap-2 text-[10px] font-mono px-2 py-1 rounded ${
              c.id <= completedThrough ? "bg-emerald-500/5 text-zinc-300" : "text-zinc-600"
            }`}
          >
            <span className={c.id <= completedThrough ? "text-emerald-500" : "text-zinc-700"}>
              {c.id <= completedThrough ? "✓" : "○"}
            </span>
            <span className="flex-1">{c.action}</span>
            <span className="text-zinc-600">{c.tool}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
