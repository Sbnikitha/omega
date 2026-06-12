import { NextRequest, NextResponse } from "next/server";

import { omegaBackendHeaders, omegaBackendUrl } from "@/lib/omega-server";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const pathStr = path.join("/");
  const search = req.nextUrl.search;
  const target = `${omegaBackendUrl()}/${pathStr}${search}`;

  const init: RequestInit = {
    method: req.method,
    headers: omegaBackendHeaders(),
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  const res = await fetch(target, init);
  const body = await res.text();

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
