/** Server-only OMEGA backend config (never import from client components). */

export function omegaBackendUrl(): string {
  return process.env.OMEGA_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8001";
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
