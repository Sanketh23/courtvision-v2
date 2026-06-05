# CourtVision — Roadmap

**Status:** Draft v0.1
**Owner:** Sanketh
**Last updated:** 2026-04-30
**Depends on:** all prior docs

---

## 1. How to read this roadmap

This document sequences v2 into milestones. Each milestone is a **vertical slice** — something that works end-to-end, not a horizontal layer. We never have a milestone like "build all the database tables" followed by "build all the UI." Instead, each milestone delivers a thin but complete path through the stack.

The reason: per `PRD.md` principle 6, no feature ships until its full flow works. Vertical slices let you *see* progress and catch integration problems early, which is exactly what was missing in v1's vibecoded approach.

Each milestone has:
- **Goal** — the one-sentence outcome
- **Scope** — what's included
- **Definition of done** — concrete, checkable criteria
- **Explicitly not included** — to prevent scope creep within the milestone

The milestones are ordered by dependency and by risk. We build the riskiest, most-differentiating thing — the animation engine and editor — early, not last, because that's where the project succeeds or fails. We don't want to discover animation problems after building all the easy CRUD around it.

This roadmap covers **v2 only**. v1.1 (AI features) is a separate effort sequenced in `AI_INTEGRATION.md` §13.

There are no calendar dates. The brief is "however long it takes — do it right." Estimates are in relative effort, not weeks, since solo availability varies.

---

## 2. Milestone overview

| # | Milestone | Goal | Relative effort |
|---|---|---|---|
| M0 | Project foundation | Repo, tooling, deploy pipeline, empty app that builds and ships | S |
| M1 | Auth + teams | A coach can sign up, create a team, and a player can join via code | M |
| M2 | The animation engine | Pure functions that interpolate a hard-coded play correctly | M |
| M3 | The viewer | A hard-coded play animates smoothly on mobile and desktop | M |
| M4 | Play persistence | Plays save to and load from the database | S |
| M5 | The editor — positions & motion | A coach can place players and create keyframed motion | L |
| M6 | The editor — actions | A coach can add passes, screens, cuts, etc. | L |
| M7 | The playbook | Browse, search, filter, categorize plays | M |
| M8 | Versioning | Every save creates a version; coach can restore | M |
| M9 | Polish & player experience | Studied state, mobile refinement, empty states, error handling | M |
| M10 | Hardening & launch prep | Performance budgets met, E2E tests, real-device testing | M |

S = small, M = medium, L = large. The two L milestones (M5, M6) are the editor — the heart of the product and the bulk of the work.

---

## 3. M0 — Project foundation

**Goal:** A deployed, empty Next.js app with all tooling configured, that you can push to and see live.

