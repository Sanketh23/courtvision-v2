# CourtVision — Architecture

**Status:** Draft v0.1
**Owner:** Sanketh
**Last updated:** 2026-04-30
**Depends on:** `PRD.md`, `DATA_MODEL.md`, `ANIMATION_DESIGN.md`, `UI_WORKFLOWS.md`

---

## 1. What this document is

This document specifies the tech stack, project structure, module boundaries, and operational concerns for CourtVision v2. It is the blueprint that Claude Code uses to scaffold the project and that future contributors (and future-you) use to understand where things live and why.

Decisions are presented as **decisions with reasoning**, not menus. Where I've picked a specific tool, I explain the alternative considered and why I rejected it. Two principles drive every choice:

1. **Solo-developer-friendly.** Every tool we add is something one person must learn, configure, and maintain. The marginal value of adding a dependency must exceed its lifetime cost.
2. **Animation is the product.** Choices that compromise the play editor/viewer performance or developer experience are rejected even if they would improve other parts of the app.

---

## 2. Stack at a glance

| Layer | Pick | Why (short) |
|---|---|---|
| **Frontend framework** | Next.js 15 (App Router) | React + best-in-class hosting story (Vercel), file-based routing, server components when useful |
| **Language** | TypeScript (strict) | Catches the kinds of bugs you can't afford as a solo dev |
| **Styling** | Tailwind CSS v4 + CSS variables for tokens | Fast to write, no naming overhead, easy theming |
| **UI primitives** | shadcn/ui (copy-paste components) | Owned code, no library lock-in, accessible defaults |
| **Animation engine** | Custom (per `ANIMATION_DESIGN.md`) | No library matches the contract we need |
| **State (client)** | Zustand for editor state; React state elsewhere | Editor has complex mutable state; rest doesn't |
| **State (server)** | TanStack Query (React Query) | Standard for Supabase data fetching + caching |
| **Backend** | Supabase (Postgres + Auth + RLS + Storage) | Already in the brief; right tool for this scale |
| **Auth** | Supabase Auth (email + password) | Built in; cheap; supports the upgrade paths we'll want later |
| **Form handling** | React Hook Form + Zod | Schemas double as runtime validation and TS types |
| **Schema validation** | Zod | Used at API boundaries, form validation, and play data validation |
| **Testing** | Vitest + Testing Library; Playwright for E2E | Vitest is faster than Jest; Playwright is the modern E2E choice |
| **Linting / formatting** | Biome | Single tool replaces ESLint + Prettier; faster |
| **Package manager** | pnpm | Faster than npm, deterministic, good monorepo story if ever needed |
| **Hosting (frontend)** | Vercel | Zero-config for Next.js |
| **Hosting (backend)** | Supabase Cloud | Bundled with the database |
| **Analytics** | None in v2 | Add Posthog or Plausible in v1.1 if needed |
| **Error tracking** | Sentry (free tier) | Worth setting up day-one even if traffic is small |
| **CI/CD** | GitHub Actions (lint, typecheck, test) + Vercel auto-deploy | Standard, free for solo work |

The rest of this doc explains each pick.

---

## 3. Frontend framework — Next.js 15

**Decision:** Next.js 15 with the App Router, deployed to Vercel.

### 3.1 Why Next.js

The realistic alternatives for a React-based app in 2026 are Next.js, Remix (now React Router 7), Vite + React, and TanStack Start. Next.js wins for v2 because:

- **Vercel hosting is genuinely zero-config.** Push to GitHub, get a preview deploy. As a solo dev, every hour spent on infra is an hour not spent on the play editor.
- **The App Router maps cleanly onto our routes.** Most of our routes are simple authenticated pages; a few have nested layouts (e.g. the editor inside the play context). File-based routing keeps the project navigable.
- **Server components are useful in two specific places** — initial playbook fetch (server-rendered HTML for fast LCP) and auth-gated route protection (server-side session check). We won't lean heavily on them.
- **Wide ecosystem and AI tooling familiarity.** Claude Code knows Next.js conventions deeply, which matters when you're using it as your primary implementation tool.

### 3.2 What we don't use Next.js for

- **No server actions for mutations.** We use Supabase JS client directly. Server actions add a layer (Next.js → server → Supabase) without value for our use case.
- **No middleware-heavy auth.** Supabase auth helpers handle most of this. Next.js middleware is used only for top-level redirects (e.g. "no team yet → /welcome").
- **No edge functions for the play editor.** The editor is a client-side experience; trying to render it on the edge would be the wrong tradeoff.

