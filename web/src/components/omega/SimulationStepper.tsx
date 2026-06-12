"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { SimulationState } from "@/lib/omega-api";

export function SimulationStepper({ simulation }: { simulation?: SimulationState | null }) {
  if (!simulation?.steps?.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-center text-zinc-600 text-xs font-mono">
        Run an incident to see digital twin simulation steps
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-amber-500/80">Digital Twin · 7-Step Simulation</p>
          <p className="font-mono text-[10px] text-zinc-500 mt-0.5">sim_id: {simulation.simulation_id.slice(0, 12)}…</p>
        </div>
        <span className="text-[9px] px-2 py-1 rounded border border-amber-500/30 text-amber-400 font-mono">
          blast: {Math.round((simulation.cascade?.blast_radius_score ?? 0) * 100)}%
        </span>
      </div>
      <div className="space-y-2">
        {simulation.steps.map((step, i) => (
          <motion.div
            key={step.step_id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-3 items-start rounded-lg border border-zinc-800/80 bg-black/30 px-3 py-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-2">
                <span className="text-[10px] font-bold text-zinc-200">{step.name}</span>
                <span className="text-[9px] font-mono text-violet-400">{step.step_id}</span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">{step.detail}</p>
              <p className="text-[9px] text-zinc-600 mt-0.5">owner: {step.owner}</p>
            </div>
          </motion.div>
        ))}
      </div>
      {simulation.fault_injection && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] font-mono">
          <div className="rounded border border-red-500/20 bg-red-500/5 px-2 py-1.5">
            <span className="text-red-400">FAULT </span>
            {simulation.fault_injection.node} · {simulation.fault_injection.type}
          </div>
          <div className="rounded border border-zinc-800 px-2 py-1.5 text-zinc-500">
            risk: {Math.round(simulation.aggregate_risk_score * 100)}% · gate:{" "}
            {simulation.requires_human_approval ? "ON" : "OFF"}
          </div>
        </div>
      )}
    </div>
  );
}

export function SimulationStepperLive({
  activeStep,
}: {
  activeStep: number;
}) {
  const steps = [
    "TWIN_BOOT",
    "TOPOLOGY_LOADED",
    "FAULT_INJECTED",
    "CASCADE_SIMULATED",
    "SCENARIOS_GENERATED",
    "SCENARIOS_RANKED",
    "RECOMMENDATION_READY",
  ];
  const labels = [
    "Boot Twin",
    "Load Topology",
    "Inject Fault",
    "Cascade",
    "Scenarios",
    "Rank",
    "Recommend",
  ];

  return (
    <div className="flex gap-1">
      {steps.map((id, i) => (
        <div key={id} className="flex-1 text-center">
          {i < activeStep ? (
            <CheckCircle2 className="w-3 h-3 mx-auto text-emerald-500" />
          ) : i === activeStep ? (
            <Loader2 className="w-3 h-3 mx-auto text-amber-400 animate-spin" />
          ) : (
            <Circle className="w-3 h-3 mx-auto text-zinc-700" />
          )}
          <p className="text-[7px] text-zinc-600 mt-0.5 truncate">{labels[i]}</p>
        </div>
      ))}
    </div>
  );
}
