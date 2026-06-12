"use client";

const SCORE_META: Record<string, { label: string; source: string; color: string }> = {
  root_cause_quality: { label: "Root Cause Quality", source: "LLM Judge → Scientist", color: "cyan" },
  scenario_realism: { label: "Scenario Realism", source: "LLM Judge → Simulator", color: "amber" },
  action_safety: { label: "Action Safety", source: "LLM Judge → Response", color: "emerald" },
  human_approval: { label: "Human Approval", source: "Incident Commander", color: "violet" },
  resolution_accuracy: { label: "Resolution Accuracy", source: "Post-resolution ground truth", color: "pink" },
};

export function LangfuseScoresPanel({ scores }: { scores?: Record<string, number> }) {
  const keys = Object.keys(SCORE_META);

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <p className="text-[9px] uppercase tracking-widest text-emerald-500/80 mb-1">Langfuse · All Scores Matrix</p>
      <p className="text-[9px] text-zinc-600 mb-4 font-mono">5 scores per incident trace</p>
      <div className="space-y-3">
        {keys.map((key) => {
          const meta = SCORE_META[key];
          const raw = scores?.[key];
          const pct = raw !== undefined ? Math.round(raw * 100) : null;
          const pending = pct === null;

          return (
            <div key={key} className="rounded-lg border border-zinc-800/80 bg-black/20 px-3 py-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-zinc-300">{meta.label}</span>
                <span className="text-[8px] font-mono text-zinc-600">{key}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[9px] text-zinc-500">{meta.source}</span>
                <span className={`text-sm font-black font-mono ${pending ? "text-zinc-600" : "text-emerald-400"}`}>
                  {pending ? "pending" : key.includes("approval") || key.includes("accuracy") ? (raw === 1 ? "✓ 100%" : "✗ 0%") : `${pct}%`}
                </span>
              </div>
              {!pending && (
                <div className="h-1 rounded-full bg-zinc-900 mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
