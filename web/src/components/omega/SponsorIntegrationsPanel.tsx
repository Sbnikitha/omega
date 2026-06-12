"use client";

import { CheckCircle2, Code2, MinusCircle, PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getHealth } from "@/lib/omega-api";
import type { SponsorIntegration } from "@/lib/sponsor-integrations";

type HealthSponsors = Record<string, boolean>;

function StatusBadge({
  integration,
  live,
}: {
  integration: SponsorIntegration;
  live: boolean | undefined;
}) {
  if (live) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Live
      </span>
    );
  }
  if (integration.envSetup?.length) {
    return (
      <span className="text-[10px] font-medium uppercase tracking-wide text-amber-400/90 border border-amber-500/30 bg-amber-500/5 px-2 py-0.5 rounded-full">
        Needs keys
      </span>
    );
  }
  if (integration.alwaysIntegrated) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-cyan-400/90 border border-cyan-500/25 bg-cyan-500/5 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        Wired
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded-full">
      Not configured
    </span>
  );
}

function EnvSetupBlock({ integration }: { integration: SponsorIntegration }) {
  if (!integration.envSetup?.length && !integration.setupNote) return null;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-5">
      <p className="text-[10px] uppercase tracking-widest text-amber-400/90 mb-2">
        Turn on — add to omega/backend/.env
      </p>
      {integration.setupNote && (
        <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{integration.setupNote}</p>
      )}
      {integration.envSetup && integration.envSetup.length > 0 && (
        <ul className="space-y-1.5">
          {integration.envSetup.map((row) => (
            <li key={row.var} className="flex flex-wrap items-baseline gap-x-2 text-[11px] font-mono">
              <span className="text-cyan-400/90">
                {row.var}
                {row.required && <span className="text-amber-500"> *</span>}
              </span>
              {row.hint && <span className="text-zinc-500 font-sans text-[10px]">{row.hint}</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-zinc-600 mt-3">
        Restart backend after saving · open Guide → Setup tab → Refresh status
      </p>
    </div>
  );
}

export function usePlatformHealth() {
  const [healthSponsors, setHealthSponsors] = useState<HealthSponsors>({});
  const [langfuseLive, setLangfuseLive] = useState(false);
  const [clickhouseLive, setClickhouseLive] = useState(false);

  useEffect(() => {
    getHealth()
      .then((h) => {
        setHealthSponsors(h.sponsors ?? {});
        setLangfuseLive(h.langfuse);
        setClickhouseLive(h.clickhouse);
      })
      .catch(() => {});
  }, []);

  const isLive = (integration: SponsorIntegration): boolean | undefined => {
    if (integration.id === "langfuse") return langfuseLive;
    if (integration.id === "clickhouse") return clickhouseLive;
    if (integration.healthKey && healthSponsors[integration.healthKey] !== undefined) {
      return healthSponsors[integration.healthKey];
    }
    return integration.alwaysIntegrated ? true : undefined;
  };

  return { isLive };
}

export function IntegrationDetailCard({
  integration,
  live,
}: {
  integration: SponsorIntegration;
  live: boolean | undefined;
}) {
  return (
    <article className="rounded-2xl border border-zinc-800/90 bg-zinc-950/80 overflow-hidden">
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${integration.accent}, transparent)` }}
      />
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{integration.category}</p>
            <h3 className="text-xl font-semibold text-zinc-100 mt-1">{integration.name}</h3>
          </div>
          <StatusBadge integration={integration} live={live} />
        </div>

        {!live && <EnvSetupBlock integration={integration} />}

        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Why OMEGA uses it</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{integration.why}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-5">
          <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-4">
            <p className="text-[10px] uppercase tracking-widest text-red-400/80 mb-3 flex items-center gap-1.5">
              <MinusCircle className="w-3.5 h-3.5" />
              Without {integration.name}
            </p>
            <ul className="space-y-2">
              {integration.without.map((item) => (
                <li key={item} className="text-xs text-zinc-400 leading-relaxed flex gap-2">
                  <span className="text-red-500/60 shrink-0">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
            <p className="text-[10px] uppercase tracking-widest text-emerald-400/80 mb-3 flex items-center gap-1.5">
              <PlusCircle className="w-3.5 h-3.5" />
              With {integration.name}
            </p>
            <ul className="space-y-2">
              {integration.with.map((item) => (
                <li key={item} className="text-xs text-zinc-300 leading-relaxed flex gap-2">
                  <span className="text-emerald-500/80 shrink-0">+</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black/30 p-4 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Measurable outcome</p>
          <p className="text-sm text-zinc-200 leading-relaxed">{integration.outcome}</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5" />
            Where it lives in OMEGA
          </p>
          <ul className="space-y-1">
            {integration.inOmega.map((path) => (
              <li key={path} className="text-[11px] font-mono text-zinc-500">
                {path}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
