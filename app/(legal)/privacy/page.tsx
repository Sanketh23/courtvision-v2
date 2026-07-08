import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy — CourtVision" };

/**
 * Minimal privacy policy (ROADMAP M10: "stub is acceptable for first users;
 * real before wider launch"). Reflects what v2 actually collects.
 */
export default function PrivacyPage() {
  return (
    <article className="space-y-4 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

      <p>
        CourtVision is a basketball playbook app. This policy describes what we collect and why. It
        is intentionally short because we collect little.
      </p>

      <h2 className="pt-2 text-lg font-semibold">What we collect</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Account info</strong> — your name and email, used to sign you in and identify you
          to your team.
        </li>
        <li>
          <strong>Team &amp; play data</strong> — the teams, plays, and versions you create, so we
          can store and show them to your team.
        </li>
        <li>
          <strong>Study progress</strong> — which plays you have marked studied.
        </li>
      </ul>

      <h2 className="pt-2 text-lg font-semibold">What we don't do</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>We don't sell your data.</li>
        <li>We don't show ads.</li>
        <li>We don't track you across other sites.</li>
      </ul>

      <h2 className="pt-2 text-lg font-semibold">Storage &amp; access</h2>
      <p>
        Data is stored with our hosting provider (Supabase). Row-level security ensures you only see
        data for teams you belong to. Coaches see their team's plays; players see published plays.
      </p>

      <h2 className="pt-2 text-lg font-semibold">Deleting your data</h2>
      <p>
        You can sign out at any time. To delete your account or team data, contact us and we will
        remove it.
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
