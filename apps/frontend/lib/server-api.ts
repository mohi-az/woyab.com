import "server-only";

import type { NextRequest } from "next/server";

const API_BASE = (process.env.API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

export async function fetchInternalApiJson<T>(path: string, timeoutMs = 20_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        ...(process.env.INTERNAL_API_SECRET ? { "x-woyab-internal-secret": process.env.INTERNAL_API_SECRET } : {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
      throw new Error(payload?.error || payload?.message || `Internal API returned HTTP ${response.status}.`);
    }
    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function proxyApi(
  request: NextRequest,
  path: string,
  options: { internal?: boolean } = {},
) {
  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.text();
  const response = await fetch(`${API_BASE}${path}`, {
    method: request.method,
    body,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(options.internal && process.env.INTERNAL_API_SECRET
        ? { "x-woyab-internal-secret": process.env.INTERNAL_API_SECRET }
        : {}),
    },
    cache: "no-store",
  });

  const headers = new Headers({
    "Content-Type": response.headers.get("content-type") ?? "application/json",
  });
  for (const name of ["cache-control", "content-length", "retry-after"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
