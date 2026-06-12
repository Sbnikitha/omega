"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type LogLine = {
  id: string;
  ts: string;
  agent: string;
  level: "INFO" | "WARN" | "DEBUG" | "TRACE" | "LANGFUSE" | "LLM" | "SYS";
  msg: string;
};

const LEVEL_COLORS: Record<LogLine["level"], string> = {
  INFO: "text-cyan-400",
  WARN: "text-amber-400",
  DEBUG: "text-zinc-500",
  TRACE: "text-violet-400",
  LANGFUSE: "text-emerald-400",
  LLM: "text-pink-400",
  SYS: "text-zinc-400",
};

export function AgentTerminal({
  lines,
  title = "omega-agent-bus :: live trace stream",
  maxHeight = "320px",
}: {
  lines: LogLine[];
  title?: string;
  maxHeight?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-[#020806] overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.08)]">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-emerald-500/15 bg-[#03100c]/80">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 animate-pulse" />
        <span className="ml-2 font-mono text-[10px] text-emerald-500/70 tracking-wider">{title}</span>
        <span className="ml-auto font-mono text-[9px] text-emerald-600 animate-pulse">● REC</span>
      </div>
      <div
        className="p-3 font-mono text-[11px] leading-relaxed overflow-y-auto custom-scrollbar relative"
        style={{ maxHeight }}
      >
        <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(16,185,129,0.02)_2px,rgba(16,185,129,0.02)_4px)]" />
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className="flex gap-2 py-0.5 hover:bg-emerald-500/5"
            >
              <span className="text-zinc-600 shrink-0">{line.ts}</span>
              <span className={`shrink-0 w-16 ${LEVEL_COLORS[line.level]}`}>[{line.level}]</span>
              <span className="text-violet-400/80 shrink-0 w-20">{line.agent}</span>
              <span className="text-zinc-300 break-all">{line.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
        <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1 align-middle" />
      </div>
    </div>
  );
}
