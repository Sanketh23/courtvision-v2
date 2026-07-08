import Link from "next/link";
import { Court } from "@/features/play/court/Court";
import { positionAt } from "@/features/play/engine/position";
import { spreadPr } from "@/features/play/fixtures";
import { samplePath, toPolylinePoints } from "@/features/play/viewer/paths";

/**
 * Public landing page (ROADMAP M10: "a minimal landing/marketing page").
 * One page: hero with a static play diagram, three value points, a CTA into
 * sign-up, and a footer linking the legal pages. No auth required.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold text-primary">CourtVision</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/sign-in" className="text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-5xl items-center gap-10 px-6 py-16 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Basketball plays that <span className="text-primary">actually move.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Design animated plays as smooth, continuous motion — not slideshows of still frames.
            Coaches build in a desktop editor; players study on any phone.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90"
            >
              Create your playbook
            </Link>
            <Link
              href="/join"
              className="rounded-md border border-border px-5 py-2.5 font-medium hover:bg-secondary"
            >
              Join with a team code
            </Link>
          </div>
        </div>

        {/* A real play, drawn by the engine — proof the animation model works. */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <LandingPlayDiagram />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            “{spreadPr.name}” — {spreadPr.players.length} players, {spreadPr.actions.length} actions
          </p>
        </div>
      </section>

      {/* Value points */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          <Feature title="Continuous motion">
            Plays are keyframes interpolated 60 times a second — players glide along real paths.
          </Feature>
          <Feature title="Mobile-first viewer">
            Players scrub, loop, and study plays on any phone, with the steps called out.
          </Feature>
          <Feature title="Versioned by default">
            Every save snapshots a version. Restore any earlier state, anytime.
          </Feature>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold">Ready to build your first play?</h2>
        <p className="mt-2 text-muted-foreground">
          Sign up, create a team, and share a code with your players.
        </p>
        <Link
          href="/sign-up"
          className="mt-6 inline-block rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90"
        >
          Get started — it's free
        </Link>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} CourtVision</span>
          <nav className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

/** Static frame of the fixture play (paths + starting positions), engine-drawn. */
function LandingPlayDiagram() {
  return (
    <Court className="w-full">
      {spreadPr.players.map((player) => {
        const points = samplePath(player.path, spreadPr.duration, 32);
        const start = positionAt(player.path, 0);
        const color = `var(--slot-${player.slot})`;
        return (
          <g key={player.id} pointerEvents="none">
            <polyline
              points={toPolylinePoints(points)}
              fill="none"
              stroke={color}
              strokeWidth="0.8"
              strokeLinecap="round"
              opacity="0.5"
            />
            <circle cx={start.x} cy={start.y} r="2.6" fill={color} />
          </g>
        );
      })}
    </Court>
  );
}
