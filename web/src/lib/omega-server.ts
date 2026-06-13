/** Server-only OMEGA backend config (never import from client components). */

const LOCAL_BACKEND = "http://127.0.0.1:8001";

/** Ensure Render fromService host values work as fetch URLs. */
export function normalizeServiceUrl(raw: string | undefined, fallback = ""): string {
  const value = raw?.trim().replace(/\/$/, "");
  if (!value) return fallback;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

export function omegaBackendUrl(): string {
  const configured = normalizeServiceUrl(process.env.OMEGA_API_URL, "");
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "OMEGA_API_URL is missing on omega-web. Set it to https://YOUR-omega-backend.onrender.com in Render env."
    );
  }
  return LOCAL_BACKEND;
}

export function omegaBackendConfigError(): string | null {
  try {
    omegaBackendUrl();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "OMEGA_API_URL is not configured";
  }
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