### 3.3 Alternatives rejected

- **Remix / React Router 7.** Strong alternative; loaders/actions pattern is cleaner than Next.js for data flow. Rejected because Vercel + Next.js is the most frictionless solo hosting story today, and the App Router is good enough.
- **Vite + React (no SSR).** Simpler, but loses SEO benefits, server-side auth checks, and the prebuilt Vercel auth helpers. Reconsider if Next.js becomes painful.
- **TanStack Start.** Promising but newer. Solo dev means we pick boring tech for the parts that aren't differentiating.

---

## 4. TypeScript

**Decision:** TypeScript, `"strict": true`, `"noUncheckedIndexedAccess": true`.

No JavaScript. Every file is `.ts` or `.tsx`.

### 4.1 Why strict mode (and the extra flag)

`strict: true` covers the major safety wins. `noUncheckedIndexedAccess: true` is the one off-by-default flag worth enabling: it makes `array[0]` return `T | undefined` instead of `T`. For animation code that walks keyframe arrays and interpolates, this catches real bugs at compile time.

### 4.2 Conventions

- Use `type` aliases for unions and primitive composites; use `interface` only for object shapes that may be extended.
- Co-locate types with their primary user. If a type is used across modules, hoist it to a `types/` file in the relevant feature folder.
- **Never use `any`.** Use `unknown` and narrow.
- For Supabase row types, generate them via `supabase gen types` and commit them.

---

## 5. Styling — Tailwind v4 + design tokens

**Decision:** Tailwind CSS v4 with a small `tokens.css` file defining CSS custom properties for colors, spacing, and typography. shadcn/ui components copied in for primitives (buttons, dialogs, dropdowns, etc.).

### 5.1 Why Tailwind

- **No naming.** The biggest hidden cost in CSS is naming things. Tailwind eliminates it.
- **Fast iteration.** During design refinement, you change one className and re-render.
- **Tree-shakes well.** Final CSS bundle is small.

### 5.2 Why design tokens via CSS variables

The wireframes in `UI_WORKFLOWS.md` use a small color palette: primary blue, neutral grays, info/success/danger accents, and one ball/orange. Defining these as CSS variables (`--color-primary`, `--color-text-secondary`, etc.) and consuming them through Tailwind's theme means:

- Dark mode support is one variable redefinition away
- A future design refresh changes one file, not 200
- The animation engine can read variables in JS for canvas/SVG fills

### 5.3 Why shadcn/ui

Rather than installing a UI library and being subject to its evolution, shadcn/ui copies component source into your project. You own the code, you can modify it freely, and you avoid the "the library doesn't support the variant I need" problem. It's the right pick for a solo dev who values customization.

### 5.4 What we don't use

- **No CSS modules.** Tailwind covers all our needs.
- **No styled-components / emotion.** Runtime cost; not worth it.
- **No Tailwind plugins beyond the default.** We resist plugin sprawl.

---

## 6. Animation engine

**Decision:** Custom engine, no library. See `ANIMATION_DESIGN.md` for the full design.

To summarize the architectural shape: a small TypeScript module (`packages/play-engine/`) exports pure functions:

- `positionAt(path, t) → {x, y}` — interpolate a player's position
- `ballPositionAt(states, t) → {x, y, inFlight}` — interpolate the ball
- `overlaysFromActions(actions) → Overlay[]` — generate render-ready overlay data once per play

These are framework-agnostic. The React renderer (editor and viewer) consumes them via a `usePlayEngine(play)` hook that wires up the `requestAnimationFrame` loop and provides scrubber state.

This separation matters: the engine has no React in it. It's unit-testable as pure math. The renderer wraps it with React state.

### 6.1 Why not GSAP / Framer Motion / Anime.js

All three are excellent for "react to an event with motion" (button hover, page transition). None fit our use case, which is "interpolate the state of a model over a timeline that the user can scrub freely." Wrapping a timeline library to do what 80 lines of code can do is the wrong trade.

---

## 7. State management

We split state into three buckets, each with a different tool.

### 7.1 Server state — TanStack Query

For anything fetched from Supabase (plays list, single play, team members, etc.), TanStack Query handles caching, refetching, optimistic updates, and stale-while-revalidate. This is the standard pattern with Supabase and we use it consistently.

