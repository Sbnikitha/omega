"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ClickHouseCompare } from "@/components/omega/ClickHouseCompare";
import { OpenUICompare } from "@/components/omega/OpenUICompare";
import { PlatformSetupPanel } from "@/components/omega/PlatformSetupPanel";
import {
  IntegrationDetailCard,
  usePlatformHealth,
} from "@/components/omega/SponsorIntegrationsPanel";
import { StackAnalyticsPanel } from "@/components/omega/StackAnalyticsPanel";
import type { Analytics } from "@/lib/omega-api";
import { SPONSOR_INTEGRATIONS } from "@/lib/sponsor-integrations";

const EXTRA_TABS = [
  { id: "setup", label: "Setup" },
  { id: "agents", label: "Agents" },
  { id: "open-web", label: "Open web" },
  { id: "metrics", label: "Metrics" },
] as const;

type ExtraTabId = (typeof EXTRA_TABS)[number]["id"];
type GuideStackTabId = (typeof SPONSOR_INTEGRATIONS)[number]["id"] | ExtraTabId;

function AgentsTabContent({
  agentsSection,
  toolsSection,
}: {
  agentsSection: React.ReactNode;
  toolsSection: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {agentsSection}
      {toolsSection}
    </div>
  );
}

export function GuideStackTabs({
  analytics,
  clickhouseConnected,
  langfuseCompare,
  openWebPanel,
  agentsSection,
  toolsSection,
}: {
  analytics: Analytics | null;
  clickhouseConnected?: boolean;
  langfuseCompare: React.ReactNode;
  openWebPanel: React.ReactNode;
  agentsSection: React.ReactNode;
  toolsSection: React.ReactNode;
}) {
  const { isLive } = usePlatformHealth();
  const [activeTab, setActiveTab] = useState<GuideStackTabId>("langfuse");

  const activeIntegration = SPONSOR_INTEGRATIONS.find((s) => s.id === activeTab);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 overflow-hidden">
      <div className="px-4 pt-4 pb-2 border-b border-zinc-800/80">
        <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-3">
          Stack deep dive
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {SPONSOR_INTEGRATIONS.map((integration) => {
            const active = activeTab === integration.id;
            return (
              <button
                key={integration.id}
                type="button"
                onClick={() => setActiveTab(integration.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  active
                    ? "text-zinc-100 shadow-sm"
                    : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                }`}
                style={
                  active
                    ? {
                        borderColor: `${integration.accent}66`,
                        backgroundColor: `${integration.accent}18`,
                        color: integration.accent,
                      }
                    : undefined
                }
              >
                {integration.name}
              </button>
            );
          })}
          <span className="w-px shrink-0 bg-zinc-800 mx-1 self-stretch" aria-hidden />
          {EXTRA_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  active
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                    : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeIntegration && (
              <div className="space-y-6">
                <IntegrationDetailCard
                  integration={activeIntegration}
                  live={isLive(activeIntegration)}
                />
                {activeIntegration.id === "langfuse" && langfuseCompare}
                {activeIntegration.id === "clickhouse" && (
                  <ClickHouseCompare
                    queryMs={analytics?.storage?.query_ms?.clickhouse}
                    jsonMs={analytics?.storage?.query_ms?.json_file}
                    connected={clickhouseConnected ?? analytics?.stack?.clickhouse_connected}
                    total={analytics?.total}
                  />
                )}
                {activeIntegration.id === "openui" && <OpenUICompare embedded />}
              </div>
            )}

            {activeTab === "setup" && <PlatformSetupPanel />}
            {activeTab === "agents" && (
              <AgentsTabContent agentsSection={agentsSection} toolsSection={toolsSection} />
            )}
            {activeTab === "open-web" && openWebPanel}
            {activeTab === "metrics" && <StackAnalyticsPanel analytics={analytics} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
