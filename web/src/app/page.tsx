"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Terminal,
  XCircle,
} from "lucide-react";
import { AgentPipeline, type AgentId } from "@/components/omega/AgentPipeline";
import { AgentTerminal, type LogLine } from "@/components/omega/AgentTerminal";
import { DependencyMesh } from "@/components/omega/DependencyMesh";
import {
  AGENT_ORDER,
  AMBIENT_LOGS,
  PIPELINE_SCRIPT,
  delay,
} from "@/lib/omega-simulate";
import {
  Analytics,
  Incident,
  createIncident,
  getHealth,
  listIncidents,
  optimizePrompt,
  queryIncidents,
  submitFeedback,
} from "@/lib/omega-api";

const DEMO_GRAPH: Record<string, string[]> = {
  frontend: ["api-gateway"],
  "api-gateway": ["auth", "payments"],
  auth: ["database", "cache"],
  payments: ["database"],
  database: [],
  cache: [],
};

const CASCADE = ["auth", "database", "api-gateway", "frontend"];

const SAMPLE_QUERIES = [
  "Show incidents where OMEGA was wrong",
  "Why did Scientist fail on database incidents?",
  "Which service has highest severity?",
];

function ScoreBar({ label, value }: { label: string; value?: number }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] uppercase tracking-widest text-zinc-500">
        <span>{label}</span>
        <motion.span key={pct} initial={{ color: "#06b6d4" }} animate={{ color: "#a1a1aa" }}>
          {pct}%
        </motion.span>
      </div>
      <div className="h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toISOString().replace("T", " ").slice(0, 19));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-[10px] text-cyan-500/80">{time} UTC</span>;
}

