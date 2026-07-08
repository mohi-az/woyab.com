"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

export function NotFoundTelemetry() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;

    sentRef.current = true;
    Sentry.captureMessage("Route not found", {
      level: "info",
      fingerprint: ["route-not-found"],
      tags: {
        event_type: "route_not_found",
        path: pathname,
      },
      extra: {
        query: searchParams.toString() || undefined,
        referrer: document.referrer || undefined,
      },
    });
  }, [pathname, searchParams]);

  return null;
}
