import * as Sentry from "@sentry/nextjs";
import { getCookieConsent, onCookieConsentChange } from "@/lib/cookie-consent";

let sentryInitialized = false;

function initializeSentry() {
  if (sentryInitialized || !process.env.NEXT_PUBLIC_SENTRY_DSN || !getCookieConsent()?.analytics) return;

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
    sendDefaultPii: false,
    integrations: [Sentry.replayIntegration()],
  });
  sentryInitialized = true;
}

initializeSentry();

onCookieConsentChange((consent) => {
  if (consent.analytics) {
    initializeSentry();
    return;
  }

  if (sentryInitialized) {
    sentryInitialized = false;
    void Sentry.close(2000);
  }
});

export const onRouterTransitionStart: typeof Sentry.captureRouterTransitionStart = (...args) => {
  if (sentryInitialized) Sentry.captureRouterTransitionStart(...args);
};
