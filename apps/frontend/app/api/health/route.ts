export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "frontend",
      revision: process.env.APP_REVISION ?? process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
