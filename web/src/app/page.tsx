"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Info,
  LayoutDashboard,
  Database,
  Sparkles,
  Radio,
  RefreshCw,
  Search,
  Terminal,
  XCircle,
} from "lucide-react";
import { DatasetIncidentModal } from "@/components/omega/DatasetIncidentModal";
import { CostSavingsSummaryBar, OpsCostTicker } from "@/components/omega/CostSavingsPanel";
import { OmegaWhatIfPanel } from "@/components/omega/OmegaWhatIfPanel";
import { GuideTab } from "@/components/omega/GuideTab";
import {
  PublicIncidentLibrary,
  PublicIncidentMinimalDetail,
} from "@/components/omega/PublicIncidentLibrary";
import { AgentPipeline, type AgentId } from "@/components/omega/AgentPipeline";
import { AgentTerminal, type LogLine } from "@/components/omega/AgentTerminal";
import { CascadeTimeline } from "@/components/omega/CascadeTimeline";
import { ChangeLog } from "@/components/omega/ChangeLog";
import { CodebaseChecklist } from "@/components/omega/CodebaseChecklist";
import { DependencyMesh } from "@/components/omega/DependencyMesh";
import { ImprovementChart } from "@/components/omega/ImprovementChart";
import { IncidentTimeline } from "@/components/omega/IncidentTimeline";
import { LangfuseScoresPanel } from "@/components/omega/LangfuseScoresPanel";
import { RACIPanel } from "@/components/omega/RACIPanel";
import { ScenarioComparisonTable } from "@/components/omega/ScenarioComparisonTable";
import { SimulationStepper, SimulationStepperLive } from "@/components/omega/SimulationStepper";
import {
  AGENT_ORDER,
  AMBIENT_LOGS,
  PIPELINE_SCRIPT,
  delay,
} from "@/lib/omega-simulate";
import {
  Analytics,
  Incident,
  PublicIncidentDetail,
  PublicIncidentSummary,
  CostSavingsSummary,
  createIncident,
  getHealth,
  getPublicIncident,
  listIncidents,
  listPublicIncidents,
  optimizePrompt,
  queryIncidents,
  PaymentRequiredError,
  replayPublicIncident,
  submitFeedback,
  type HealthStatus,
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

function LiveClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setTime(new Date().toISOString().replace("T", " ").slice(0, 19));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (time === null) {
    return <span className="font-mono text-[10px] text-cyan-500/50">--:--:-- UTC</span>;
  }
  return (
    <span className="font-mono text-[10px] text-cyan-500/80" suppressHydrationWarning>
      {time} UTC
    </span>
  );
}