Query keys are typed and centralized:

```ts
// lib/query-keys.ts
export const queryKeys = {
  plays: {
    list: (teamId: string) => ['plays', teamId] as const,
    detail: (playId: string) => ['plays', 'detail', playId] as const,
    versions: (playId: string) => ['plays', 'versions', playId] as const,
  },
  team: {
    detail: (teamId: string) => ['team', teamId] as const,
    members: (teamId: string) => ['team', teamId, 'members'] as const,
  },
}
```

### 7.2 Editor state — Zustand

The play editor has complex, frequently-mutated state: which player is selected, which keyframe is selected, the in-memory edit buffer of the play, the undo/redo stacks, the timeline cursor position, and the play/pause status. Putting all this in React state via `useState` would mean either prop drilling everywhere or relying on context with rerender problems.

Zustand is the right fit because:
- It's tiny (~1 KB gzipped)
- It supports fine-grained subscriptions (the timeline rerenders, the player list doesn't, when the cursor moves)
- It plays well with TypeScript
- It's not React-specific, which is helpful for the animation engine sub-components

We use **one** Zustand store per editor instance, not a global app store. The store is scoped to the editor route and discarded on unmount.

### 7.3 Local UI state — React

Everything else uses `useState` and `useReducer`. Modal open/closed, form input transient state, hover states, dropdown selections that don't persist — all React. We don't reach for Zustand or context unless we feel the pain.

### 7.4 What we don't use

- **No Redux / Redux Toolkit.** Too heavy for our needs.
- **No Jotai / Recoil.** Zustand covers the same role with less ceremony.
- **No React Context for app data.** Context is fine for theme/auth, not for app data that changes often (rerender storms).

---

## 8. Backend — Supabase

**Decision:** Supabase (Postgres + Auth + Row Level Security + Storage). Hosted on Supabase Cloud.

This was implicit in the brief (you used Supabase in v1). For v2 we explicitly recommit, because the alternative would require a much bigger lift than the playbook deserves.

### 8.1 What Supabase gives us

- **Postgres database** with the schema in `DATA_MODEL.md` §4
- **Row Level Security** policies enforce the rules in `DATA_MODEL.md` §5 at the database layer — not in application code
- **Auth** for email/password signup and signin, password reset, session management
- **Storage** for future thumbnail caching, AI image uploads, etc. — not used in v2 but available
- **Realtime** (websockets) — not used in v2; available for future "watch coach editing" feature
- **The JS client** that wraps all of the above with TypeScript types

### 8.2 The Supabase client setup

Two clients are exported from `lib/supabase/`:

- `createServerClient()` — used in server components and route handlers; reads auth cookies
- `createBrowserClient()` — used in client components; the standard browser client

A single helper `getCurrentUser()` returns the authed user or null. Don't import the raw Supabase client outside `lib/supabase/`; always go through the wrappers.

### 8.3 Database access patterns

All database access goes through **typed query functions** in `features/<feature>/queries.ts`. Components don't talk to Supabase directly; they call functions like `getPlaysForTeam(teamId)` that return typed results.

This boundary lets us:
- Switch implementation (e.g. add caching, mock for tests) without touching components
- Standardize error handling
- Generate types once per query and reuse them

### 8.4 RLS as the contract

Row Level Security is **the** access control mechanism. We do not duplicate access checks in application code. The application code asks the database for what the user is allowed to see; the database returns the right rows or rejects the write. Defense in depth is a nice idea, but it doubles the surface for bugs — and Supabase RLS is purpose-built for this.

This implies: every query must be authenticated as the right user. The Supabase client handles this automatically when called from the server (cookie) or browser (session).

### 8.5 Migrations

We use Supabase's migration tooling (`supabase/migrations/`) for all schema changes. Migrations are checked in. Local development uses `supabase start` to run a local Postgres + auth instance.

**One environment until further notice:** v2 ships against a single Supabase project (production). When the second coach signs up, we add a `staging` project. This is deliberately scrappy — early users tolerate it, and managing two environments solo is real work.

---

## 9. Auth — Supabase Auth

**Decision:** Supabase Auth with email + password only in v2. No social login, no magic links, no OAuth.

### 9.1 Why simple

Every login method added is another support burden. Email + password is the most universally compatible, and Supabase handles password reset, session refresh, and storage well.

### 9.2 What's deferred

- Magic links (v1.1, especially useful for player invites)
- Google / Apple OAuth (v1.1)
- Email verification (v1.1; disabled in v2 to keep onboarding frictionless — see `UI_WORKFLOWS.md` §2.5)
- MFA / 2FA (post-v1)

### 9.3 Session handling

- Sessions are stored as cookies (HttpOnly, secure in production)
- Refreshed automatically by the Supabase client
- A server-component `requireAuth()` helper redirects to `/sign-in` if not authed
- A client-side `useAuth()` hook exposes the current user reactively

### 9.4 Roles and access

Roles live in `team_memberships.role` (`coach` or `player`). The current user's role for the current team is fetched once on app load and stored in a React Context (this *is* a good fit for context — it changes rarely). Components check the role via `useCurrentRole()` and conditionally render coach-only affordances (e.g. "Edit play" button in the viewer).

---

## 10. Forms and validation — React Hook Form + Zod

**Decision:** React Hook Form for form state; Zod for schema definition and validation.

### 10.1 Why this pair

- React Hook Form has minimal re-renders, good TypeScript integration, and handles complex form state without boilerplate.
- Zod schemas are written once and serve three purposes: form validation, API input validation, and inferred TypeScript types.

The pattern:

```ts
const createPlaySchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['offense', 'defense', /* ... */]),
  formation: z.string().optional(),
})

type CreatePlayInput = z.infer<typeof createPlaySchema>

// In the component:
const form = useForm<CreatePlayInput>({
  resolver: zodResolver(createPlaySchema),
})
```

The same schema is used server-side (in route handlers or query functions) to validate untrusted input.

### 10.2 The play data validation case

The play JSON (per `DATA_MODEL.md` §3) is also a Zod schema (`schemas/play.ts`). This schema:

- Validates data coming back from the database (defense against schema drift)
- Validates AI-generated plays before persisting them (critical for v1.1)
- Generates TypeScript types used throughout the renderer

This is one of the most important schemas in the project. It's referenced from `DATA_MODEL.md` and lives in a single file.

---

## 11. Testing

**Decision:** Vitest for unit + integration tests; React Testing Library for component tests; Playwright for end-to-end tests.

### 11.1 What we test, and what we don't

We are pragmatic about testing as a solo dev. The rule:

**Test must-not-break logic.** This is:
- The animation engine (`positionAt`, `ballPositionAt`, `overlaysFromActions`) — pure functions, snapshot-tested
- The play data Zod schema — round-trip tests with fixture plays
- RLS policies — tested via Supabase SQL test fixtures
- Critical user paths (sign up, create play, view play) — Playwright tests

**Skip tests for:**
- UI styling
- Trivial getters/setters
- Components without significant logic

The animation engine is the most-tested code in the repo. If it regresses, everything looks broken. Treat its tests as a tripwire.

### 11.2 Test file location

Tests live alongside source:
```
features/play/
├── engine.ts
├── engine.test.ts
├── editor.tsx
└── editor.test.tsx
```

### 11.3 E2E test scope

Playwright runs against a local Supabase instance with seeded data. Tests cover:
1. Sign up → create team → create play → publish → view in mobile viewer
2. Player joins team via code → sees published play → marks studied
3. Edit play → undo → save → version history shows two versions

Three flows is enough. Don't write E2E tests for every screen.

---

## 12. Linting and formatting — Biome

**Decision:** Biome replaces ESLint and Prettier.

### 12.1 Why

Biome is a single tool, written in Rust, that does both linting and formatting. It's ~10–100x faster than ESLint+Prettier, has sensible defaults, and one config file. For a solo dev, the toolchain simplification is genuinely worth it.

### 12.2 Config conventions

- Format on save (editor setting, not enforced by repo)
- Lint on commit via a pre-commit hook (Lefthook or simple git hook script)
- CI runs `biome check .` and fails on errors

### 12.3 What we don't use

- ESLint (replaced by Biome)
- Prettier (replaced by Biome)
- Husky (Lefthook is lighter)

---

## 13. Project structure

This is the folder layout. It's a feature-based structure, not a layer-based one (i.e. we don't put all components in `/components`; we group by domain).