### Scope
- Initialize Next.js 15 + TypeScript (strict) project with pnpm
- Configure Biome (lint + format)
- Configure Tailwind v4 + `tokens.css` with the design tokens from the wireframes
- Set up shadcn/ui and pull in base components (button, dialog, input, dropdown)
- Set up the folder structure per `ARCHITECTURE.md` §13 (empty feature folders with placeholder index files)
- Configure path aliases
- Create the Supabase project; set up local dev with `supabase start`
- Configure environment variables + `lib/env.ts` validation
- Set up GitHub repo, GitHub Actions CI (lint, typecheck — no tests yet)
- Connect Vercel for auto-deploy
- Set up Sentry (can be a stub if keys aren't ready)
- A single placeholder page that renders "CourtVision" and confirms Tailwind + tokens work

### Definition of done
- [ ] `pnpm dev` runs the app locally
- [ ] `pnpm build` succeeds
- [ ] `biome check .` passes
- [ ] `tsc --noEmit` passes
- [ ] Pushing to `main` deploys to Vercel and the live URL renders the placeholder
- [ ] `supabase start` runs a local database
- [ ] The folder structure matches `ARCHITECTURE.md` §13

### Explicitly not included
- Any real features
- Any database tables (those come with the features that need them)
- Tests (no logic to test yet)

---

## 4. M1 — Auth + teams

**Goal:** A coach can sign up, create a team, get an invite code, and a player can join the team using that code.

### Scope
- Database: `teams` and `team_memberships` tables + RLS policies (per `DATA_MODEL.md`)
- Supabase Auth wired up (email + password)
- Server + browser Supabase client helpers (`lib/supabase/`)
- `requireAuth()` server helper and `useAuth()` client hook
- Screens: sign in, sign up, join team, empty/welcome state, create team (per `UI_WORKFLOWS.md` §2–§4)
- Invite code generation (the format from `UI_WORKFLOWS.md` §2.4)
- Role context (`useCurrentRole()`) per `ARCHITECTURE.md` §9.4
- Routing/redirect logic: no team → /welcome; authed coach with team → /playbook
- Password reset flow

### Definition of done
- [ ] A new user can sign up and is routed to /welcome
- [ ] That user can create a team and sees the invite code
- [ ] A second user can use the code to join as a player
- [ ] RLS verified: a player cannot read another team's data; a coach cannot read another team's plays
- [ ] Sign out works; sessions persist across refresh
- [ ] Password reset email flow works end-to-end
- [ ] The "no team yet" and "create team" screens match the wireframes
- [ ] Playwright test: sign up → create team → (second user) join via code

### Explicitly not included
- Any plays (the playbook is empty; that's fine)
- Team member management UI (deferred to M9 or wherever it fits)
- Email verification (deferred to v1.1)

---

## 5. M2 — The animation engine

**Goal:** Pure TypeScript functions that, given a play JSON, correctly compute player and ball positions at any time `t`. No UI yet.

### Scope
- The play Zod schema (`features/play/schemas.ts`) — the single source of truth
- Catmull-Rom interpolation (`features/play/engine/catmull.ts`)
- `positionAt(path, t)` (`engine/position.ts`)
- `ballPositionAt(states, t)` (`engine/ball.ts`)
- Ball state regeneration from actions (the pure function flagged in `AI_INTEGRATION.md` §14)
- `overlaysFromActions(actions)` (`engine/overlays.ts`)
- Semantic validation helpers (slot refs valid, times increasing, etc.)
- A set of fixture plays (hand-authored JSON) used as test data
- Comprehensive unit tests for all of the above

### Definition of done
- [ ] The play schema validates the fixture plays and rejects malformed ones
- [ ] `positionAt` returns correct positions at keyframes (exact) and between them (smooth)
- [ ] Catmull-Rom produces smooth curves; verified with snapshot tests
- [ ] Edge cases handled: t before first keyframe, t after last, single-keyframe paths
- [ ] Ball regeneration produces consistent states from a fixture play's actions
- [ ] All engine functions are pure (no React, no side effects) — enforced by no React import
- [ ] Test coverage of the engine is thorough (this is the most-tested module)

### Explicitly not included
- Any rendering (this milestone is pure logic)
- The editor (M5/M6)
- Database persistence (M4)

This milestone is where the v1 failure gets fixed. If the engine is right, the rest follows.

---

## 6. M3 — The viewer

**Goal:** A hard-coded fixture play animates smoothly in the viewer, on both mobile and desktop, with working transport controls.

### Scope
- The shared SVG `Court` component (`features/play/court/Court.tsx`)
- The viewer renderer consuming the engine via a `usePlayEngine` hook
- The `requestAnimationFrame` loop (per `ANIMATION_DESIGN.md` §5)
- Player tokens, ball, and action overlays rendered as HTML/SVG layers
- Player motion paths shown clearly (per `UI_WORKFLOWS.md` §13.3)
- Transport controls: play/pause, scrubber, speed (0.5×/1×/2×), loop
- The steps list (companion to the animation)
- Mobile viewer layout (`UI_WORKFLOWS.md` §8) and desktop viewer layout (§9)
- Auto-pause on completion when loop is off

### Definition of done
- [ ] A fixture play animates smoothly at 60fps on desktop
- [ ] The same play animates at 60fps on a real Pixel 6a (or equivalent mid-range phone)
- [ ] Scrubbing is smooth and responsive
- [ ] Speed changes work; loop works
- [ ] Action overlays (pass arrow, screen mark, shot arc) appear at the right times
- [ ] Player paths are visible and the traveled/remaining distinction renders
- [ ] The steps list highlights the current action as the play scrubs
- [ ] Tapping a step jumps the scrubber to that time
- [ ] Both mobile and desktop layouts match the wireframes
- [ ] Mobile viewer JS bundle is under the 150 KB gzipped budget

### Explicitly not included
- Editing (this is read-only)
- Loading plays from the database (still hard-coded fixtures — M4 adds persistence)
- The "studied" feature (M9)

At the end of M3, you can *show someone an animated play*. That's a real, demoable milestone.

---

## 7. M4 — Play persistence

**Goal:** Plays save to and load from the database. The viewer now shows a real play fetched from Supabase.

### Scope
- Database: `plays` table + RLS + indexes + triggers (per `DATA_MODEL.md`)
- Play CRUD query functions (`features/play/queries.ts`)
- TanStack Query setup + query keys
- The viewer loads a play by ID from the database
- A minimal "create play" path that inserts a fixture-like play (full editor comes in M5)
- Generated Supabase types committed

### Definition of done
- [ ] A play can be inserted into the database and fetched back
- [ ] The fetched play validates against the Zod schema
- [ ] The viewer renders a database-loaded play identically to a fixture
- [ ] RLS verified: players see only published plays; coaches see all their team's plays
- [ ] The `duration_seconds` denormalization trigger works
- [ ] Query caching works (refetch on focus, etc.)

### Explicitly not included
- The full editor (M5)
- Versioning (M8)
- The playbook browse view (M7)

---

## 8. M5 — The editor: positions & motion

**Goal:** A coach can open the editor, place 5 players in a formation, and create keyframed motion by scrubbing and dragging. The core creative act.

### Scope
- The editor route and layout (`UI_WORKFLOWS.md` §7)
- The editor Zustand store (selection, edit buffer, timeline cursor, undo/redo)
- The court canvas with draggable players
- Drag-to-create-keyframe interaction (per `ANIMATION_DESIGN.md` §8.2)
- The player list rail with selection
- The properties rail (name, category, formation, duration, tags, description)
- The timeline with the master scrubber and per-slot lanes (collapsible)
- "Show paths" toggle (default on)
- Undo/redo (in-memory)
- Keyboard shortcuts (per `UI_WORKFLOWS.md` §7.9)
- New play flow with formation picker (per `UI_WORKFLOWS.md` §7.10)
- Save (creates/updates the play in the database)
- Desktop-only guard (editor needs ≥1024px)

### Definition of done
- [ ] A coach can create a new play, pick a formation, and see 5 players placed
- [ ] Scrubbing to a time and dragging a player creates a keyframe at that time
- [ ] The created motion animates smoothly when previewed
- [ ] Dragging an existing keyframe dot moves that keyframe's position
- [ ] Dragging a keyframe in the timeline lane moves its time
- [ ] Undo/redo work for all motion operations
- [ ] Keyboard shortcuts work
- [ ] Duration auto-extends when keyframes exceed it
- [ ] Save persists and the play reloads correctly
- [ ] "Show paths" toggle works and persists per-coach
- [ ] Editing feels fast — a simple 2-player movement takes well under a minute

### Explicitly not included
- Actions (passes, screens, etc.) — that's M6
- Versioning UI (M8)
- The playbook (M7)

This is the largest, riskiest milestone. The interaction model (selection-drives-action, drag-to-keyframe) is novel for this app and needs real iteration. Budget for that.

---

## 9. M6 — The editor: actions

**Goal:** A coach can add the six action types (pass, screen, cut, dribble, handoff, shot) on top of player motion.

### Scope
- The "Add action" rail with the six action buttons
- Selection-drives-action logic (select players → click action → action created)
- Each action type's creation flow and required fields
- Action overlays rendering live in the editor as actions are added
- Actions on the timeline lanes (draggable to change time)
- Editing and deleting actions
- Ball state regeneration triggered when pass/handoff/shot actions change
- The steps list reflecting actions in order

### Definition of done
- [ ] All six action types can be created via selection + button
- [ ] Each action renders its correct overlay (per `ANIMATION_DESIGN.md` §4.1)
- [ ] The ball moves correctly during passes, handoffs, and shots
- [ ] Actions appear on the timeline lanes and can be moved
- [ ] Actions can be edited and deleted
- [ ] Ball states regenerate automatically and correctly when actions change
- [ ] A full play (e.g. pass → screen → cut → shot) builds and animates correctly
- [ ] Undo/redo work for action operations

### Explicitly not included
- AI-assisted action creation (v1.1)
- Defensive players (out of v2 scope)

At the end of M6, the editor is feature-complete. A coach can build any half-court play CourtVision supports.

---

## 10. M7 — The playbook

**Goal:** A coach can browse, search, filter, and categorize their plays. Players can browse the team's published plays.

### Scope
- Playbook browse — desktop coach view (`UI_WORKFLOWS.md` §5)
- Playbook browse — mobile player view (`UI_WORKFLOWS.md` §6)
- Play thumbnails (generated from data on the fly — `UI_WORKFLOWS.md` §5.5)
- Category filter, status filter, tag filter
- Search by name
- Sort options
- "Recently edited" strip (desktop) / "Recently added" section (mobile)
- Grid and list views (desktop)
- Play status management (draft / published / archived) from the editor or play tile
- Empty states

### Definition of done
- [ ] Coaches see all their team's plays; players see only published ones
- [ ] Thumbnails render correctly from play data
- [ ] Filters (category, status, tags) work and combine correctly
- [ ] Search by name works
- [ ] Sort options work
- [ ] The "recently added/edited" surfaces work
- [ ] Grid/list toggle works (desktop)
- [ ] Empty states render for zero-play teams
- [ ] Mobile and desktop layouts match the wireframes
- [ ] Page load uses ≤3 database queries

### Explicitly not included
- Versioning UI (M8)
- Favorites (out of v2 scope)
- Bulk operations

---

## 11. M8 — Versioning

**Goal:** Every play save creates an immutable version; a coach can view history and restore any version.

### Scope
- Database: `play_versions` table + trigger that snapshots on `plays.data` change (per `DATA_MODEL.md` §6)
- Version history modal (`UI_WORKFLOWS.md` §10)
- Restore flow (creates a new version with `change_source = 'restore'`)
- Version preview (scrub a past version before restoring)
- Auto-generated change summaries

### Definition of done
- [ ] Every save creates a version row
- [ ] Version history modal lists versions newest-first
- [ ] A coach can preview a past version (read-only animation)
- [ ] Restore creates a new version and reloads the editor with the restored state
- [ ] Earlier versions are never destroyed by a restore
- [ ] `change_source` is recorded correctly (manual / restore)

### Explicitly not included
- AI-source versions (v1.1, but the schema field exists)
- Version diffing UI (nice-to-have; defer unless quick)
- Version pruning (not in v2)

---

## 12. M9 — Polish & player experience

**Goal:** Round off the experience: studied tracking, team management, refined mobile, comprehensive empty/error states.

### Scope
- Database: `play_progress` table + RLS
- "Mark studied" in the viewer; unstudied indicators in the mobile playbook
- Team/member management screen (`UI_WORKFLOWS.md` §11)
- Account settings screen (`UI_WORKFLOWS.md` §12)
- Invite code regeneration, copy, share
- Loading skeletons throughout
- Error states (network errors, 404s, unauthorized) per `UI_WORKFLOWS.md` §13.5
- Mobile refinements (pull to refresh, touch scrubbing)
- Accessibility pass (focus states, aria labels, screen reader court description)

### Definition of done
- [ ] Players can mark plays studied; unstudied plays show the indicator
- [ ] Coaches can manage team members (view, remove)
- [ ] Invite code can be regenerated and shared
- [ ] Account settings work (edit profile, change password, sign out)
- [ ] All list views have loading skeletons
- [ ] Error states render gracefully and offer a path forward
- [ ] Pull-to-refresh works on mobile
- [ ] Accessibility audit passes (keyboard nav, focus, labels)

### Explicitly not included
- Notifications (none in v2)
- Theme switcher (v1.1)
- Bookmark feature (cut if non-trivial, per `UI_WORKFLOWS.md` §15)

---

## 13. M10 — Hardening & launch prep

**Goal:** Meet all performance budgets, pass E2E tests, verify on real devices, and prepare for first real coaches.

### Scope
- Hit every performance budget in `ARCHITECTURE.md` §16
- Real-device testing (Pixel 6a or equivalent) for the viewer
- The three E2E test flows (per `ARCHITECTURE.md` §11.3)
- Cross-browser check (Chrome, Safari, Firefox; iOS Safari, Android Chrome)
- Error tracking confirmed working (Sentry receiving events)
- Basic legal: privacy policy and terms pages (stub is acceptable for first users; real before wider launch)
- A minimal landing/marketing page (can be one page)
- Production Supabase hardening: confirm RLS on every table, no public tables
- A runbook doc: how to deploy, how to run migrations, how to restore from backup

### Definition of done
- [ ] All performance budgets met and measured
- [ ] Viewer runs at target frame rate on a real mid-range phone
- [ ] All three E2E flows pass
- [ ] App works on the target browsers
- [ ] Sentry receives and reports errors
- [ ] Privacy policy and terms exist (even if minimal)
- [ ] Every database table has RLS enabled and verified
- [ ] A coach who isn't you can sign up and create a play without help

### Explicitly not included
- Payment / billing (post-v2)
- Marketing site beyond one page
- App store presence (web only)

When M10 is done, v2 is launched. v1.1 (AI features) begins after, per `AI_INTEGRATION.md` §13.

---

## 14. Sequencing logic and dependencies

Why this order:

- **M0 → M1** is foundational; nothing works without auth and teams.
- **M2 → M3** front-loads the riskiest, most-differentiating work: the animation. We prove the engine and viewer with hard-coded data *before* building the editor or persistence. If animation can't be made smooth, we want to know in M2/M3, not M8.
- **M4** slots persistence in once the viewer exists, so we immediately see real plays.
- **M5 → M6** is the editor, split into motion then actions. It's the bulk of the work and depends on the engine (M2) and persistence (M4) being solid.
- **M7** (playbook) depends on having plays to browse (M4+).
- **M8** (versioning) depends on the editor saving (M5/M6).
- **M9** is breadth polish; it depends on the core flows existing.
- **M10** is hardening; it depends on everything.

The critical insight: **the editor (M5/M6) is the biggest risk and the biggest work, but it comes after the engine and viewer are proven.** This avoids building a beautiful editor on top of an animation system that turns out not to work — which is essentially what happened in v1.

### 14.1 A demoable artifact at each stage

| After | You can show someone... |
|---|---|
| M1 | Sign up, make a team, join a team |
| M3 | A play animating smoothly (hard-coded) |
| M4 | A play animating from the database |
| M5 | Building player motion in the editor |
| M6 | Building a complete play with passes and screens |
| M7 | A full playbook to browse |
| M8 | Editing, reverting, version history |
| M9 | The polished player experience |
| M10 | A product real coaches can use |

This matters for solo morale and for early feedback. You're never more than one milestone away from something you can put in front of a coach.

---

## 15. What could go wrong (risk register)

| Risk | Likelihood | Mitigation |
|---|---|---|
| Animation isn't smooth on low-end phones | Medium | Proven early in M3 on a real device; the whole stack (HTML transforms, not canvas) is chosen for this |
| The editor interaction model (drag-to-keyframe) is confusing | Medium | M5 budgets for iteration; test with a real coach early |
| Catmull-Rom curves look weird for some plays | Low | The `linear` interp escape hatch exists; add waypoints to control shape |
| Scope creep back toward the v1 platform | Medium | This roadmap and `PRD.md` §5.2 are the guardrails; resist adding games/stats |
| Solo burnout on the large editor milestones | Medium | M5/M6 are explicitly the hard part; pace accordingly, lean on Claude Code |
| Supabase RLS misconfiguration leaks data | Low | RLS verified in M1, M4, M7, and audited in M10 |
| Performance budgets missed late | Low | Budgets checked continuously, not just in M10 |

---

## 16. Definition of done for v2 overall

v2 is complete when:
- All ten milestones meet their definitions of done
- The success criteria in `PRD.md` §7 are met
- A coach who isn't you can sign up, build a smooth animated play, publish it, and have a player view it on their phone — all without your help and without reading documentation

That last criterion is the real test. If a stranger can do that, v2 succeeded.

---

*End of ROADMAP.md v0.1. Next documents: `CONVENTIONS.md` and `CLAUDE.md`.*
