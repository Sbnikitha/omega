"use client";

import { motion } from "framer-motion";
import { Activity, Cpu, Shield, Zap, ChevronRight } from "lucide-react";

export type AgentId = "observer" | "scientist" | "simulator" | "response" | "human" | "idle";

const AGENTS = [
  { id: "observer" as const, name: "Observer", icon: Activity, color: "#06b6d4", desc: "Ingest + classify" },
  { id: "scientist" as const, name: "Scientist", icon: Cpu, color: "#8b5cf6", desc: "Root cause LLM" },
  { id: "simulator" as const, name: "Simulator", icon: Shield, color: "#f59e0b", desc: "Digital twin" },
  { id: "response" as const, name: "Response", icon: Zap, color: "#10b981", desc: "Action planner" },
];

function agentState(
  id: AgentId,
  active: AgentId,
  completed: Set<AgentId>
): "idle" | "active" | "done" {
  if (active === id) return "active";
  if (completed.has(id)) return "done";
  return "idle";
}

export function AgentPipeline({
  activeAgent,
  completedAgents,
  spanIds,
  tokens = 0,
  latencyMs = 0,
}: {
  activeAgent: AgentId;
  completedAgents: Set<AgentId>;
  spanIds?: Record<string, string>;
  tokens?: number;
  latencyMs?: number;
}) {
  return (
    <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.06),transparent_70%)]" />

      <div className="relative flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-500/70">Multi-Agent Swarm</p>
          <p className="text-sm font-bold text-zinc-200">LangGraph Orchestration Pipeline</p>
        </div>
        <div className="flex gap-4 font-mono text-[10px]">
          <div className="text-center">
            <p className="text-zinc-600">TOKENS</p>
            <motion.p key={tokens} initial={{ scale: 1.2, color: "#06b6d4" }} animate={{ scale: 1, color: "#e4e4e7" }} className="font-bold">
              {tokens.toLocaleString()}
            </motion.p>
          </div>
          <div className="text-center">
            <p className="text-zinc-600">LATENCY</p>
            <motion.p key={latencyMs} initial={{ scale: 1.2, color: "#8b5cf6" }} animate={{ scale: 1, color: "#e4e4e7" }} className="font-bold">
              {latencyMs}ms
            </motion.p>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-1">
        {AGENTS.map((agent, i) => {
          const state = agentState(agent.id, activeAgent, completedAgents);
          const Icon = agent.icon;
          return (
            <div key={agent.id} className="flex items-center flex-1 min-w-0">
              <motion.div
                className="relative flex-1 rounded-xl border p-4 text-center min-w-0"
                animate={{
                  borderColor: state === "active" ? agent.color : state === "done" ? `${agent.color}66` : "#27272a",
                  boxShadow: state === "active" ? `0 0 30px ${agent.color}40` : "0 0 0px transparent",
                  scale: state === "active" ? 1.03 : 1,
                }}
                transition={{ duration: 0.3 }}
                style={{ background: state === "active" ? `${agent.color}10` : "rgba(9,9,11,0.6)" }}
              >
                {state === "active" && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2"
                    style={{ borderColor: agent.color }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                )}
                <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: state === "idle" ? "#52525b" : agent.color }} />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">{agent.name}</p>
                <p className="text-[9px] text-zinc-600 mt-0.5 truncate">{agent.desc}</p>
                {state === "active" && (
                  <motion.div className="flex justify-center gap-1 mt-2">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="w-1 h-1 rounded-full"
                        style={{ background: agent.color }}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: d * 0.15 }}
                      />
                    ))}
                  </motion.div>
                )}
                {state === "done" && (
                  <p className="text-[8px] font-mono text-emerald-500/70 mt-1 truncate">
                    span:{spanIds?.[agent.id]?.slice(0, 8) || "ok"}
                  </p>
                )}
              </motion.div>
              {i < AGENTS.length - 1 && (
                <div className="relative flex items-center px-1 shrink-0">
                  <motion.div
                    animate={{
                      opacity: completedAgents.has(agent.id) || activeAgent === AGENTS[i + 1]?.id ? 1 : 0.2,
                    }}
                  >
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </motion.div>
                  {(completedAgents.has(agent.id) || activeAgent === AGENTS[i + 1]?.id) && (
                    <motion.div
                      className="absolute left-0 w-full h-0.5 bg-gradient-to-r from-cyan-500 to-violet-500"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      style={{ originX: 0 }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Data packet animation along pipeline */}
      {activeAgent !== "idle" && activeAgent !== "human" && (
        <motion.div
          className="absolute bottom-2 left-6 right-6 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        />
      )}
    </div>
  );
}