```
courtvision/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx
│   │   ├── join/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── welcome/page.tsx
│   │   ├── team/
│   │   │   ├── new/page.tsx
│   │   │   └── page.tsx
│   │   ├── playbook/page.tsx
│   │   ├── play/
│   │   │   ├── new/page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   ├── account/page.tsx
│   │   └── layout.tsx           # auth-gated layout
│   ├── layout.tsx
│   └── globals.css
│
├── features/                     # feature modules — the meat of the app
│   ├── auth/
│   │   ├── components/
│   │   ├── queries.ts
│   │   ├── hooks.ts
│   │   └── types.ts
│   ├── team/
│   │   ├── components/
│   │   ├── queries.ts
│   │   ├── hooks.ts
│   │   └── types.ts
│   ├── playbook/                # browse / list view
│   │   ├── components/
│   │   ├── queries.ts
│   │   ├── hooks.ts
│   │   └── types.ts
│   └── play/                    # the big one
│       ├── engine/              # pure animation engine (no React)
│       │   ├── position.ts
│       │   ├── ball.ts
│       │   ├── overlays.ts
│       │   ├── catmull.ts
│       │   └── *.test.ts
│       ├── editor/              # the editor experience
│       │   ├── components/
│       │   ├── store.ts         # Zustand
│       │   ├── hooks.ts
│       │   ├── keyboard.ts
│       │   └── *.test.tsx
│       ├── viewer/              # the viewer experience
│       │   ├── components/
│       │   ├── hooks.ts
│       │   └── *.test.tsx
│       ├── court/               # shared SVG court component
│       │   └── Court.tsx
│       ├── queries.ts           # play CRUD against Supabase
│       ├── schemas.ts           # Zod schema for play data
│       └── types.ts
│
├── components/                  # truly cross-feature components
│   └── ui/                      # shadcn/ui copies live here
│       ├── button.tsx
│       ├── dialog.tsx
│       └── ...
│
├── lib/                         # framework-agnostic utilities
│   ├── supabase/
│   │   ├── server.ts
│   │   ├── client.ts
│   │   └── types.generated.ts   # supabase gen types output
│   ├── query-keys.ts
│   ├── utils.ts                 # cn(), formatDate(), etc.
│   └── tokens.ts                # design tokens consumed in JS
│
├── styles/
│   └── tokens.css               # CSS variables
│
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   ├── 0002_plays_indexes.sql
│   │   └── ...
│   ├── seed.sql
│   └── config.toml
│
├── tests/
│   └── e2e/                     # Playwright specs
│
├── public/                      # static assets
│
├── biome.json
├── tsconfig.json
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
└── README.md
```

