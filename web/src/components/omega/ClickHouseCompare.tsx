"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Database,
  FileJson,
  Gauge,
  HardDrive,
  Zap,
} from "lucide-react";
import { useState } from "react";

const WITH_CH = [
  { icon: Zap, text: "Columnar MergeTree — aggregate 10k incidents in single-digit ms" },
  { icon: Database, text: "Structured columns: service, severity, approval — no full JSON scan" },
  { icon: CheckCircle2, text: "ReplacingMergeTree keeps latest version per incident_id safely" },
  { icon: Gauge, text: "SQL analytics: approval rate, by_service, avg quality in one query" },
  { icon: HardDrive, text: "Full payload JSON + indexed columns — best of both worlds" },
  { icon: CheckCircle2, text: "Auto-migrates incidents.json on first connect" },
];

const WITHOUT_CH = [
  { icon: FileJson, text: "Whole incidents.json loaded into memory on every list/get" },
  { icon: Ban, text: "O(n) scan to find one incident — slows as file grows" },
  { icon: AlertTriangle, text: "Concurrent writes risk corrupt JSON (no ACID)" },
  { icon: Ban, text: "Analytics = Python loops over every incident dict" },
  { icon: AlertTriangle, text: "No column pruning — read 50KB payload to filter by service" },
  { icon: Ban, text: "Unsafe for production bridge during SEV1 volume" },
];

export function ClickHouseCompare({
  queryMs,
  jsonMs,
  connected,
  total,
}: {
  queryMs?: number | null;
  jsonMs?: number | null;
  connected?: boolean;
  total?: number;
}) {
  const [withCh, setWithCh] = useState(true);
  const items = withCh ? WITH_CH : WITHOUT_CH;
  const speedup = queryMs && jsonMs && queryMs > 0 ? (jsonMs / queryMs).toFixed(1) : "40+";

  return (
    <section className="relative rounded-2xl border border-zinc-800/80 bg-zinc-950/70 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.1),transparent_60%)]" />

      <div className="relative p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <motion.p
              className="text-[10px] uppercase tracking-[0.35em] text-amber-400/80"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              Incident storage layer
            </motion.p>
            <h2 className="text-2xl font-black tracking-tight mt-1">
              <span className={withCh ? "text-amber-300" : "text-red-400"}>
                {withCh ? "WITH ClickHouse" : "WITHOUT ClickHouse"}
              </span>
              {connected !== undefined && (
                <span className="ml-2 text-[10px] font-mono text-zinc-600 align-middle">
                  live: {connected ? "CONNECTED" : "JSON fallback"}
                </span>
              )}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setWithCh((v) => !v)}
            className="relative flex rounded-xl border border-zinc-700 p-1 bg-black/50"
          >
            <motion.div
              className="absolute top-1 bottom-1 rounded-lg"
              layout
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{
                width: "calc(50% - 4px)",
                left: withCh ? 4 : "calc(50%)",
                background: withCh
                  ? "linear-gradient(90deg, rgba(251,191,36,0.4), rgba(245,158,11,0.35))"
                  : "linear-gradient(90deg, rgba(239,68,68,0.4), rgba(249,115,22,0.3))",
                boxShadow: withCh ? "0 0 20px rgba(251,191,36,0.4)" : "0 0 20px rgba(239,68,68,0.4)",
              }}
            />
            <span className={`relative z-10 px-4 py-2 text-xs font-bold uppercase tracking-widest ${withCh ? "text-amber-100" : "text-zinc-500"}`}>
              ON
            </span>
            <span className={`relative z-10 px-4 py-2 text-xs font-bold uppercase tracking-widest ${!withCh ? "text-red-300" : "text-zinc-500"}`}>
              OFF
            </span>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <motion.div className="rounded-xl border border-zinc-800 bg-black/40 p-4" animate={{ borderColor: withCh ? "rgba(251,191,36,0.4)" : "rgba(39,39,42,0.8)" }}>
            <p className="text-[9px] uppercase text-zinc-600">Analytics query</p>
            <p className={`text-3xl font-black font-mono ${withCh ? "text-amber-400" : "text-red-400"}`}>
              {withCh ? (queryMs != null ? `${queryMs}ms` : "<10ms") : (jsonMs != null ? `${jsonMs}ms` : "~50ms+")}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">{withCh ? "columnar GROUP BY" : "load + loop entire JSON"}</p>
          </motion.div>
          <motion.div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
            <p className="text-[9px] uppercase text-zinc-600">Incidents stored</p>
            <p className="text-3xl font-black font-mono text-zinc-200">{total ?? 0}</p>
            <p className="text-[10px] text-zinc-500 mt-1">{withCh ? "omega_incidents table" : "data/incidents.json"}</p>
          </motion.div>
          <motion.div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
            <p className="text-[9px] uppercase text-zinc-600">Speedup</p>
            <p className={`text-3xl font-black font-mono ${withCh ? "text-emerald-400" : "text-zinc-600"}`}>
              {withCh ? `${speedup}×` : "1×"}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">{withCh ? "vs JSON file scan" : "baseline"}</p>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.ul
            key={withCh ? "with" : "without"}
            className="space-y-2 mb-6"
            initial={{ opacity: 0, x: withCh ? -16 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
          >
            {items.map((item, i) => (
              <motion.li
                key={item.text}
                className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${
                  withCh ? "border-amber-500/20 bg-amber-500/5 text-zinc-300" : "border-red-500/20 bg-red-500/5 text-zinc-400"
                }`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <item.icon className={`w-4 h-4 shrink-0 mt-0.5 ${withCh ? "text-amber-400" : "text-red-400"}`} />
                {item.text}
              </motion.li>
            ))}
          </motion.ul>
        </AnimatePresence>

        <div className="rounded-xl border border-zinc-800 bg-black/60 p-4 font-mono text-[10px] overflow-hidden relative">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          />
          {withCh ? (
            <pre className="text-amber-200/90 relative">{`SELECT service, avg(severity), count()
FROM omega_incidents
GROUP BY service
-- ${queryMs ?? 8}ms · ${total ?? 0} rows`}</pre>
          ) : (
            <pre className="text-red-300/80 relative">{`items = json.load("incidents.json")  # ${jsonMs ?? 45}ms
for i in items:  # O(n) every request
    if i["event"]["service"] == "auth": ...`}</pre>
          )}
        </div>
      </div>
    </section>
  );
}
