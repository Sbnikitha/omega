"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  ARCHITECTURE_FLOW,
  AGENT_NODES,
  sponsorById,
  type ArchitectureNode,
} from "@/lib/architecture-flow";
import { SPONSOR_INTEGRATIONS } from "@/lib/sponsor-integrations";

function SponsorPill({
  sponsorId,
  active,
  compact,
}: {
  sponsorId: string;
  active: boolean;
  compact?: boolean;
}) {
  const s = sponsorById(sponsorId);
  if (!s) return null;
  return (
    <motion.span
      layout
      animate={{
        scale: active ? 1.05 : 1,
        opacity: active ? 1 : 0.55,
        boxShadow: active ? `0 0 12px ${s.accent}66` : "0 0 0 transparent",
      }}
      className={`inline-flex items-center rounded-full border font-medium ${
        compact ? "text-[8px] px-1.5 py-0.5" : "text-[9px] px-2 py-0.5"
      }`}
      style={{
        borderColor: active ? s.accent : `${s.accent}44`,
        color: active ? s.accent : "#a1a1aa",
        backgroundColor: active ? `${s.accent}18` : "transparent",
      }}
    >
      {s.name}
    </motion.span>
  );
}

function FlowArrow({ active, vertical }: { active: boolean; vertical?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center shrink-0 ${
        vertical ? "h-8 w-full" : "w-8 md:w-12 h-full min-h-[3rem]"
      }`}
    >
      <svg
        viewBox="0 0 48 24"
        className={`${vertical ? "rotate-90 w-6 h-8" : "w-full h-6 max-w-[48px]"}`}
        aria-hidden
      >
        <motion.path
          d="M2 12 H38 M32 6 L38 12 L32 18"
          fill="none"
          stroke={active ? "#22d3ee" : "#3f3f46"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{
            strokeDashoffset: active ? 0 : 20,
            opacity: active ? 1 : 0.35,
          }}
          transition={{ duration: 0.4 }}
          style={{ strokeDasharray: 40 }}
        />
        {active && (
          <motion.circle
            r="3"
            fill="#22d3ee"
            animate={{ cx: [4, 38], cy: 12 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
        )}
      </svg>
    </div>
  );
}

function FlowNodeCard({
  node,
  active,
  index,
}: {
  node: ArchitectureNode;
  active: boolean;
  index: number;
}) {
  return (
    <motion.div
      layout
      className="relative flex flex-col min-w-[120px] max-w-[160px]"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
    >
      <motion.div
        className={`relative rounded-xl border px-3 py-3 bg-zinc-950/90 backdrop-blur-sm ${
          node.agent ? "min-h-[100px]" : "min-h-[80px]"
        }`}
        animate={{
          borderColor: active ? node.color : "rgba(39,39,42,0.9)",
          boxShadow: active ? `0 0 32px ${node.color}44, inset 0 0 20px ${node.color}11` : "0 0 0 transparent",
          scale: active ? 1.04 : 1,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        {active && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ background: `radial-gradient(circle at 50% 0%, ${node.color}22, transparent 70%)` }}
            layoutId="node-glow"
          />
        )}
        {node.agent && (
          <span
            className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-black border font-mono"
            style={{ borderColor: `${node.color}66`, color: node.color }}
          >
            LangGraph
          </span>
        )}
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">{node.kind}</p>
        <p className="text-sm font-bold text-zinc-100 mt-0.5 leading-tight">{node.title}</p>
        <p className="text-[10px] text-zinc-500 mt-1 leading-snug">{node.subtitle}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {node.sponsors.map((sid) => (
            <SponsorPill key={sid} sponsorId={sid} active={active} compact />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function LangfuseRail({ activeStep }: { activeStep: number }) {
  const agentStart = ARCHITECTURE_FLOW.findIndex((n) => n.id === "observer");
  const agentEnd = ARCHITECTURE_FLOW.findIndex((n) => n.id === "response");
  const onAgentPath = activeStep >= agentStart && activeStep <= agentEnd;

  return (
    <div className="hidden lg:flex flex-col items-center justify-center w-14 shrink-0 mr-2">
      <motion.div
        className="relative w-2 rounded-full flex-1 min-h-[200px] bg-zinc-900 border border-violet-500/20 overflow-hidden"
        animate={{ borderColor: onAgentPath ? "rgba(167,139,250,0.6)" : "rgba(39,39,42,0.8)" }}
      >
        <motion.div
          className="absolute inset-x-0 top-0 w-full bg-gradient-to-b from-violet-500 via-violet-400 to-cyan-400"
          animate={{
            height: onAgentPath ? "100%" : "30%",
            opacity: onAgentPath ? [0.6, 1, 0.6] : 0.3,
          }}
          transition={{ repeat: onAgentPath ? Infinity : 0, duration: 2 }}
        />
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-violet-400 shadow-[0_0_12px_#a78bfa]"
          animate={{ top: onAgentPath ? ["0%", "90%", "0%"] : "15%" }}
          transition={{ repeat: Infinity, duration: onAgentPath ? 3 : 0, ease: "easeInOut" }}
        />
      </motion.div>
      <p className="text-[8px] uppercase tracking-widest text-violet-400/80 mt-2 text-center leading-tight">
        Langfuse
        <br />
        trace_id
      </p>
    </div>
  );
}

export function AgenticArchitectureFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActiveStep((s) => (s + 1) % ARCHITECTURE_FLOW.length);
    }, 2200);
    return () => clearInterval(id);
  }, [paused]);

  const activeNode = ARCHITECTURE_FLOW[activeStep];
  const activeSponsorSet = useMemo(() => new Set(activeNode.sponsors), [activeNode]);

  const ingress = ARCHITECTURE_FLOW.filter((n) => n.kind === "ingress" || n.kind === "control");
  const tail = ARCHITECTURE_FLOW.filter(
    (n) => n.kind === "human" || n.kind === "publish" || n.kind === "store" || n.kind === "ui" || n.kind === "deploy"
  );

  const stepIndex = (id: string) => ARCHITECTURE_FLOW.findIndex((n) => n.id === id);

  return (
    <motion.section
      className="relative rounded-2xl border border-zinc-800 bg-[#030305] overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.04)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5 pointer-events-none"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 6 }}
      />

      <div className="relative p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-500/80 mb-2">
              Agentic architecture
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold text-zinc-100 tracking-tight">
              End-to-end flow · stack in context
            </h2>
            <p className="text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
              LangGraph multi-agent swarm at the core. Each platform attaches to a specific stage —
              observability, open-web ingest, inference, storage, UI, publish, and deploy.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black/40 px-4 py-3 min-w-[200px]">
            <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">Live tour</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeNode.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <p className="text-sm font-semibold" style={{ color: activeNode.color }}>
                  {activeNode.title}
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{activeNode.subtitle}</p>
              </motion.div>
            </AnimatePresence>
            <div className="flex gap-1 mt-3">
              {ARCHITECTURE_FLOW.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Step ${i + 1}`}
                  onClick={() => setActiveStep(i)}
                  className="h-1 flex-1 rounded-full overflow-hidden bg-zinc-800"
                >
                  <motion.div
                    className="h-full bg-cyan-500"
                    animate={{ width: i === activeStep ? "100%" : i < activeStep ? "100%" : "0%" }}
                    transition={{ duration: i === activeStep && !paused ? 2.2 : 0.2 }}
                    style={{ opacity: i === activeStep ? 1 : 0.35 }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Phase 1 — Ingress */}
        <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 mb-3">① Ingest &amp; dispatch</p>
        <div className="flex flex-wrap items-center justify-center gap-1 md:gap-0 mb-8 overflow-x-auto pb-2">
          {ingress.map((node, i) => {
            const idx = stepIndex(node.id);
            return (
              <div key={node.id} className="flex items-center">
                <FlowNodeCard node={node} active={activeStep === idx} index={i} />
                {i < ingress.length - 1 && <FlowArrow active={activeStep >= idx} />}
              </div>
            );
          })}
        </div>

        {/* Phase 2 — Agent swarm + Langfuse rail */}
        <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 mb-3">
          ② LangGraph agent swarm <span className="text-violet-400/80">(Langfuse traced)</span>
        </p>
        <div className="flex items-stretch justify-center mb-8 overflow-x-auto pb-2">
          <LangfuseRail activeStep={activeStep} />
          <div className="flex items-center gap-1 md:gap-0">
            {AGENT_NODES.map((node, i) => {
              const idx = stepIndex(node.id);
              return (
                <div key={node.id} className="flex items-center">
                  <FlowNodeCard node={node} active={activeStep === idx} index={i} />
                  {i < AGENT_NODES.length - 1 && (
                    <FlowArrow active={activeStep >= idx && activeStep > idx - 1} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase 3 — Close loop */}
        <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 mb-3">
          ③ Human gate · publish · store · UI · deploy
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1 md:gap-0 mb-8 overflow-x-auto pb-2">
          {tail.map((node, i) => {
            const idx = stepIndex(node.id);
            return (
              <div key={node.id} className="flex items-center">
                <FlowNodeCard node={node} active={activeStep === idx} index={i} />
                {i < tail.length - 1 && <FlowArrow active={activeStep >= idx} />}
              </div>
            );
          })}
        </div>

        {/* Platform legend — highlight active step's integrations */}
        <div className="rounded-xl border border-zinc-800/80 bg-black/30 p-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
            Platform map — click a step above or watch the tour
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {SPONSOR_INTEGRATIONS.map((s) => {
              const usedIn = ARCHITECTURE_FLOW.filter((n) => n.sponsors.includes(s.id)).map((n) => n.title);
              const lit = activeSponsorSet.has(s.id);
              return (
                <motion.div
                  key={s.id}
                  className="rounded-lg border px-2.5 py-2"
                  animate={{
                    borderColor: lit ? s.accent : "rgba(39,39,42,0.8)",
                    backgroundColor: lit ? `${s.accent}12` : "transparent",
                  }}
                >
                  <p className="text-[10px] font-semibold truncate" style={{ color: lit ? s.accent : "#e4e4e7" }}>
                    {s.name}
                  </p>
                  <p className="text-[8px] text-zinc-600 mt-1 leading-snug line-clamp-2">
                    {usedIn.slice(0, 3).join(" · ")}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Architecture summary strip */}
        <motion.div
          className="mt-4 flex flex-wrap gap-2 justify-center text-[10px] font-mono text-zinc-500"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 4 }}
        >
          <span>Open Web → x402 → Guild →</span>
          <span className="text-violet-400">[Observer → Scientist → Simulator → Response]</span>
          <span>→ Human → Senso → CH → OpenUI → Render/TFY</span>
        </motion.div>
      </div>
    </motion.section>
  );
}
