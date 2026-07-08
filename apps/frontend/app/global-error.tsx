"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-slate-950">
          <div>
            <h1 className="text-3xl font-black">Something went wrong</h1>
            <p className="mt-3 text-slate-600">The error has been reported.</p>
          </div>
        </main>
      </body>
    </html>
  );
}
