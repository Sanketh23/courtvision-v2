/**
 * Server-side error tracking (ROADMAP M10: "Sentry receiving events").
 *
 * Deliberately server + edge only — NOT the client SDK. The mobile viewer
 * has a hard <150 KB gzipped JS budget (ARCHITECTURE §16, CLAUDE.md guardrail
 * #8), and the Sentry browser SDK (~30 KB) would blow it. This captures the
 * errors that matter most — Server Components, Server Actions, route handlers,
 * and SSR — at zero cost to the client bundle. Client-side error capture is a
 * deliberate deferral; revisit if the budget allows a lazy-loaded client SDK.
 *
 * Fully DSN-gated: with SENTRY_DSN unset (local/dev), init is a no-op.
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      // Keep PII out of error reports (we have user emails in scope).
      sendDefaultPii: false,
    });
  }
}

// Capture errors thrown in the React Server Components / route-handler path.
export const onRequestError = Sentry.captureRequestError;
