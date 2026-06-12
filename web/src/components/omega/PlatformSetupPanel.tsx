"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getHealth, type HealthStatus } from "@/lib/omega-api";
import {
  BACKEND_ENV_SETUP,
  SPONSOR_INTEGRATIONS,
} from "@/lib/sponsor-integrations";

function copyText(text: string) {
  void navigator.clipboard.writeText(text);
}

export function PlatformSetupPanel() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sponsors = health?.sponsors ?? {};

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
        <p className="text-sm text-zinc-300 leading-relaxed">
          Paste keys into <code className="text-cyan-400 text-xs">omega/backend/.env</code>, set{" "}
          <code className="text-cyan-400 text-xs">OMEGA_DEMO_MODE=false</code>, restart the backend, then
          refresh. Status comes from <code className="text-zinc-500 text-xs">GET /health</code>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh status
          </button>
          <button
            type="button"
            onClick={() => copyText("cp backend/.env.example backend/.env")}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy setup command
          </button>
        </div>
        {health && (
          <p className="text-[10px] font-mono text-zinc-500 mt-3">
            demo_mode={String(health.demo_mode)} · llm={String(health.llm)} ({health.llm_provider}) · storage=
            {health.storage_backend}
          </p>
        )}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Platform status</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {SPONSOR_INTEGRATIONS.map((integration) => {
            const live = integration.healthKey ? sponsors[integration.healthKey] : undefined;
            const isLive = live === true;
            return (
              <div
                key={integration.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-black/30 px-3 py-2"
              >
                <span className="text-xs font-medium text-zinc-200">{integration.name}</span>
                {isLive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Live
                  </span>
                ) : integration.alwaysIntegrated && integration.envSetup?.length === 0 ? (
                  <span className="text-[10px] text-cyan-400/80">Wired</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                    <Circle className="w-3 h-3" />
                    Needs keys
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
          backend/.env — copy from .env.example
        </p>
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="sticky top-0 bg-zinc-900 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-normal">Variable</th>
                  <th className="px-3 py-2 font-normal hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {BACKEND_ENV_SETUP.map((row) => (
                  <tr key={row.var} className="border-t border-zinc-800/80 hover:bg-zinc-900/50">
                    <td className="px-3 py-2 text-cyan-400/90">
                      {row.var}
                      {row.required && <span className="text-amber-500/80 ml-1">*</span>}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 hidden sm:table-cell">{row.hint ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-xs">
        {[
          { label: "Langfuse keys", url: "https://cloud.langfuse.com" },
          { label: "Senso API", url: "https://senso.ai" },
          { label: "Composio", url: "https://composio.dev" },
          { label: "Pioneer", url: "https://pioneer.ai" },
          { label: "Airbyte Agent Engine", url: "https://airbyte.com" },
          { label: "Gemini API", url: "https://aistudio.google.com/apikey" },
        ].map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-cyan-400 border border-zinc-800 rounded-lg px-3 py-2"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            {link.label}
          </a>
        ))}
      </div>

      <motion.pre
        className="rounded-xl border border-zinc-800 bg-black/60 p-4 text-[10px] text-zinc-500 font-mono overflow-x-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {`cd omega/backend
cp .env.example .env
# edit .env — paste your keys
OMEGA_DEMO_MODE=false python run.py`}
      </motion.pre>
    </div>
  );
}