### 13.1 Why this structure

- **`app/` is thin.** Route files are mostly imports and layout glue. The real code lives in `features/`.
- **`features/` are siloed.** Each feature owns its components, hooks, queries, types. Cross-feature imports are explicit and rare.
- **`features/play/` has sub-modules** because the play system is the largest module by far. The `engine/`, `editor/`, `viewer/`, and `court/` sub-folders create natural seams.
- **`components/ui/` only holds shadcn primitives.** Higher-level components belong to their feature.

### 13.2 Import discipline

A few rules for Claude Code:

- `features/<feature>/` may import from `lib/`, `components/ui/`, and from itself
- `features/<feature>/` may **not** import from another feature directly — if shared logic is needed, lift it to `lib/`
- `lib/` may not import from `features/`
- `app/` may import from `features/`, `components/`, and `lib/`
- The animation engine (`features/play/engine/`) must not import React

These rules are enforced by Biome's import rules and TypeScript path aliases.

### 13.3 Path aliases

```json
// tsconfig.json compilerOptions.paths
{
  "@/*": ["./*"],
  "@/features/*": ["./features/*"],
  "@/lib/*": ["./lib/*"],
  "@/components/*": ["./components/*"]
}
```

Imports look like `import { Court } from '@/features/play/court/Court'` — never relative paths beyond the current folder.

---

## 14. Configuration and environment variables

### 14.1 Environment files

```
.env.local          # local dev secrets, gitignored
.env.example        # template, committed
```

### 14.2 Required variables

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Public anon key — safe in browser |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Never exposed to client; only used in admin scripts |
| `SENTRY_DSN` | client + server | Optional; if unset, Sentry is disabled |
| `NEXT_PUBLIC_APP_URL` | client | For absolute URLs in share links |

### 14.3 Type-safe env access

A `lib/env.ts` file uses Zod to validate env vars on startup. Accessing an undefined or malformed variable fails fast, not silently.

---

## 15. Deployment and operations

### 15.1 Deployment topology

