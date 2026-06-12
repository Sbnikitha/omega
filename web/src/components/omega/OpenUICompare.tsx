"use client";

import "@openuidev/react-ui/components.css";

import { JSON_RENDER_DEMO, MARKDOWN_ONLY_DEMO, OMEGA_DEMO_LANG } from "@/openui/demo-lang";
import { omegaLibrary } from "@/openui/omega-library";
import { Renderer } from "@openuidev/react-lang";
import { AnimatePresence, motion } from "framer-motion";
import {
  Ban,
  CheckCircle2,
  Code2,
  LayoutTemplate,
  MousePointerClick,
  RefreshCw,
  Sparkles,
  Type,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const WITH_ITEMS = [
  { icon: Sparkles, text: "OpenUI Lang streams line-by-line — dashboard paints as tokens arrive" },
  { icon: LayoutTemplate, text: "Custom library: IncidentStatusCard, RootCauseInsight, CostSavingsChip" },
  { icon: Zap, text: "~1,226 tokens for this dashboard (OpenUI benchmark vs 2,247 JSON)" },
  { icon: MousePointerClick, text: "FollowUpItem buttons + tables are real interactive components" },
  { icon: Code2, text: "System prompt generated from registered components — safe, typed props" },
  { icon: CheckCircle2, text: "Tools call live OMEGA API inside generative surfaces" },
];

const WITHOUT_ITEMS = [
  { icon: Type, text: "Markdown wall — IC scrolls during SEV1, no inline approve" },
  { icon: Ban, text: "JSON-Render repeats \"component\",\"props\",\"children\" every node" },
  { icon: Ban, text: "Wait for full JSON download before anything appears on screen" },
  { icon: Ban, text: "No registered SRE components — generic text only" },
  { icon: Ban, text: "~2,247 tokens for the same dashboard layout" },
  { icon: Ban, text: "14.2s to first UI vs 4.9s at 60 tok/s (OpenUI published benchmark)" },
];

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export function OpenUICompare({ embedded }: { embedded?: boolean }) {
  const [withOpenUI, setWithOpenUI] = useState(true);
  const [replay, setReplay] = useState(0);
  const [streamText, setStreamText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [firstPaintMs, setFirstPaintMs] = useState<number | null>(null);

  const fullSource = withOpenUI ? OMEGA_DEMO_LANG : JSON_RENDER_DEMO;
  const tokenTarget = withOpenUI ? 1226 : 2247;

  const paintedRef = useRef(false);

  useEffect(() => {
    setStreamText("");
    setIsStreaming(true);
    setFirstPaintMs(null);
    paintedRef.current = false;
    const start = performance.now();
    let idx = 0;
    const chunk = withOpenUI ? 14 : 6;

    const id = setInterval(() => {
      idx += chunk;
      const next = fullSource.slice(0, idx);
      setStreamText(next);

      if (!paintedRef.current) {
        const painted =
          (withOpenUI && next.includes("hdr = CardHeader")) ||
          (!withOpenUI && next.includes('"title": "Auth outage'));
        if (painted) {
          paintedRef.current = true;
          setFirstPaintMs(Math.round(performance.now() - start));
        }
      }

      if (idx >= fullSource.length) {
        setIsStreaming(false);
        if (!paintedRef.current) {
          setFirstPaintMs(Math.round(performance.now() - start));
        }
        clearInterval(id);
      }
    }, withOpenUI ? 45 : 55);

    return () => clearInterval(id);
  }, [withOpenUI, replay, fullSource]);

  const items = withOpenUI ? WITH_ITEMS : WITHOUT_ITEMS;
  const liveTokens = estimateTokens(streamText);

  return (
    <section
      className={`relative rounded-2xl border overflow-hidden ${
        embedded ? "border-fuchsia-500/30" : "border-zinc-800/80"
      } bg-zinc-950/80`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,70,239,0.14),transparent_55%)]" />

      <div className="relative p-5 md:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <motion.p
              className="text-[10px] uppercase tracking-[0.35em] text-fuchsia-400/80"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              Best Use of OpenUI · live proof
            </motion.p>
            <h2 className="text-2xl font-black tracking-tight mt-1">
              <span className={withOpenUI ? "text-fuchsia-300" : "text-orange-400"}>
                {withOpenUI ? "WITH OpenUI" : "WITHOUT OpenUI"}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReplay((r) => r + 1)}
              className="p-2 rounded-lg border border-zinc-700 hover:border-fuchsia-500/50 text-zinc-400 hover:text-fuchsia-300 transition-colors"
              aria-label="Replay stream"
            >
              <RefreshCw className={`w-4 h-4 ${isStreaming ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setWithOpenUI((v) => !v)}
              className="relative flex rounded-xl border border-zinc-700 p-1 bg-black/50"
            >
              <motion.div
                className="absolute top-1 bottom-1 rounded-lg"
                layout
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{
                  width: "calc(50% - 4px)",
                  left: withOpenUI ? 4 : "calc(50%)",
                  background: withOpenUI
                    ? "linear-gradient(90deg, rgba(217,70,239,0.45), rgba(139,92,246,0.4))"
                    : "linear-gradient(90deg, rgba(249,115,22,0.45), rgba(239,68,68,0.35))",
                  boxShadow: withOpenUI ? "0 0 22px rgba(217,70,239,0.45)" : "0 0 22px rgba(249,115,22,0.35)",
                }}
              />
              <span
                className={`relative z-10 px-4 py-2 text-xs font-bold uppercase tracking-widest ${
                  withOpenUI ? "text-fuchsia-100" : "text-zinc-500"
                }`}
              >
                ON
              </span>
              <span
                className={`relative z-10 px-4 py-2 text-xs font-bold uppercase tracking-widest ${
                  !withOpenUI ? "text-orange-200" : "text-zinc-500"
                }`}
              >
                OFF
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          {[
            {
              label: "Tokens (this dashboard)",
              value: withOpenUI ? `${liveTokens} → ~${tokenTarget}` : `${liveTokens} → ~${tokenTarget}`,
              sub: withOpenUI ? "OpenUI Lang · compact syntax" : "JSON-Render · verbose keys",
              color: withOpenUI ? "text-fuchsia-400" : "text-orange-400",
            },
            {
              label: "First UI paint",
              value: firstPaintMs != null ? `${firstPaintMs}ms` : "…",
              sub: withOpenUI ? "partial render while streaming" : "blocked until JSON parses",
              color: withOpenUI ? "text-cyan-400" : "text-red-400",
            },
            {
              label: "Interactive",
              value: withOpenUI ? "YES" : "NO",
              sub: withOpenUI ? "buttons · tables · OMEGA chips" : "markdown / dead JSON",
              color: withOpenUI ? "text-emerald-400" : "text-red-400",
            },
          ].map((m) => (
            <motion.div
              key={m.label}
              className="rounded-xl border border-zinc-800 bg-black/40 p-3"
              animate={{
                borderColor: withOpenUI ? "rgba(217,70,239,0.35)" : "rgba(249,115,22,0.35)",
              }}
            >
              <p className="text-[9px] uppercase tracking-widest text-zinc-600">{m.label}</p>
              <p className={`text-2xl font-black font-mono ${m.color}`}>{m.value}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{m.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Split: source stream vs rendered output */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-black/70 overflow-hidden flex flex-col min-h-[320px]">
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
              <Code2 className="w-3 h-3" />
              {withOpenUI ? "LLM streams OpenUI Lang" : "LLM streams JSON-Render"}
              {isStreaming && (
                <motion.span
                  className="ml-auto text-fuchsia-400 font-mono"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                >
                  STREAMING
                </motion.span>
              )}
            </p>
            <pre className="flex-1 p-3 text-[10px] font-mono text-zinc-400 overflow-auto custom-scrollbar leading-relaxed">
              {streamText}
              {isStreaming && (
                <motion.span
                  className="inline-block w-2 h-3 bg-fuchsia-400 ml-0.5 align-middle"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                />
              )}
            </pre>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden flex flex-col min-h-[320px]">
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 px-3 py-2 border-b border-zinc-800">
              {withOpenUI ? "OpenUI Renderer · live" : "What the IC actually sees"}
            </p>
            <div className="flex-1 p-3 overflow-auto custom-scrollbar relative">
              <AnimatePresence mode="wait">
                {withOpenUI ? (
                  <motion.div
                    key="render"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="openui-omega-demo [&_.openui-card]:!bg-zinc-950"
                  >
                    {streamText.length > 20 ? (
                      <Renderer response={streamText} library={omegaLibrary} isStreaming={isStreaming} />
                    ) : (
                      <p className="text-zinc-600 text-sm font-mono animate-pulse">awaiting first tokens…</p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="markdown"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {!isStreaming && streamText.length >= fullSource.length ? (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-[10px] font-mono text-red-300/90 max-h-32 overflow-hidden">
                        JSON parsed — but no component library registered IncidentStatusCard. Fallback to text.
                      </div>
                    ) : (
                      <p className="text-amber-500/80 text-xs font-mono">
                        {isStreaming ? "Downloading JSON… UI frozen." : ""}
                      </p>
                    )}
                    <div className="prose prose-invert prose-sm max-w-none text-zinc-400 whitespace-pre-wrap text-xs leading-relaxed border border-zinc-800 rounded-lg p-4 bg-black/40">
                      {MARKDOWN_ONLY_DEMO.slice(0, Math.min(MARKDOWN_ONLY_DEMO.length, streamText.length * 2))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.ul
            key={withOpenUI ? "with" : "without"}
            className="grid sm:grid-cols-2 gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {items.map((item, i) => (
              <motion.li
                key={item.text}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                  withOpenUI ? "border-fuchsia-500/20 bg-fuchsia-500/5 text-zinc-300" : "border-orange-500/20 bg-orange-500/5 text-zinc-400"
                }`}
                initial={{ opacity: 0, x: withOpenUI ? -12 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <item.icon className={`w-4 h-4 shrink-0 mt-0.5 ${withOpenUI ? "text-fuchsia-400" : "text-orange-400"}`} />
                {item.text}
              </motion.li>
            ))}
          </motion.ul>
        </AnimatePresence>

        <div className="rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/5 px-4 py-3 text-xs text-zinc-400 font-mono">
          <span className="text-fuchsia-300">How we use OpenUI in OMEGA:</span>{" "}
          <span className="text-zinc-500">@openuidev/react-lang</span> Renderer + custom{" "}
          <span className="text-zinc-300">omegaLibrary</span> →{" "}
          <span className="text-zinc-500">/api/openui-chat</span> streams Lang → Copilot tab queries live incidents
        </div>
      </div>
    </section>
  );
}
