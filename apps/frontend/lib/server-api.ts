import "server-only";

import type { NextRequest } from "next/server";

const API_BASE = process.env.API_URL ?? "http://localhost:4000";

export async function proxyApi(request: NextRequest, path: string) {
  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.text();
  const response = await fetch(`${API_BASE}${path}`, {
    method: request.method,
    body,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  });

  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
  });
}
