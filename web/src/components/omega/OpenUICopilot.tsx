"use client";

import "@openuidev/react-ui/components.css";

import { omegaLibrary } from "@/openui/omega-library";
import { openAIAdapter, openAIMessageFormat } from "@openuidev/react-headless";
import { FullScreen } from "@openuidev/react-ui";
import { motion } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";

export function OpenUICopilot() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-500 px-1">
        Live OpenUI copilot — compare WITH/WITHOUT in the <span className="text-violet-400">Guide</span> tab.
      </p>
      <motion.section
        className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          type="button"
          onClick={() => setChatOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-900/50 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <span className="text-sm font-semibold text-zinc-200">Live generative copilot</span>
            <span className="text-[10px] text-zinc-600 font-mono">asks OMEGA API · streams new UI</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${chatOpen ? "rotate-180" : ""}`} />
        </button>

        {chatOpen && (
          <div className="border-t border-zinc-800 h-[min(70vh,640px)] [&_.openui-fullscreen]:!h-full [&_.openui-fullscreen]:!min-h-0">
            <FullScreen
              processMessage={async ({ messages, abortController }) =>
                fetch("/api/openui-chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ messages: openAIMessageFormat.toApi(messages) }),
                  signal: abortController.signal,
                })
              }
              streamProtocol={openAIAdapter()}
              componentLibrary={omegaLibrary}
              agentName="OMEGA Copilot"
              theme={{ mode: "dark" }}
              conversationStarters={{
                variant: "short",
                options: [
                  { displayText: "Incident dashboard", prompt: "Build a live incident dashboard for the auth service outage." },
                  { displayText: "Public outages table", prompt: "Query public incidents and show MTTR and savings in a table." },
                  { displayText: "Approval metrics", prompt: "Show analytics as charts: approval rate and cost savings." },
                ],
              }}
            />
          </div>
        )}
      </motion.section>
    </div>
  );
}
