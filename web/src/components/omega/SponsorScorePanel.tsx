"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getSponsors, type SponsorReport } from "@/lib/omega-api";

const PRIZE: Record<string, string> = {
  langfuse: "$350",
  openui: "$2,000",
  clickhouse: "$1,600",
  senso: "$2k credits",
  guild: "$2,800",
  pioneer: "$500",
  composio: "$200",
  airbyte: "$1,750",
  truefoundry: "$1k credits",
  render: "Render credits",
};

function tierColor(tier: string) {
  if (tier === "strong") return "text-emerald-400 border-emerald-500/40";
  if (tier === "competitive") return "text-cyan-400 border-cyan-500/40";
  if (tier === "partial") return "text-amber-400 border-amber-500/40";
  return "text-zinc-500 border-zinc-700";
}

export function SponsorScorePanel() {
  const [report, setReport] = useState<SponsorReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSponsors()
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  if (error) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-500">
        Sponsor analytics unavailable — start backend on :8001
      </section>
    );
  }

  if (!report) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-500 animate-pulse">
        Loading sponsor score analytics…
      </section>
    );
  }

  return (
    <motion.section
      className="rounded-2xl border border-violet-500/30 bg-zinc-950/80 p-6"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-violet-400/80 mb-1">
        Hackathon sponsor scorecard
      </p>
      <h2 className="text-lg font-black text-zinc-100">
        {report.enabled_count} sponsors integrated · avg {report.average_score}/10
      </h2>
      <p className="text-xs text-zinc-500 mt-1 mb-4">
        Top pitches:{" "}
        {report.recommended_pitches
          .slice(0, 3)
          .map(([k, s]) => `${k} (${s})`)
          .join(" · ")}
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(report.sponsors).map(([key, s]) => (
          <div
            key={key}
            className={`rounded-xl border bg-black/40 p-3 ${tierColor(s.tier)}`}
          >
            <div className="flex justify-between items-start gap-2">
              <p className="font-bold text-sm capitalize text-zinc-100">{key}</p>
              <span className="text-xs font-mono">{s.score}/10</span>
            </div>
            <p className="text-[10px] text-zinc-600 mt-0.5">{PRIZE[key] ?? "sponsor"}</p>
            <p className="text-[11px] text-zinc-400 mt-2 leading-snug">{s.why}</p>
            <p className="text-[10px] text-zinc-500 mt-1">
              <span className="text-zinc-600">↑ </span>
              {s.improved}
            </p>
            {!s.enabled && (
              <p className="text-[9px] text-amber-500/80 mt-2 font-mono">Set API keys to enable</p>
            )}
          </div>
        ))}
      </div>
      {report.sponsors.guild && (
        <div className="mt-4 rounded-lg border border-pink-500/30 bg-pink-500/5 p-3 text-xs text-zinc-400">
          <p className="font-bold text-pink-400 mb-1">Guild.ai — why + how</p>
          <p>
            <strong className="text-zinc-300">Why:</strong> LangGraph runs the 4-agent RCA swarm; Guild ships the
            operator-facing Incident Commander with versioned publish/rollback.
          </p>
          <p className="mt-1">
            <strong className="text-zinc-300">How:</strong>{" "}
            <code className="text-pink-300">guild/omega-commander/agent.ts</code> →{" "}
            <code className="text-pink-300">POST /public-incidents/…/replay</code> → Senso cited.md
          </p>
          <p className="mt-1">
            <strong className="text-zinc-300">Improved:</strong> Guild lane {report.sponsors.guild.score}/10 — production
            agent artifact vs raw curl
          </p>
        </div>
      )}
    </motion.section>
  );
}
