import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service — CourtVision" };

/** Minimal terms of service (ROADMAP M10 — stub acceptable for first users). */
export default function TermsPage() {
  return (
    <article className="space-y-4 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

      <p>
        By using CourtVision you agree to these terms. They are short on purpose; we'll expand them
        before a wider launch.
      </p>

      <h2 className="pt-2 text-lg font-semibold">Using the app</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>You're responsible for keeping your account credentials secure.</li>
        <li>Don't upload unlawful content or use the app to harass others.</li>
        <li>
          You keep ownership of the plays you create. You grant us permission to store and display
          them to your team so the app works.
        </li>
      </ul>

      <h2 className="pt-2 text-lg font-semibold">Availability</h2>
      <p>
        CourtVision is provided “as is,” without warranty. It's early software — features may change
        and occasional downtime can happen. We aren't liable for losses arising from use of the app.
      </p>

      <h2 className="pt-2 text-lg font-semibold">Ending use</h2>
      <p>
        You may stop using CourtVision at any time. We may suspend accounts that violate these
        terms.
      </p>

      <h2 className="pt-2 text-lg font-semibold">Contact</h2>
      <p>
        Questions? Email{" "}
        <a href="mailto:support@courtvision.app" className="text-primary hover:underline">
          support@courtvision.app
        </a>
        .
      </p>
    </article>
  );
}
