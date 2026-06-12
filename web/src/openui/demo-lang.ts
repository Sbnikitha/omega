/** Shared OpenUI Lang demo — incident dashboard for auth outage */
export const OMEGA_DEMO_LANG = `root = Card([hdr, callout, status, rca, savings, tbl, followUps])
hdr = CardHeader("Auth outage · SEV1", "OMEGA generative UI — streams as tokens arrive")
callout = Callout("warning", "Human gate active", "Response agent blocked until IC approves rollback.")
status = IncidentStatusCard("auth", "critical", "awaiting_approval", "trace-7f2a9c")
rca = RootCauseInsight("connection_pool_exhaustion", 0.87, "Pool maxed after deploy; cascade via api-gateway → frontend.")
savings = CostSavingsChip(4.2, 315, "vs manual bridge")
tbl = Table([Col("Agent", agents), Col("Langfuse span", spans), Col("Score", scores)])
agents = ["Observer", "Scientist", "Simulator", "Response"]
spans = ["observe", "root_cause_analysis", "scenario_simulation", "action_planning"]
scores = ["—", "0.91", "0.88", "0.85"]
followUps = FollowUpBlock([fu1, fu2])
fu1 = FollowUpItem("Approve rollback plan")
fu2 = FollowUpItem("Replay GitHub DB routing incident")`;

/** Same dashboard expressed as JSON-Render style (verbose — benchmark ~2× tokens) */
export const JSON_RENDER_DEMO = `{
  "component": "Card",
  "props": {
    "children": [
      {
        "component": "CardHeader",
        "props": {
          "title": "Auth outage · SEV1",
          "subtitle": "Static JSON — wait for full payload before render"
        }
      },
      {
        "component": "Callout",
        "props": {
          "variant": "warning",
          "title": "Human gate active",
          "description": "Response agent blocked until IC approves rollback."
        }
      },
      {
        "component": "IncidentStatusCard",
        "props": {
          "service": "auth",
          "severity": "critical",
          "status": "awaiting_approval",
          "traceId": "trace-7f2a9c"
        }
      },
      {
        "component": "RootCauseInsight",
        "props": {
          "rootCause": "connection_pool_exhaustion",
          "confidence": 0.87,
          "reasoning": "Pool maxed after deploy; cascade via api-gateway to frontend."
        }
      },
      {
        "component": "Table",
        "props": {
          "columns": [
            { "header": "Agent", "cells": ["Observer", "Scientist", "Simulator", "Response"] },
            { "header": "Span", "cells": ["observe", "root_cause_analysis", "scenario_simulation", "action_planning"] },
            { "header": "Score", "cells": ["—", "0.91", "0.88", "0.85"] }
          ]
        }
      }
    ]
  }
}`;

/** Markdown-only response (no generative UI at all) */
export const MARKDOWN_ONLY_DEMO = `## 🔴 Auth outage · SEV1

**Service:** auth  
**Severity:** critical  
**Status:** awaiting_approval  
**Trace:** trace-7f2a9c  

---

### Root cause (Scientist)
connection_pool_exhaustion — confidence 87%

> Database pool saturated after deploy. Cascade: api-gateway → frontend.

### Manual cost saved
~$315 · 4.2 eng-hours

### Agent pipeline
| Agent | Span | Score |
|-------|------|-------|
| Observer | observe | — |
| Scientist | root_cause_analysis | 0.91 |
| Simulator | scenario_simulation | 0.88 |
| Response | action_planning | 0.85 |

*No approve button. Copy-paste into runbook. Scroll during outage.*`;
