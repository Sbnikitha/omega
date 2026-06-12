"use client";

import { motion } from "framer-motion";

const NODES = [
  { id: "frontend", x: 50, y: 12 },
  { id: "api-gateway", x: 50, y: 32 },
  { id: "auth", x: 25, y: 55 },
  { id: "payments", x: 75, y: 55 },
  { id: "database", x: 50, y: 78 },
  { id: "cache", x: 15, y: 78 },
];

const EDGES: [string, string][] = [
  ["frontend", "api-gateway"],
  ["api-gateway", "auth"],
  ["api-gateway", "payments"],
  ["auth", "database"],
  ["auth", "cache"],
  ["payments", "database"],
];

export function DependencyMesh({
  hotNode,
  cascadeNodes = [],
}: {
  hotNode?: string;
  cascadeNodes?: string[];
}) {
  const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]));

  return (
    <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 h-[220px] overflow-hidden">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Service Dependency Mesh</p>
      <svg viewBox="0 0 100 90" className="w-full h-[180px]">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {EDGES.map(([from, to]) => {
          const a = nodeMap[from];
          const b = nodeMap[to];
          const isHot = cascadeNodes.includes(from) && cascadeNodes.includes(to);
          return (
            <g key={`${from}-${to}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#27272a" strokeWidth="0.4" />
              {isHot && (
                <motion.line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#ef4444"
                  strokeWidth="0.6"
                  filter="url(#glow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
              {isHot && (
                <motion.circle
                  r="1.2"
                  fill="#ef4444"
                  animate={{
                    cx: [a.x, b.x],
                    cy: [a.y, b.y],
                  }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                />
              )}
            </g>
          );
        })}

        {NODES.map((node) => {
          const isHot = node.id === hotNode;
          const inCascade = cascadeNodes.includes(node.id);
          return (
            <g key={node.id}>
              {(isHot || inCascade) && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r="6"
                  fill="none"
                  stroke={isHot ? "#ef4444" : "#f59e0b"}
                  strokeWidth="0.3"
                  animate={{ r: [4, 8, 4], opacity: [0.8, 0.2, 0.8] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r="3.5"
                fill={isHot ? "#ef4444" : inCascade ? "#f59e0b" : "#3f3f46"}
                stroke={isHot ? "#fca5a5" : "#52525b"}
                strokeWidth="0.3"
              />
              <text
                x={node.x}
                y={node.y + 8}
                textAnchor="middle"
                fill="#71717a"
                fontSize="3.2"
                fontFamily="monospace"
              >
                {node.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
