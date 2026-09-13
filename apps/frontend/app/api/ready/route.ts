import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const headers = { "Cache-Control": "no-store, max-age=0" };
  const revision = process.env.APP_REVISION ?? null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.all([
        prisma.category.findFirst({ select: { id: true, nameDe: true, active: true } }),
        (async () => {
          const base = (process.env.API_URL ?? "http://localhost:4000").replace(/\/+$/, "");
          const response = await fetch(`${base}/v1/ready`, {
            cache: "no-store",
            signal: AbortSignal.timeout(8_000),
          });
          if (!response.ok) throw new Error("API is not ready");
          const api = await response.json();
          if (api.status !== "ok" || api.service !== "api" || api.revision !== revision) {
            throw new Error("API release mismatch");
          }
        })(),
      ]),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Readiness timeout")), 10_000);
      }),
    ]);
    return Response.json({ status: "ok", service: "frontend", revision }, { headers });
  } catch {
    return Response.json({ status: "unavailable", service: "frontend" }, { status: 503, headers });
  } finally {
    clearTimeout(timer);
  }
}