- **Frontend:** Vercel (auto-deploy on push to `main` for production, on push to any branch for preview)
- **Backend:** Supabase Cloud (one project, `prod`)
- **DNS:** Vercel-managed; custom domain when ready

### 15.2 CI/CD

GitHub Actions on push:
1. `biome check .` — lint + format
2. `tsc --noEmit` — typecheck
3. `vitest run` — unit tests
4. (Optional, slower) `playwright test` — E2E against a preview deploy

A failed CI run blocks merging. Vercel deploys are independent and will deploy even if CI fails — that's a tradeoff for solo dev velocity. (Future: configure Vercel to wait for CI green.)

### 15.3 Database migrations

Local: `supabase db reset` rebuilds from migrations + seed.
Production: `supabase db push` applies new migrations. Run manually after merging, not from CI (too risky for a solo project without staging).

### 15.4 Monitoring

- **Sentry** for client and server errors (free tier handles our volume)
- **Supabase dashboard** for query performance, slow queries, storage usage
- **Vercel dashboard** for deploys and edge function logs
- **No custom metrics in v2.** Add Posthog or similar in v1.1 if needed.

### 15.5 Backups

Supabase handles automatic daily backups. We don't add a second backup system in v2. Document the recovery path in a runbook (future doc).

---

## 16. Performance budgets

These are concrete numbers Claude Code should respect.

| Surface | Budget | How measured |
|---|---|---|
| Mobile viewer JS bundle (gzipped) | <150 KB | Vercel analytics |
| Mobile viewer Time to Interactive | <2.5s on Pixel 6a, 3G fast | Lighthouse |
| Editor first paint | <1.5s on desktop wired | Lighthouse |
| Animation frame rate (viewer) | 60fps on Pixel 6a; 30fps floor | DevTools performance |
| Animation frame rate (editor) | 60fps on desktop | DevTools performance |
| Database queries per page load | ≤3 for typical pages | Supabase dashboard |

When a budget is exceeded, we fix it before adding the next feature. This is a hard rule.

---

## 17. Things we deliberately don't have

These are not omissions; they are decisions. They keep v2 focused.

- **No GraphQL.** Supabase + TanStack Query is sufficient.
- **No tRPC.** Same reason — we don't need an RPC abstraction; we have a typed database client.
- **No monorepo.** Single repo, single package. If we ever extract the play engine for reuse, then we monorepo.
- **No microservices.** It's one Next.js app.
- **No Storybook.** Solo dev; we look at components in the app itself.
- **No design system documentation site.** The tokens file and shadcn components are the design system. Document in code.
- **No internationalization (i18n) plumbing.** English only in v2. Adding it later is straightforward with `next-intl`.
- **No PWA / service worker.** The viewer doesn't need offline support in v2. v1.1 candidate.
- **No native apps.** Browser only.
- **No SSR for the play viewer.** It's a client-side experience after first paint.

---

## 18. Path from v2 to v1.1 (AI features)

v2 architecture is intentionally compatible with the AI features planned for v1.1. The AI integration will:

- Be a new feature folder: `features/play/ai/`
- Add a server route handler (`app/api/ai/generate/route.ts`) that accepts a prompt + optional image, calls the model, validates the returned JSON against the play Zod schema, and either returns the validated play or an error
- Add UI affordances inside the editor (a "Generate" button + a prompt modal)
- Store AI-related metadata in `play_versions.change_source = 'ai'` (already in the schema per `DATA_MODEL.md`)

No schema migrations are needed to enable AI features. No frontend architecture changes either. This is by design.

The model and prompt strategy are deferred to `AI_INTEGRATION.md`.

---

## 19. Open questions

These are not blockers; they are things to revisit during implementation:

- **shadcn/ui Tailwind v4 compatibility.** shadcn was originally built for Tailwind v3. By the time we build, compatibility should be solid; verify before scaffolding.
- **Biome's React Hooks rules.** Biome's lint coverage of React hooks is improving but may still lag ESLint's. If we hit gaps, add ESLint with just the React Hooks plugin.
- **Supabase JS client v2 vs v3.** Use the latest stable.
- **Whether to use Next.js Server Actions for create/edit play.** Currently I'm saying "no, use the Supabase client from the browser." Reconsider if it simplifies optimistic UI later.

---

*End of ARCHITECTURE.md v0.1. Next document: `AI_INTEGRATION.md`, which specifies the v1.1 AI features and how they slot into this architecture.*
