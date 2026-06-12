"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Database, ExternalLink, X, Zap } from "lucide-react";
import type { PublicIncidentSummary } from "@/lib/omega-api";
import { computeWhatIf } from "@/lib/what-if-calc";

type Props = {
  open: boolean;
  onClose: () => void;
  incidents: PublicIncidentSummary[];
  running: boolean;
  onRun: (incidentId: string) => void;
};

export function DatasetIncidentModal({ open, onClose, incidents, running, onRun }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/70 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-4 top-[8vh] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50 rounded-2xl border border-cyan-500/30 bg-zinc-950 shadow-2xl max-h-[80vh] flex flex-col"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-cyan-500/80 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5" />
                  Real incident dataset
                </p>
                <h2 className="text-lg font-bold text-zinc-100 mt-0.5">Choose an outage → run OMEGA agents</h2>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-900 text-zinc-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="px-5 py-2 text-xs text-zinc-500 border-b border-zinc-900">
              Curated from public postmortems & status pages — same golden dataset as Incidents tab.
            </p>

            <ul className="overflow-y-auto flex-1 divide-y divide-zinc-900 custom-scrollbar">
              {incidents.map((inc) => {
                const savings = inc.cost_savings ?? computeWhatIf(inc.mttr_minutes, inc.severity);
                return (
                  <li key={inc.id} className="px-5 py-4 hover:bg-zinc-900/50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-500">
                          {inc.company} · {inc.date} · MTTR {inc.mttr_minutes}m
                        </p>
                        <p className="text-sm font-medium text-zinc-200 mt-1">{inc.title}</p>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{inc.summary}</p>
                        <p className="text-[10px] text-emerald-500/80 mt-2 font-mono">
                          OMEGA would save ~${Math.round(savings.net_savings_usd).toLocaleString()} ·{" "}
                          {savings.work_hours_saved}h bridge time
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={running}
                          onClick={() => {
                            onRun(inc.id);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-xs font-bold uppercase tracking-wide text-white"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Run agents
                        </button>
                        <a
                          href={inc.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300"
                        >
                          Source <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
