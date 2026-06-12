import type { CostSavingsRow } from "@/lib/omega-api";

const BRIDGE = 3;
const HOURLY = 150;
const LLM = 0.024;
const DIAG_REDUCTION = 0.45;
const DIAG_CAP = 90;
const PIPELINE_MIN = 4;

export function computeWhatIf(
  mttrMinutes: number,
  severity: string = "high"
): CostSavingsRow {
  const manualMttr = mttrMinutes;
  const saved = Math.min(manualMttr * DIAG_REDUCTION, DIAG_CAP);
  const omegaMttr = Math.max(manualMttr - saved, PIPELINE_MIN);
  const mttrSaved = Math.round((manualMttr - omegaMttr) * 10) / 10;

  const manualWork = Math.round((manualMttr / 60) * BRIDGE * 100) / 100;
  const omegaWork = Math.round((omegaMttr / 60) * BRIDGE * 100) / 100;
  const workSaved = Math.round((manualWork - omegaWork) * 100) / 100;

  const manualCost = Math.round((manualMttr / 60) * BRIDGE * HOURLY * 100) / 100;
  const omegaCost = Math.round((omegaMttr / 60) * BRIDGE * HOURLY * 100) / 100;
  const gross = Math.round((manualCost - omegaCost) * 100) / 100;
  const net = Math.round((gross - LLM) * 100) / 100;

  const triageManual = (severity === "critical" ? 4.5 : severity === "high" ? 3 : 1.5) * BRIDGE;
  const triageOmega = Math.round((PIPELINE_MIN / 60) * BRIDGE * 100) / 100;

  return {
    manual_mttr_minutes: manualMttr,
    omega_assisted_mttr_minutes: omegaMttr,
    mttr_saved_minutes: mttrSaved,
    manual_work_hours: manualWork,
    omega_work_hours: omegaWork,
    work_hours_saved: workSaved,
    manual_triage_hours: triageManual,
    omega_triage_hours: triageOmega,
    triage_hours_saved: Math.round((triageManual - triageOmega) * 100) / 100,
    manual_cost_usd: manualCost,
    omega_cost_usd: omegaCost,
    llm_cost_usd: LLM,
    gross_savings_usd: gross,
    net_savings_usd: net,
    bridge_engineers: BRIDGE,
    hourly_rate_usd: HOURLY,
  };
}

export function formatFormula(row: CostSavingsRow): string[] {
  return [
    `Manual bridge cost = (${row.manual_mttr_minutes} min ÷ 60) × ${row.bridge_engineers} engineers × $${row.hourly_rate_usd}/hr = $${row.manual_cost_usd.toLocaleString()}`,
    `Diagnosis time saved = min(${row.manual_mttr_minutes} × 45%, 90 min) = ${row.mttr_saved_minutes} min`,
    `OMEGA-assisted MTTR = ${row.manual_mttr_minutes} − ${row.mttr_saved_minutes} = ${row.omega_assisted_mttr_minutes} min`,
    `OMEGA bridge cost = (${row.omega_assisted_mttr_minutes} min ÷ 60) × ${row.bridge_engineers} × $${row.hourly_rate_usd} = $${row.omega_cost_usd.toLocaleString()}`,
    `Net savings = $${row.manual_cost_usd.toLocaleString()} − $${row.omega_cost_usd.toLocaleString()} − $${row.llm_cost_usd} LLM = $${row.net_savings_usd.toLocaleString()}`,
  ];
}

export function improvementPct(row: CostSavingsRow): number {
  if (row.manual_cost_usd <= 0) return 0;
  return Math.round((row.net_savings_usd / row.manual_cost_usd) * 1000) / 10;
}
