import { NextRequest, NextResponse } from "next/server";

import {
  omegaBackendConfigError,
  omegaBackendHeaders,
  omegaBackendUrl,
} from "@/lib/omega-server";

type RouteContext = { params: Promise<{ path: string[] }> };

function proxyError(status: number, error: string, detail: Record<string, unknown>) {
  return NextResponse.json({ error, ...detail }, { status });
}

async function proxy(req: NextRequest, context: RouteContext) {
  const configError = omegaBackendConfigError();
  if (configError) {
    return proxyError(503, "omega_misconfigured", {
      message: configError,
      hint: "Render → omega-web → Environment → OMEGA_API_URL=https://YOUR-backend.onrender.com",
    });
  }

  const { path } = await context.params;
  const pathStr = path.join("/");
  const search = req.nextUrl.search;
  const base = omegaBackendUrl();
  const target = `${base}/${pathStr}${search}`;

  const init: RequestInit = {
    method: req.method,
    headers: omegaBackendHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  let res: Response;
  try {
    res = await fetch(target, init);
  } catch (e) {
    const message = e instanceof Error ? e.message : "fetch failed";
    return proxyError(502, "backend_unreachable", {
      message,
      target,
      hint:
        "Wake the backend (free tier cold start ~60s), verify /health returns JSON, and check OMEGA_API_URL uses https://",
    });
  }

  const body = await res.text();

  if (res.status === 404 && body.includes("Cannot GET")) {
    return proxyError(502, "backend_wrong_app", {
      message: "Backend URL does not look like OMEGA FastAPI (/health should return JSON, not HTML).",
      target,
      hint: "Confirm omega-backend Root Directory is backend and start command is python run.py",
    });
  }

  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
