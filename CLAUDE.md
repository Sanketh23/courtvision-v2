# CLAUDE.md — CourtVision

This is the first file to read. It orients you to the project, points to the detailed docs, and encodes the guardrails that must not be violated. Read this fully before writing any code.

---

## What CourtVision is

CourtVision is a web-based basketball playbook app. **Coaches create animated plays** in a desktop editor; **coaches and players review them** on any device, with a mobile-first experience for players. The defining feature is the quality of the play *animation* — communicating motion, not just static positions.

This is **v2**, a focused rewrite. v1 grew into a sprawling coaching-operations platform (playbook + games + stats + scouting + AI assistant) and its core feature — play animation — ended up the weakest part, animating plays as slideshows of still frames because the data model couldn't represent motion. v2 fixes this by being disciplined about scope and getting the animation foundation right first.

---

## The one thing that matters most

**Animation is the product.** A play is continuous motion over time, stored as keyframes and interpolated smoothly. If you ever find yourself representing a play as a list of discrete "steps" or "stills," stop — that's the v1 mistake. Players move along smooth paths; the renderer asks "where is each player at time t?" 60 times per second. See `DATA_MODEL.md` and `ANIMATION_DESIGN.md`.

---

## The documents (read in this order)

1. **`PRD.md`** — what we're building, for whom, and what's explicitly out of scope. Start here.
2. **`DATA_MODEL.md`** — the play JSON schema and database schema. The most important technical doc. The play schema is the contract everything depends on.
3. **`ANIMATION_DESIGN.md`** — how the data becomes smooth motion. The rendering stack, interpolation, the frame loop.
4. **`UI_WORKFLOWS.md`** — every screen, with wireframes (four embedded as SVG in `wireframes/`) and behaviors.
5. **`ARCHITECTURE.md`** — tech stack, folder structure, module boundaries, performance budgets.
6. **`AI_INTEGRATION.md`** — AI features deferred to v1.1, designed ahead so v2 doesn't preclude them. Note the §14 checklist of things v2 must do to stay AI-ready.
7. **`ROADMAP.md`** — the milestone sequence (M0–M10) with definitions of done. Build in this order.
8. **`CONVENTIONS.md`** — naming, code style, commit format, anti-patterns. Follow while coding.

When these documents conflict, the more specific one wins for its domain (e.g. `DATA_MODEL.md` is authoritative on the schema). If something is genuinely contradictory, flag it rather than guessing.

---

## Hard guardrails (do not violate)

These are the rules that, if broken, undermine the whole project:

1. **Scope is the playbook only.** No games, schedules, stats, scouting, game plans, matchups, or a general AI assistant. Those were v1's scope creep. If a request seems to add one of these, flag it against `PRD.md` §5.2 before building.

2. **Motion is continuous, never a step-list.** Plays are keyframes interpolated over time. See `DATA_MODEL.md` §3.

3. **The play schema is the single source of truth.** It lives in `features/play/schemas.ts` as a Zod schema. Don't create parallel or ad-hoc play structures. Everything (editor, viewer, future AI) reads and writes this one schema.

4. **RLS is the access-control contract.** Don't reimplement permission checks in app code. The database enforces who sees what. See `ARCHITECTURE.md` §8.4 and `DATA_MODEL.md` §5.

5. **AI is deferred to v1.1.** Don't build AI features in v2. But don't break the path to them either — honor the `AI_INTEGRATION.md` §14 checklist (the editor loads plays from plain JSON; ball-state regeneration is a pure function; etc.).

6. **The animation engine has no React.** `features/play/engine/` is pure, tested, framework-agnostic functions. No `react` imports there.

7. **Vertical slices, not horizontal layers.** Each milestone works end-to-end. Don't build "all the tables" then "all the UI." See `ROADMAP.md` §1.

8. **Respect performance budgets.** Especially the mobile viewer: <150 KB gzipped JS, 60fps on a mid-range phone. See `ARCHITECTURE.md` §16. Fix budget violations before adding features.

9. **Don't add dependencies casually.** This is a solo project. Every dependency is a lifetime maintenance cost. Justify additions.

10. **Don't pre-stub future features.** Building scaffolding for things not in v2 is how scope crept the first time.

---

## The tech stack (summary)

Full reasoning in `ARCHITECTURE.md`. The short version:

- **Next.js 15** (App Router) + **TypeScript** (strict)
- **Tailwind v4** + CSS-variable design tokens + **shadcn/ui** primitives
- **Supabase** (Postgres + Auth + RLS + Storage)
- **TanStack Query** for server state; **Zustand** for editor state only; React state elsewhere
- **React Hook Form + Zod** for forms and validation
- **Custom animation engine** (no animation library)
- **Vitest** + Testing Library + **Playwright**; **Biome** for lint/format; **pnpm**
- Hosted on **Vercel** + **Supabase Cloud**; **Sentry** for errors

---

## Folder structure (summary)

Feature-based, not layer-based. Full tree in `ARCHITECTURE.md` §13.

```
app/          — Next.js routes (thin; glue only)
features/     — the real code, grouped by domain
  auth/  team/  playbook/  play/
  play/ has: engine/ (pure), editor/, viewer/, court/, schemas.ts, queries.ts
components/ui/ — shadcn primitives only
lib/          — framework-agnostic utilities, supabase clients
supabase/     — migrations and seed
```

Import boundaries: features don't import other features; `lib/` doesn't import features; the engine doesn't import React. See `CONVENTIONS.md` §13.

---

## How to work on this project

1. **Find the current milestone in `ROADMAP.md`.** Work on that milestone's scope. Don't jump ahead.
2. **Read the relevant detailed doc** for the area you're touching before coding.
3. **Build vertical slices.** Make the full path work before moving on.
4. **Test the engine thoroughly**; be pragmatic elsewhere (per `CONVENTIONS.md` §12).
5. **Check the milestone's definition of done** before considering it complete.
6. **Match existing conventions.** Consistency over cleverness.
7. **When unsure, ask or flag** rather than guessing — especially on scope and schema decisions.

---

## Key facts to remember

- **Coordinate system:** court is 100 wide × 94 tall, origin top-left, basket at (50, 89). All play coordinates use this normalized space. See `DATA_MODEL.md` §3.5.
- **Two roles:** `coach` (full access) and `player` (view published plays only). No assistant coach in v2.
- **Players can't see draft plays.** Only published ones. Coaches see everything.
- **Versioning is automatic:** every play save creates an immutable version. This is the cross-session undo and the AI safety net.
- **The editor is desktop-only** (≥1024px). The viewer works everywhere, mobile-first.
- **Offense only** in v2. The schema allows defenders later, but v2 doesn't build them.
- **Half-court only** in v2.

---

## What success looks like

v2 is done when a coach who isn't the developer can sign up, build a smooth animated play, publish it, and have a player watch it on their phone — without help and without reading docs. See `PRD.md` §7 and `ROADMAP.md` §16.

---

## A note on the v1 codebase

The v1 code (separate repo) is **not reused**. Its lessons are baked into these docs. Don't import its patterns — especially not its step-list animation model or its sprawling scope. If you look at v1 for reference, look at what to avoid, not what to copy. The one thing v1 got right was its dense, coaching-tool visual aesthetic; that spirit can carry forward, but nothing else should.

---

*This file is the entry point. Keep it current as the project evolves.*
