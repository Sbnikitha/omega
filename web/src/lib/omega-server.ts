/** Server-only OMEGA backend config (never import from client components). */

/** Ensure Render fromService host values work as fetch URLs. */
function normalizeServiceUrl(raw: string | undefined, fallback: string): string {
  const value = raw?.trim().replace(/\/$/, "");
  if (!value) return fallback;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

export function omegaBackendUrl(): string {
  return normalizeServiceUrl(process.env.OMEGA_API_URL, "http://127.0.0.1:8001");
}

export function omegaPaymentHeaders(): Record<string, string> {
  const token = process.env.OMEGA_PAYMENT_TOKEN?.trim() || "";
  if (!token) return {};
  return { "X-402-Payment": token };
}

export function omegaBackendHeaders(extra?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...omegaPaymentHeaders(),
    ...Object.fromEntries(new Headers(extra).entries()),
  };
}
