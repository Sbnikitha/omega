"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Ban,
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  Eye,
  EyeOff,
  GitBranch,
  Layers,
  MessageSquare,
  RefreshCw,
  Shield,
  Sparkles,
  Workflow,
  XCircle,
  Zap,
} from "lucide-react";
import { ClickHouseCompare } from "@/components/omega/ClickHouseCompare";
import { OpenUICompare } from "@/components/omega/OpenUICompare";
import { StackAnalyticsPanel } from "@/components/omega/StackAnalyticsPanel";
import type { Analytics } from "@/lib/omega-api";
import { useEffect, useState } from "react";

const WORKFLOW = [
  { step: "1", label: "Alert", detail: "Metrics + graph", color: "#71717a" },
  { step: "2", label: "Observer", detail: "Classify", color: "#06b6d4" },
  { step: "3", label: "Scientist", detail: "Root cause", color: "#8b5cf6" },
  { step: "4", label: "Simulator", detail: "Digital twin", color: "#f59e0b" },
  { step: "5", label: "Response", detail: "Action plan", color: "#10b981" },
  { step: "6", label: "Human", detail: "Approve", color: "#ec4899" },
  { step: "7", label: "Langfuse", detail: "Learn loop", color: "#a78bfa" },
];

const WITH_LANGFUSE = [
  { icon: Eye, text: "One trace_id spans all 4 agents — full cascade visible" },
  { icon: Sparkles, text: "LLM-as-judge auto-scores every run (quality, realism, safety)" },
  { icon: CheckCircle2, text: "Human approve/reject → Langfuse scores → golden dataset" },
  { icon: RefreshCw, text: "Prompt optimizer pulls worst traces, deploys v+1 zero-downtime" },
  { icon: GitBranch, text: "CI regression gate blocks bad prompts before prod" },
  { icon: MessageSquare, text: "NL queries via MCP: \"show where OMEGA was wrong\"" },
];

const WITHOUT_LANGFUSE = [
  { icon: EyeOff, text: "Black-box LLM chain — no idea which agent failed" },
  { icon: Ban, text: "No quality scores — ship bad RCA to the bridge" },
  { icon: XCircle, text: "Rejections vanish — system never learns from mistakes" },
  { icon: AlertTriangle, text: "Prompts hardcoded in repo — redeploy to fix wording" },
  { icon: Ban, text: "Manual spot-checks — regressions slip into demos" },
  { icon: AlertTriangle, text: "Same failure modes repeat — approval stuck ~61%" },
];

const AGENTS = [
  {
    id: "observer",
    name: "Observer",
    icon: Activity,
    hex: "#06b6d4",
    role: "Ingest & classify",
    workflow: "Normalizes alerts into structured events with severity + dependency topology.",
    bestFor: "First 60s on the bridge — one source of truth.",
    langfuse: "span:observe · prompt:observer-classify",
  },
  {
    id: "scientist",
    name: "Scientist",
    icon: Cpu,
    hex: "#8b5cf6",
    role: "Root cause",
    workflow: "RCA + confidence + blast radius reasoning chain.",
    bestFor: "Replace 1–3h of manual log diving.",
    langfuse: "span:root_cause_analysis · score:root_cause_quality",
  },
  {
    id: "simulator",
    name: "Simulator",
    icon: Shield,
    hex: "#f59e0b",
    role: "Digital twin",
    workflow: "3+ scenarios, 7-step twin, risk-ranked before prod touch.",
    bestFor: "SEV1 where wrong fix > waiting.",
    langfuse: "span:scenario_simulation · score:scenario_realism",
  },
  {
    id: "response",
    name: "Response",
    icon: Zap,
    hex: "#10b981",
    role: "Action plan",
    workflow: "Concrete remediation + human-approval flags.",
    bestFor: "IC approves in one click, not from scratch.",
    langfuse: "span:action_planning · score:action_safety",
  },
];

const TOOLS = [
  { name: "Langfuse", badge: "Core", icon: Sparkles, hex: "#a78bfa" },
  { name: "LangGraph", badge: "Orchestration", icon: Workflow, hex: "#06b6d4" },
  { name: "Gemini Flash", badge: "LLM", icon: Bot, hex: "#8b5cf6" },
  { name: "FastAPI", badge: "API", icon: Layers, hex: "#10b981" },
  { name: "Next.js", badge: "UI", icon: Database, hex: "#ec4899" },
  { name: "GitHub CI", badge: "Regression", icon: GitBranch, hex: "#f59e0b" },
];