export default function OmegaDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [health, setHealth] = useState<{ langfuse: boolean; llm: boolean; demo_mode: boolean } | null>(null);
  const [nlQuery, setNlQuery] = useState("");
  const [nlResult, setNlResult] = useState("");
  const [optimizeMsg, setOptimizeMsg] = useState("");
  const [error, setError] = useState("");

  const [activeAgent, setActiveAgent] = useState<AgentId>("idle");
  const [completedAgents, setCompletedAgents] = useState<Set<AgentId>>(new Set());
  const [logs, setLogs] = useState<LogLine[]>(AMBIENT_LOGS);
  const [tokens, setTokens] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const logInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushLogs = useCallback((newLines: LogLine[]) => {
    setLogs((prev) => [...prev.slice(-120), ...newLines]);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [h, data] = await Promise.all([getHealth(), listIncidents(25)]);
      setHealth(h);
      setIncidents(data.incidents);
      setAnalytics(data.analytics);
      setSelected((prev) => prev ?? data.incidents[0] ?? null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to connect to OMEGA API. Start backend: cd omega/backend && python run.py"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Ambient terminal chatter
  useEffect(() => {
    logInterval.current = setInterval(() => {
      const ambient = AMBIENT_LOGS[Math.floor(Math.random() * AMBIENT_LOGS.length)];
      pushLogs([{ ...ambient, id: `${ambient.id}-${Date.now()}` }]);
      if (!pipelineRunning) {
        setTokens((t) => t + Math.floor(Math.random() * 40));
        setLatencyMs(180 + Math.floor(Math.random() * 120));
      }
    }, 3500);
    return () => {
      if (logInterval.current) clearInterval(logInterval.current);
    };
  }, [pipelineRunning, pushLogs]);

  const animatePipeline = useCallback(async () => {
    setPipelineRunning(true);
    setActiveAgent("observer");
    setCompletedAgents(new Set());
    setTokens(0);
    setLatencyMs(0);

    pushLogs([
      {
        id: `start-${Date.now()}`,
        ts: new Date().toISOString().slice(11, 23),
        agent: "omega",
        level: "SYS",
        msg: "═══ INCIDENT CASCADE DETECTED ═══ auth.service :: initiating 4-agent swarm",
      },
    ]);

    for (const agent of AGENT_ORDER) {
      setActiveAgent(agent);
      const script = PIPELINE_SCRIPT[agent];
      for (const logLine of script) {
        pushLogs([logLine]);
        setTokens((t) => t + 80 + Math.floor(Math.random() * 120));
        setLatencyMs((l) => l + 60 + Math.floor(Math.random() * 80));
        await delay(280 + Math.random() * 200);
      }
      setCompletedAgents((prev) => new Set([...prev, agent]));
      await delay(400);
    }

    setActiveAgent("human");
    pushLogs([
      {
        id: `human-${Date.now()}`,
        ts: new Date().toISOString().slice(11, 23),
        agent: "human-gate",
        level: "WARN",
        msg: "HUMAN_APPROVAL_REQUIRED :: severity=HIGH → blocking autonomous execution",
      },
    ]);
    setPipelineRunning(false);
  }, [pushLogs]);

  const runDemoIncident = async () => {
    setRunning(true);
    setError("");
    const pipelinePromise = animatePipeline();
    try {
      const incident = await createIncident({
        type: "connection_pool_exhaustion",
        service: "auth",
        severity: 0.87,
        timestamp: new Date().toISOString(),
        metrics: { error_rate: 0.12, p99_ms: 1840 },
        dependency_graph: DEMO_GRAPH,
      });
      await pipelinePromise;
      setIncidents((prev) => [incident, ...prev]);
      setSelected(incident);
      setCompletedAgents(new Set(AGENT_ORDER));
      pushLogs([
        {
          id: `done-${Date.now()}`,
          ts: new Date().toISOString().slice(11, 23),
          agent: "langfuse",
          level: "LANGFUSE",
          msg: `trace.complete id=${incident.trace_id || incident.incident_id} scores=[root_cause_quality,scenario_realism,action_safety]`,
        },
      ]);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run incident");
      setActiveAgent("idle");
      setPipelineRunning(false);
    } finally {
      setRunning(false);
    }
  };

  const handleFeedback = async (approved: boolean) => {
    if (!selected) return;
    setRunning(true);
    pushLogs([
      {
        id: `fb-${Date.now()}`,
        ts: new Date().toISOString().slice(11, 23),
        agent: "langfuse",
        level: "LANGFUSE",
        msg: `langfuse.score name=human_approval value=${approved ? 1 : 0} → golden_dataset.append`,
      },
    ]);
    try {
      const updated = await submitFeedback(
        selected.incident_id,
        approved,
        approved ? "Correct root cause and safe remediation" : "Incorrect root cause — missed cascade"
      );
      setSelected(updated);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Feedback failed");
    } finally {
      setRunning(false);
    }
  };

  const handleOptimize = async () => {
    setRunning(true);
    setOptimizeMsg("");
    pushLogs([
      {
        id: `opt-${Date.now()}`,
        ts: new Date().toISOString().slice(11, 23),
        agent: "optimizer",
        level: "LLM",
        msg: "prompt_optimizer.run :: fetching human_approval<0.5 traces from Langfuse...",
      },
    ]);
    try {
      const result = await optimizePrompt("scientist");
      setOptimizeMsg(`${result.story} — ${result.prompt_name} v${result.version}`);
      pushLogs([
        {
          id: `opt-done-${Date.now()}`,
          ts: new Date().toISOString().slice(11, 23),
          agent: "langfuse",
          level: "LANGFUSE",
          msg: `prompt.deploy scientist-root-cause@${result.version} label=production (no redeploy)`,
        },
      ]);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setRunning(false);
    }
  };

  const handleNlQuery = async (q?: string) => {
    const query = q || nlQuery;
    if (!query.trim()) return;
    setRunning(true);
    pushLogs([
      {
        id: `nl-${Date.now()}`,
        ts: new Date().toISOString().slice(11, 23),
        agent: "mcp",
        level: "TRACE",
        msg: `langfuse.mcp.query "${query}"`,
      },
    ]);
    try {
      const result = await queryIncidents(query);
      setNlResult(`Found ${result.count} incidents. ${result.mcp_note}`);
      if (result.incidents.length) {
        setIncidents(result.incidents);
        setSelected(result.incidents[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query failed");
    } finally {
      setRunning(false);
    }
  };

  const approvalPct = Math.round((analytics?.human_approval_rate ?? 0) * 100);
  const hotNode = pipelineRunning || running ? "auth" : selected?.event.service;

  return (
    <main className="min-h-screen bg-[#030305] text-zinc-100 overflow-x-hidden">
      {/* Animated grid background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(6,182,212,0.12),transparent_50%)]"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ repeat: Infinity, duration: 6 }}
        />
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(139,92,246,0.1),transparent_50%)]"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ repeat: Infinity, duration: 8, delay: 1 }}
        />
      </div>

      <header className="relative border-b border-cyan-500/10 bg-[#030305]/90 backdrop-blur-xl px-6 md:px-10 py-4">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/Sbnikitha/omega"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-cyan-400 transition-colors flex items-center gap-2 text-[10px] uppercase tracking-widest"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> GitHub
            </a>
            <div>
              <div className="flex items-center gap-3">
                <motion.h1
                  className="text-2xl font-black tracking-tight"
                  animate={{ textShadow: ["0 0 0px cyan", "0 0 20px rgba(6,182,212,0.4)", "0 0 0px cyan"] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  OMEGA <span className="text-cyan-400">×</span>{" "}
                  <span className="text-violet-400">Langfuse</span>
                </motion.h1>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10">
                  <Radio className="w-3 h-3 text-red-400 animate-pulse" />
                  <span className="text-[9px] font-mono text-red-400 uppercase">Live</span>
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 mt-0.5">
                Autonomous Reality Defense · Incident Intelligence Loop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LiveClock />
            {health && (
              <div className="flex gap-2 text-[9px] font-mono uppercase tracking-wider">
                <span className={`px-2 py-1 rounded border ${health.langfuse ? "border-cyan-500/40 text-cyan-400 bg-cyan-500/5" : "border-zinc-800 text-zinc-600"}`}>
                  LF:{health.langfuse ? "ON" : "OFF"}
                </span>
                <span className={`px-2 py-1 rounded border ${health.demo_mode ? "border-amber-500/40 text-amber-400" : "border-violet-500/40 text-violet-400"}`}>
                  {health.demo_mode ? "DEMO" : "PROD"}
                </span>
              </div>
            )}
            <button
              onClick={refresh}
              className="p-2 rounded-lg border border-zinc-800 hover:border-cyan-500/40 transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="relative max-w-[1600px] mx-auto px-6 md:px-10 py-6 space-y-5">
        {/* Top metrics ticker */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Human Approval", value: `${approvalPct}%`, accent: "text-cyan-400" },
            { label: "Incidents", value: String(analytics?.total ?? 0), accent: "text-white" },
            { label: "Avg Quality", value: `${Math.round((analytics?.avg_root_cause_quality ?? 0) * 100)}%`, accent: "text-violet-400" },
            { label: "Tokens (session)", value: tokens.toLocaleString(), accent: "text-pink-400" },
            { label: "Pipeline Latency", value: `${latencyMs}ms`, accent: "text-amber-400" },
          ].map((m) => (
            <motion.div
              key={m.label}
              className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3"
              whileHover={{ borderColor: "rgba(6,182,212,0.3)" }}
            >
              <p className="text-[9px] uppercase tracking-widest text-zinc-600">{m.label}</p>
              <motion.p key={m.value} className={`text-2xl font-black font-mono ${m.accent}`} initial={{ y: 4, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }}>
                {m.value}
              </motion.p>
            </motion.div>
          ))}
        </div>

        {/* Agent pipeline — hero */}
        <AgentPipeline
          activeAgent={activeAgent}
          completedAgents={completedAgents}
          spanIds={selected?.span_ids}
          tokens={tokens}
          latencyMs={latencyMs}
        />

        <div className="grid lg:grid-cols-12 gap-5">
          {/* Left column */}
          <div className="lg:col-span-4 space-y-4">
            <DependencyMesh hotNode={hotNode} cascadeNodes={pipelineRunning ? CASCADE : selected?.root_cause?.affected_services || []} />

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-500" /> Command
              </p>
              <motion.button
                onClick={runDemoIncident}
                disabled={running}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(6,182,212,0.25)] transition-all"
              >
                {running ? "◉ Agents Running..." : "▶ Inject Live Incident"}
              </motion.button>
              <button
                onClick={handleOptimize}
                disabled={running}
                className="w-full py-3 rounded-xl border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-2" />
                Langfuse Prompt Optimizer
              </button>
              {optimizeMsg && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-violet-300/80 font-mono leading-relaxed">
                  {optimizeMsg}
                </motion.p>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">NL Query · MCP</p>
              <div className="flex gap-2">
                <input
                  value={nlQuery}
                  onChange={(e) => setNlQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNlQuery()}
                  placeholder="langfuse.mcp → query traces..."
                  className="flex-1 bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500/50"
                />
                <button onClick={() => handleNlQuery()} className="p-2 rounded-lg border border-zinc-700 hover:border-cyan-500/50">
                  <Search className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setNlQuery(q);
                      handleNlQuery(q);
                    }}
                    className="text-[9px] px-2 py-1 rounded border border-zinc-800 text-zinc-600 hover:text-cyan-400 hover:border-cyan-500/30 font-mono"
                  >
                    {q}
                  </button>
                ))}
              </div>
              {nlResult && <p className="text-[10px] text-cyan-400/70 mt-2 font-mono">{nlResult}</p>}
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 overflow-hidden max-h-52">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 px-4 py-2 border-b border-zinc-800">Incident Queue</p>
              <div className="overflow-y-auto max-h-44 custom-scrollbar divide-y divide-zinc-900">
                {incidents.map((inc) => (
                  <button
                    key={inc.incident_id}
                    onClick={() => {
                      setSelected(inc);
                      setCompletedAgents(new Set(AGENT_ORDER));
                      setActiveAgent("human");
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-cyan-500/5 transition-colors font-mono text-[11px] ${selected?.incident_id === inc.incident_id ? "bg-cyan-500/10 border-l-2 border-cyan-500" : ""}`}
                  >
                    <div className="flex justify-between">
                      <span className="text-zinc-300">{inc.event.service}</span>
                      <span className={inc.status.includes("approv") ? "text-emerald-500" : inc.status === "rejected" ? "text-red-500" : "text-amber-500"}>
                        {inc.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center + right: terminal + detail */}
          <div className="lg:col-span-8 space-y-4">
            <AgentTerminal lines={logs} maxHeight="280px" />

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 font-mono">{error}</div>
            )}

            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.incident_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-5">
                    <div className="flex flex-wrap justify-between gap-4 mb-5">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-600">Langfuse Trace</p>
                        <p className="font-mono text-sm text-cyan-400">{selected.trace_id || selected.incident_id}</p>
                      </div>
                      <div className="flex gap-2">
                        {selected.human_approved == null ? (
                          <>
                            <motion.button
                              onClick={() => handleFeedback(true)}
                              disabled={running}
                              whileHover={{ scale: 1.05 }}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Approve
                            </motion.button>
                            <motion.button
                              onClick={() => handleFeedback(false)}
                              disabled={running}
                              whileHover={{ scale: 1.05 }}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600/20 border border-red-500/50 text-red-400 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" /> Reject
                            </motion.button>
                          </>
                        ) : (
                          <span
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                              selected.human_approved
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-red-500/10 text-red-400 border-red-500/30"
                            }`}
                          >
                            {selected.human_approved ? "✓ Human Approved" : "✗ Human Rejected"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                        <p className="text-[9px] uppercase tracking-widest text-cyan-600 mb-2">Root Cause · Scientist</p>
                        <p className="font-bold text-lg text-cyan-100">{selected.root_cause?.root_cause || "—"}</p>
                        <p className="text-xs text-zinc-400 mt-2 font-mono leading-relaxed">{selected.root_cause?.reasoning}</p>
                        <div className="mt-3 flex gap-2 flex-wrap">
                          <span className="text-[9px] px-2 py-1 rounded bg-black/40 border border-zinc-800 font-mono">
                            conf:{Math.round((selected.root_cause?.confidence ?? 0) * 100)}%
                          </span>
                          {selected.root_cause?.affected_services?.map((s) => (
                            <span key={s} className="text-[9px] px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-mono">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="text-[9px] uppercase tracking-widest text-emerald-600 mb-2">Action · Response Agent</p>
                        <p className="font-bold text-lg font-mono text-emerald-100">{selected.action_plan?.recommended_action_id || "—"}</p>
                        <p className="text-xs text-zinc-400 mt-2">{selected.action_plan?.rationale}</p>
                        {selected.action_plan?.requires_human_approval && (
                          <motion.span
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="inline-block mt-3 text-[9px] px-2 py-1 rounded border border-amber-500/50 text-amber-400 uppercase tracking-widest"
                          >
                            ⚠ Human Gate Active
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-5">
                    <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-4">LLM-as-Judge · Langfuse Auto-Eval</p>
                    <div className="grid md:grid-cols-3 gap-4">
                      <ScoreBar label="Root Cause Quality" value={selected.auto_scores?.root_cause_quality} />
                      <ScoreBar label="Scenario Realism" value={selected.auto_scores?.scenario_realism} />
                      <ScoreBar label="Action Safety" value={selected.auto_scores?.action_safety} />
                    </div>
                  </div>

                  {selected.scenarios?.scenarios && (
                    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-5">
                      <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-4">Digital Twin · Simulator Output</p>
                      <div className="grid md:grid-cols-2 gap-3">
                        {selected.scenarios.scenarios.map((s) => (
                          <motion.div
                            key={s.id}
                            className={`rounded-xl border p-4 font-mono text-xs ${
                              s.id === selected.scenarios?.recommended_scenario_id
                                ? "border-cyan-500/40 bg-cyan-500/5 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                                : "border-zinc-800"
                            }`}
                            whileHover={{ scale: 1.01 }}
                          >
                            <div className="flex justify-between mb-2">
                              <span className="font-bold text-zinc-200">{s.action}</span>
                              <span className="text-amber-500">risk:{Math.round(s.risk_score * 100)}%</span>
                            </div>
                            <p className="text-zinc-500">{s.predicted_impact}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-16 text-center">
                  <motion.p
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-zinc-600 font-mono text-sm"
                  >
                    awaiting incident injection...
                  </motion.p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}