export default function OmegaDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
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
  const [simulationStep, setSimulationStep] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"library" | "ops" | "guide">("library");
  const [publicIncidents, setPublicIncidents] = useState<PublicIncidentSummary[]>([]);
  const [selectedPublicId, setSelectedPublicId] = useState<string | null>(null);
  const [publicDetail, setPublicDetail] = useState<PublicIncidentDetail | null>(null);
  const [publicComparison, setPublicComparison] = useState<{
    root_cause_match: boolean;
    comparison: {
      real_root_cause: string;
      omega_root_cause: string | null;
      real_resolution: string;
      omega_action: string | null;
      real_mttr_minutes: number;
    };
  } | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [publicSavings, setPublicSavings] = useState<CostSavingsSummary | null>(null);
  const [datasetModalOpen, setDatasetModalOpen] = useState(false);
  const logInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    (async () => {
      try {
        const data = await listPublicIncidents();
        setPublicIncidents(data.incidents);
        setPublicSavings(data.savings_summary);
        setSelectedPublicId((prev) => prev ?? data.incidents[0]?.id ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load public incidents");
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedPublicId) {
      setPublicDetail(null);
      setPublicComparison(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const detail = await getPublicIncident(selectedPublicId);
        if (!cancelled) {
          setPublicDetail(detail);
          setPublicComparison(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load incident");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPublicId]);

  // Ambient terminal chatter — client-only (after mount) to avoid hydration drift
  useEffect(() => {
    if (!mounted) return;
    logInterval.current = setInterval(() => {
      const ambient = AMBIENT_LOGS[Math.floor(Math.random() * AMBIENT_LOGS.length)];
      pushLogs([
        {
          ...ambient,
          id: `${ambient.id}-${Date.now()}`,
          ts: new Date().toISOString().slice(11, 23),
        },
      ]);
      if (!pipelineRunning) {
        setTokens((t) => t + Math.floor(Math.random() * 40));
        setLatencyMs(180 + Math.floor(Math.random() * 120));
      }
    }, 3500);
    return () => {
      if (logInterval.current) clearInterval(logInterval.current);
    };
  }, [mounted, pipelineRunning, pushLogs]);

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
      if (agent === "simulator") {
        for (let s = 0; s < 7; s++) {
          setSimulationStep(s);
          await delay(350);
        }
      }
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
    setSimulationStep(7);

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

  const runIncidentFromEvent = async (event: Incident["event"], logLabel: string) => {
    setRunning(true);
    setError("");
    setViewMode("ops");
    const pipelinePromise = animatePipeline();
    try {
      const incident = await createIncident(event);
      await pipelinePromise;
      setIncidents((prev) => [incident, ...prev]);
      setSelected(incident);
      setCompletedAgents(new Set(AGENT_ORDER));
      setActiveAgent("human");
      pushLogs([
        {
          id: `gen-${Date.now()}`,
          ts: new Date().toISOString().slice(11, 23),
          agent: "omega",
          level: "SYS",
          msg: `INCIDENT_GENERATED :: ${logLabel} → swarm dispatched`,
        },
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
      if (e instanceof PaymentRequiredError) {
        setError(
          `${e.message} — set NEXT_PUBLIC_OMEGA_PAYMENT_TOKEN=demo-paid or run backend with OMEGA_DEMO_MODE=true`
        );
      } else {
        setError(e instanceof Error ? e.message : "Failed to run incident");
      }
      setActiveAgent("idle");
      setPipelineRunning(false);
    } finally {
      setRunning(false);
    }
  };

  const runDemoIncident = async () => {
    await runIncidentFromEvent(
      {
        type: "connection_pool_exhaustion",
        service: "auth",
        severity: 0.87,
        timestamp: new Date().toISOString(),
        metrics: { error_rate: 0.12, p99_ms: 1840 },
        dependency_graph: DEMO_GRAPH,
      },
      "auth connection_pool_exhaustion (demo)"
    );
  };

  const handlePublicReplay = async (incidentId?: string) => {
    const id = incidentId ?? selectedPublicId;
    if (!id) return;
    setReplaying(true);
    setRunning(true);
    setError("");
    setViewMode("ops");
    const pipelinePromise = animatePipeline();
    try {
      const result = await replayPublicIncident(id);
      await pipelinePromise;
      setPublicComparison({
        root_cause_match: result.root_cause_match,
        comparison: result.comparison,
      });
      setIncidents((prev) => [result.omega_incident, ...prev]);
      setSelected(result.omega_incident);
      setCompletedAgents(new Set(AGENT_ORDER));
      setActiveAgent("human");
      setPipelineRunning(false);
      pushLogs([
        {
          id: `replay-${Date.now()}`,
          ts: new Date().toISOString().slice(11, 23),
          agent: "omega",
          level: "SYS",
          msg: `DATASET_REPLAY :: ${id} → 4-agent swarm complete`,
        },
      ]);
      await refresh();
    } catch (e) {
      if (e instanceof PaymentRequiredError) {
        setError(
          `${e.message} — set NEXT_PUBLIC_OMEGA_PAYMENT_TOKEN=demo-paid or run backend with OMEGA_DEMO_MODE=true`
        );
      } else {
        setError(e instanceof Error ? e.message : "Replay failed");
      }
      setActiveAgent("idle");
      setPipelineRunning(false);
    } finally {
      setReplaying(false);
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
  const hotNode =
    pipelineRunning || running
      ? selected?.event.service ?? "auth"
      : selected?.event.service;

  const isLibrary = viewMode === "library";
  const isGuide = viewMode === "guide";
  const isMinimalChrome = isLibrary;
  const isAnimatedChrome = isGuide || viewMode === "ops";

  return (
    <main className={`min-h-screen overflow-x-hidden ${isMinimalChrome ? "bg-zinc-950 text-zinc-100" : "bg-[#030305] text-zinc-100"}`}>
      {/* Animated grid background — ops mode only */}
      {isAnimatedChrome && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />
          {mounted && (
            <>
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(6,182,212,0.12),transparent_50%)]"
                initial={false}
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ repeat: Infinity, duration: 6 }}
              />
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(139,92,246,0.1),transparent_50%)]"
                initial={false}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ repeat: Infinity, duration: 8, delay: 1 }}
              />
            </>
          )}
        </div>
      )}

      <header
        className={`relative backdrop-blur-xl px-6 md:px-10 py-4 ${
          isMinimalChrome
            ? "border-b border-zinc-800 bg-zinc-950/95"
            : "border-b border-cyan-500/10 bg-[#030305]/90"
        }`}
      >
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
                <h1 className="text-2xl font-black tracking-tight">
                  OMEGA <span className="text-cyan-400">×</span>{" "}
                  <span className="text-violet-400">Langfuse</span>
                </h1>
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
            <div className="flex rounded-lg border border-zinc-800 p-0.5 bg-zinc-900/50">
              <button
                type="button"
                onClick={() => setViewMode("library")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isLibrary ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Incidents
              </button>
              <button
                type="button"
                onClick={() => setViewMode("guide")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isGuide
                    ? "bg-violet-500/25 text-violet-200 border border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.35)]"
                    : "text-zinc-500 hover:text-violet-300"
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                Guide
              </button>
              <button
                type="button"
                onClick={() => setViewMode("ops")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "ops" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Ops center
              </button>
            </div>
            <LiveClock />
            {health && (
              <div className="flex gap-2 text-[9px] font-mono uppercase tracking-wider">
                <span className={`px-2 py-1 rounded border ${health.langfuse ? "border-cyan-500/40 text-cyan-400 bg-cyan-500/5" : "border-zinc-800 text-zinc-600"}`}>
                  LF:{health.langfuse ? "ON" : "OFF"}
                </span>
                <span className={`px-2 py-1 rounded border ${health.demo_mode ? "border-amber-500/40 text-amber-400" : "border-violet-500/40 text-violet-400"}`}>
                  {health.demo_mode ? "DEMO" : "PROD"}
                </span>
                <span className={`px-2 py-1 rounded border ${health.clickhouse ? "border-amber-500/40 text-amber-400 bg-amber-500/5" : "border-zinc-800 text-zinc-600"}`}>
                  CH:{health.clickhouse ? "ON" : health.storage_backend === "json_file" ? "JSON" : "OFF"}
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
        {isGuide ? (
          <GuideTab
            analytics={analytics}
            clickhouseConnected={health?.clickhouse}
            paymentBypass={health?.payment_bypass}
          />
        ) : isLibrary ? (
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}
            {publicSavings && <CostSavingsSummaryBar summary={publicSavings} />}
            {selectedPublicId && (() => {
              const summary = publicIncidents.find((i) => i.id === selectedPublicId);
              return summary ? <OmegaWhatIfPanel incident={summary} /> : null;
            })()}
            <div className="grid lg:grid-cols-12 gap-5">
              <div className="lg:col-span-4">
                <PublicIncidentLibrary
                  incidents={publicIncidents}
                  selectedId={selectedPublicId ?? undefined}
                  onSelect={setSelectedPublicId}
                />
              </div>
              <div className="lg:col-span-8">
                {publicDetail ? (
                  <PublicIncidentMinimalDetail
                    incident={publicDetail}
                    onReplay={() => handlePublicReplay()}
                    replaying={replaying}
                    comparison={publicComparison}
                  />
                ) : (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-16 text-center text-zinc-500 text-sm">
                    Select an incident to view the published report
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* Top metrics ticker */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <OpsCostTicker
            workHoursSaved={analytics?.cost_savings?.totals.work_hours_saved ?? 0}
            netSavingsUsd={analytics?.cost_savings?.totals.net_savings_usd ?? 0}
            llmCostUsd={analytics?.cost_savings?.totals.llm_cost_usd ?? 0}
          />
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
              <p className={`text-2xl font-black font-mono ${m.accent}`}>{m.value}</p>
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
            <ImprovementChart analytics={analytics} />
            <DependencyMesh hotNode={hotNode} cascadeNodes={pipelineRunning ? CASCADE : selected?.simulation?.cascade?.order || selected?.root_cause?.affected_services || []} />
            <CodebaseChecklist completedThrough={selected?.status === "approved" || selected?.status === "rejected" ? 10 : selected ? 7 : 3} />

            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-cyan-500/80 flex items-center gap-2">
                <Database className="w-3.5 h-3.5" />
                Real incident dataset
              </p>
              <p className="text-[11px] text-zinc-500">
                Pick a public postmortem (Google, GitHub, AWS…) and dispatch the 4-agent swarm.
              </p>
              <motion.button
                type="button"
                onClick={() => setDatasetModalOpen(true)}
                disabled={running || replaying}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 text-xs font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2"
              >
                <Database className="w-4 h-4" />
                Choose from dataset
              </motion.button>
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-500" /> Quick inject
              </p>
              <motion.button
                onClick={runDemoIncident}
                disabled={running}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-2.5 rounded-xl border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-50 text-[10px] font-black uppercase tracking-[0.15em] transition-all"
              >
                {running ? "◉ Running…" : "▶ Demo incident (auth pool)"}
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

                  <div className="grid lg:grid-cols-2 gap-4">
                    <IncidentTimeline timeline={selected.timeline} incidentId={selected.incident_id} />
                    <RACIPanel incident={selected} />
                  </div>

                  {pipelineRunning && simulationStep >= 0 && simulationStep < 7 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                      <p className="text-[9px] uppercase text-amber-400 mb-2">Live simulation progress</p>
                      <SimulationStepperLive activeStep={simulationStep} />
                    </div>
                  )}

                  <SimulationStepper simulation={selected.simulation} />
                  <CascadeTimeline simulation={selected.simulation} />
                  <ScenarioComparisonTable incident={selected} />

                  <div className="grid lg:grid-cols-2 gap-4">
                    <LangfuseScoresPanel scores={selected.langfuse_scores ?? selected.auto_scores} />
                    <ChangeLog entries={selected.change_log} />
                  </div>

                  {selected.prompt_version && (
                    <p className="text-[9px] font-mono text-violet-400/80 text-center">
                      Langfuse prompt: {selected.prompt_version}
                    </p>
                  )}
                </motion.div>
              ) : (
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-16 text-center">
                  <motion.p
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-zinc-600 font-mono text-sm"
                  >
                    Select topics and click Generate & run agents — or pick from the incident queue
                  </motion.p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
          </>
        )}
      </div>

      <DatasetIncidentModal
        open={datasetModalOpen}
        onClose={() => setDatasetModalOpen(false)}
        incidents={publicIncidents}
        running={running || replaying}
        onRun={(id) => {
          setSelectedPublicId(id);
          void handlePublicReplay(id);
        }}
      />
    </main>
  );
}