function FloatingOrbs() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl pointer-events-none"
          style={{
            width: 120 + i * 40,
            height: 120 + i * 40,
            background: i % 2 === 0 ? "rgba(6,182,212,0.15)" : "rgba(139,92,246,0.12)",
            left: `${10 + i * 15}%`,
            top: `${5 + (i % 3) * 25}%`,
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -25, 15, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ repeat: Infinity, duration: 8 + i * 2, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

function LangfuseCompare() {
  const [withLf, setWithLf] = useState(true);
  const items = withLf ? WITH_LANGFUSE : WITHOUT_LANGFUSE;

  return (
    <section className="relative rounded-2xl border border-zinc-800/80 bg-zinc-950/70 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12),transparent_60%)]" />
      <FloatingOrbs />

      <div className="relative p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <motion.p
              className="text-[10px] uppercase tracking-[0.35em] text-cyan-500/80"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              The whole point of the hackathon
            </motion.p>
            <h2 className="text-2xl font-black tracking-tight mt-1">
              <span className={withLf ? "text-violet-400" : "text-red-400"}>
                {withLf ? "WITH Langfuse" : "WITHOUT Langfuse"}
              </span>
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setWithLf((v) => !v)}
            className="relative flex rounded-xl border border-zinc-700 p-1 bg-black/50"
          >
            <motion.div
              className="absolute top-1 bottom-1 rounded-lg"
              layout
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{
                width: "calc(50% - 4px)",
                left: withLf ? 4 : "calc(50%)",
                background: withLf
                  ? "linear-gradient(90deg, rgba(139,92,246,0.4), rgba(6,182,212,0.4))"
                  : "linear-gradient(90deg, rgba(239,68,68,0.4), rgba(249,115,22,0.3))",
                boxShadow: withLf ? "0 0 20px rgba(139,92,246,0.5)" : "0 0 20px rgba(239,68,68,0.4)",
              }}
            />
            <span className={`relative z-10 px-4 py-2 text-xs font-bold uppercase tracking-widest ${withLf ? "text-violet-200" : "text-zinc-500"}`}>
              ON
            </span>
            <span className={`relative z-10 px-4 py-2 text-xs font-bold uppercase tracking-widest ${!withLf ? "text-red-300" : "text-zinc-500"}`}>
              OFF
            </span>
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <motion.div
            className="rounded-xl border p-4"
            animate={{
              borderColor: withLf ? "rgba(139,92,246,0.5)" : "rgba(39,39,42,0.8)",
              boxShadow: withLf ? "0 0 40px rgba(139,92,246,0.2)" : "none",
            }}
          >
            <p className="text-[9px] uppercase tracking-widest text-violet-400 mb-2">Approval rate</p>
            <motion.p
              key={withLf ? "on" : "off"}
              className="text-4xl font-black font-mono"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, color: withLf ? "#a78bfa" : "#ef4444" }}
            >
              {withLf ? "89%" : "61%"}
            </motion.p>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">
              {withLf ? "after prompt optimizer + golden CI" : "stuck — no feedback loop"}
            </p>
          </motion.div>
          <motion.div
            className="rounded-xl border p-4"
            animate={{
              borderColor: withLf ? "rgba(6,182,212,0.5)" : "rgba(39,39,42,0.8)",
            }}
          >
            <p className="text-[9px] uppercase tracking-widest text-cyan-400 mb-2">Debug time / incident</p>
            <motion.p
              key={withLf ? "fast" : "slow"}
              className="text-4xl font-black font-mono"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, color: withLf ? "#22d3ee" : "#f97316" }}
            >
              {withLf ? "~4 min" : "~45 min"}
            </motion.p>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">
              {withLf ? "trace shows exact failing span" : "grep logs across 4 agents"}
            </p>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.ul
            key={withLf ? "with" : "without"}
            className="space-y-2"
            initial={{ opacity: 0, x: withLf ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: withLf ? 20 : -20 }}
            transition={{ duration: 0.25 }}
          >
            {items.map((item, i) => (
              <motion.li
                key={item.text}
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                  withLf ? "border-violet-500/20 bg-violet-500/5" : "border-red-500/20 bg-red-500/5"
                }`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <item.icon className={`w-4 h-4 shrink-0 mt-0.5 ${withLf ? "text-violet-400" : "text-red-400"}`} />
                <span className="text-sm text-zinc-300">{item.text}</span>
              </motion.li>
            ))}
          </motion.ul>
        </AnimatePresence>

        {/* Animated trace viz */}
        <div className="mt-6 rounded-xl border border-zinc-800 bg-black/60 p-4 font-mono text-[10px] overflow-hidden relative">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          />
          <p className="text-zinc-600 mb-2">trace:omega-incident-{withLf ? "a3f9…" : "????"}</p>
          {withLf ? (
            <div className="space-y-1">
              {["observe", "root_cause_analysis", "scenario_simulation", "action_planning"].map((span, i) => (
                <motion.div
                  key={span}
                  className="flex items-center gap-2 text-cyan-400/90"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15, repeat: Infinity, repeatDelay: 4 }}
                >
                  <span className="text-emerald-500">├─</span>
                  <span>{span}</span>
                  <span className="text-violet-400 ml-auto">score:0.{85 + i}</span>
                </motion.div>
              ))}
              <motion.p
                className="text-pink-400 pt-1"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                └─ human_approval: 1.0 → golden_dataset.append()
              </motion.p>
            </div>
          ) : (
            <motion.div
              className="text-red-400/80 space-y-1"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <p>??? llm_call_1 ???</p>
              <p>??? llm_call_2 ???</p>
              <p>??? llm_call_3 ???</p>
              <p className="text-zinc-600">// no span ids · no scores · no dataset</p>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

function AnimatedWorkflow() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % WORKFLOW.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative rounded-2xl border border-cyan-500/20 bg-zinc-950/60 p-6 overflow-hidden">
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500"
        animate={{ scaleX: [0, 1, 1, 0], originX: 0 }}
        transition={{ repeat: Infinity, duration: WORKFLOW.length * 2.2, ease: "linear" }}
      />
      <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-500/70 mb-4">Live workflow pulse</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {WORKFLOW.map((w, i) => {
          const isActive = i === active;
          const isDone = i < active;
          return (
            <motion.div
              key={w.step}
              className="relative rounded-xl border px-3 py-2 min-w-[88px] text-center"
              animate={{
                borderColor: isActive ? w.color : isDone ? `${w.color}66` : "#27272a",
                boxShadow: isActive ? `0 0 28px ${w.color}55` : "0 0 0 transparent",
                scale: isActive ? 1.08 : 1,
              }}
              transition={{ duration: 0.35 }}
              style={{ background: isActive ? `${w.color}15` : "rgba(9,9,11,0.5)" }}
            >
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-xl border-2"
                  style={{ borderColor: w.color }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
              <p className="text-[9px] text-zinc-600">0{w.step}</p>
              <p className="text-xs font-bold text-zinc-200">{w.label}</p>
              <p className="text-[8px] text-zinc-500">{w.detail}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export function GuideTab({
  analytics,
  clickhouseConnected,
}: {
  analytics: Analytics | null;
  clickhouseConnected?: boolean;
}) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  return (
    <div className="relative space-y-6 max-w-6xl">
      <FloatingOrbs />

      {/* Hero */}
      <motion.section
        className="relative rounded-2xl border border-violet-500/30 bg-zinc-950/80 p-8 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-violet-500/20 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ repeat: Infinity, duration: 5 }}
        />
        <motion.h1
          className="text-3xl md:text-4xl font-black tracking-tight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          OMEGA <span className="text-cyan-400">×</span>{" "}
          <motion.span
            className="text-violet-400"
            animate={{ textShadow: ["0 0 20px rgba(139,92,246,0)", "0 0 30px rgba(139,92,246,0.8)", "0 0 20px rgba(139,92,246,0)"] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            Langfuse
          </motion.span>
        </motion.h1>
        <motion.p
          className="text-zinc-400 mt-3 max-w-2xl leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Four agents. One trace. Human in the loop.{" "}
          <span className="text-zinc-200">Without Langfuse it&apos;s a chatbot.</span> With Langfuse it&apos;s a system that
          gets better every incident.
        </motion.p>
      </motion.section>

      <LangfuseCompare />

      <ClickHouseCompare
        queryMs={analytics?.storage?.query_ms?.clickhouse}
        jsonMs={analytics?.storage?.query_ms?.json_file}
        connected={clickhouseConnected ?? analytics?.stack?.clickhouse_connected}
        total={analytics?.total}
      />

      <OpenUICompare embedded />

      <StackAnalyticsPanel analytics={analytics} />

      <AnimatedWorkflow />

      {/* Agents grid */}
      <section>
        <motion.p
          className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Agent swarm — hover to glow
        </motion.p>
        <div className="grid sm:grid-cols-2 gap-4">
          {AGENTS.map((a, i) => (
            <motion.article
              key={a.id}
              className="relative rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 overflow-hidden cursor-default"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              onHoverStart={() => setHoveredAgent(a.id)}
              onHoverEnd={() => setHoveredAgent(null)}
              animate={{
                borderColor: hoveredAgent === a.id ? `${a.hex}88` : "#27272a",
                boxShadow: hoveredAgent === a.id ? `0 0 40px ${a.hex}33` : "0 0 0 transparent",
              }}
            >
              <motion.div
                className="absolute inset-0 opacity-0"
                animate={{ opacity: hoveredAgent === a.id ? 0.15 : 0 }}
                style={{ background: `radial-gradient(circle at top left, ${a.hex}, transparent 70%)` }}
              />
              <div className="relative flex items-center gap-3 mb-3">
                <motion.div
                  animate={hoveredAgent === a.id ? { rotate: [0, -8, 8, 0] } : {}}
                  transition={{ repeat: hoveredAgent === a.id ? Infinity : 0, duration: 0.5 }}
                >
                  <a.icon className="w-6 h-6" style={{ color: a.hex }} />
                </motion.div>
                <div>
                  <h3 className="font-black text-zinc-100 uppercase tracking-wider text-sm">{a.name}</h3>
                  <p className="text-[10px] text-zinc-500">{a.role}</p>
                </div>
              </div>
              <p className="relative text-sm text-zinc-400">{a.workflow}</p>
              <p className="relative text-xs text-zinc-500 mt-2">
                <span className="text-zinc-600">Best: </span>
                {a.bestFor}
              </p>
              <motion.p
                className="relative text-[10px] font-mono mt-3"
                style={{ color: a.hex }}
                animate={{ opacity: hoveredAgent === a.id ? [0.6, 1, 0.6] : 0.7 }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {a.langfuse}
              </motion.p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Tools orbit */}
      <section className="relative rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6 overflow-hidden">
        <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-500/70 mb-5">Why this stack</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TOOLS.map((t, i) => (
            <motion.div
              key={t.name}
              className="rounded-xl border border-zinc-800 bg-black/40 p-4 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{
                scale: 1.05,
                borderColor: t.hex,
                boxShadow: `0 0 25px ${t.hex}40`,
              }}
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2 + i * 0.3, ease: "easeInOut" }}
              >
                <t.icon className="w-8 h-8 mx-auto mb-2" style={{ color: t.hex }} />
              </motion.div>
              <p className="text-sm font-bold text-zinc-200">{t.name}</p>
              <p className="text-[9px] uppercase tracking-widest text-zinc-600 mt-1">{t.badge}</p>
            </motion.div>
          ))}
        </div>
        <motion.p
          className="text-center text-xs text-violet-400/80 font-mono mt-6"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          Langfuse sits at the center — everything else feeds the loop
        </motion.p>
      </section>

      {/* Demo script */}
      <motion.section
        className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/10 via-violet-500/5 to-cyan-500/10 p-6"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-pink-400">3-min judge script</h3>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {[
            "Incidents → real GitHub outage + $ savings",
            "Analyze in OMEGA → RCA compare",
            "Guide → Langfuse / ClickHouse / OpenUI toggles",
            "Stack table → per-incident tool usage",
            "Copilot → live generative UI chat",
            "Ops → approve → optimizer → 89%",
          ].map((step, i) => (
            <motion.div
              key={step}
              className="flex gap-3 items-center rounded-lg border border-zinc-800/80 bg-black/30 px-3 py-2"
              initial={{ x: -20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <span className="text-cyan-500 font-mono font-bold">{i + 1}</span>
              <span className="text-sm text-zinc-300">{step}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
