# CourtVision — Conventions

**Status:** Draft v0.1
**Owner:** Sanketh
**Last updated:** 2026-04-30
**Depends on:** `ARCHITECTURE.md`

---

## 1. Purpose

This document defines the coding conventions for CourtVision v2. Its primary audience is Claude Code (and future-you). Consistency matters more than any individual rule here — when in doubt, match what already exists in the codebase.

These are conventions, not laws. But deviating should be a conscious choice with a reason, not an accident.

---

## 2. Naming

### 2.1 Files and folders

- **Folders:** kebab-case — `play-engine/`, `team-members/`
- **React components:** PascalCase files — `Court.tsx`, `PlayEditor.tsx`
- **Non-component TS files:** kebab-case — `query-keys.ts`, `use-play-engine.ts`
- **Test files:** same name + `.test` — `position.test.ts`, `Court.test.tsx`
- **Hooks:** `use-` prefix, kebab-case file, camelCase export — file `use-auth.ts`, export `useAuth`
- **Zod schemas:** `*.schema.ts` or grouped in `schemas.ts` per feature

### 2.2 Variables and functions

- **Variables/functions:** camelCase — `positionAt`, `currentPlay`
- **Components:** PascalCase — `PlayViewer`
- **Constants (module-level, truly constant):** UPPER_SNAKE_CASE — `COURT_WIDTH`, `MAX_KEYFRAMES`
- **Types/interfaces:** PascalCase — `Play`, `Keyframe`, `PlayGenerator`
- **Booleans:** prefix with `is`/`has`/`should`/`can` — `isPlaying`, `hasActions`, `canEdit`
- **Event handlers:** `handle` prefix — `handlePlayerDrag`, `handleSave`
- **Event handler props:** `on` prefix — `onPlayerDrag`, `onSave`

### 2.3 Domain vocabulary

Use the glossary from `DATA_MODEL.md` §2 consistently. Specifically:
- A "play" is a play, never a "diagram" or "drawing"
- A "slot" is a player slot; a "player" can mean a slot or a team member (use context or prefix: `playerSlot` vs `teamMember`)
- An "action" is a discrete event (pass, screen, etc.), never a "step" in code (though the UI says "Steps" to users)
- A "keyframe" is a waypoint, never a "point" or "node" in code
- The "editor" and the "viewer" are distinct; don't conflate them

Consistency here matters because the same words appear in the schema, the AI prompts, and the UI.

---

## 3. TypeScript

- `strict: true` and `noUncheckedIndexedAccess: true` (per `ARCHITECTURE.md` §4)
- **No `any`.** Use `unknown` and narrow, or define the type.
- Prefer `type` for unions/composites; `interface` only for extendable object shapes.
- Derive types from Zod schemas with `z.infer<>` rather than hand-writing duplicate types.
- Use `as const` for literal tuples and config objects.
- Avoid type assertions (`as X`) except at trust boundaries (e.g. after Zod validation). Comment why when used.
- Function return types: explicit on exported functions, inferred on local ones.

---

## 4. React

- **Function components only.** No classes.
- **One component per file** for anything non-trivial. Small helper components can share a file with their parent.
- **Props:** define a `type Props = { ... }` above the component; destructure in the signature.
- **Avoid prop drilling beyond 2 levels.** Lift to a hook, context (sparingly), or Zustand (editor only).
- **No business logic in components.** Components render and wire events; logic lives in hooks, queries, or the engine.
- **Effects are a last resort.** Prefer derived state and event handlers. If you write a `useEffect`, justify it in a comment.
- **The per-frame animation loop bypasses React** (per `ANIMATION_DESIGN.md` §5.2). This is the one sanctioned place to write to the DOM directly via refs. Document it where it happens.

### 4.1 Component file structure

```tsx
// 1. imports
// 2. types (Props and any local types)
// 3. the component
// 4. small local sub-components (if any)
// 5. local helpers (if any)
```

---

## 5. State management

Follow `ARCHITECTURE.md` §7:
- **Server data → TanStack Query.** Never fetch in `useEffect`.
- **Editor state → the editor Zustand store.** One store, scoped to the editor route.
- **Everything else → React `useState`/`useReducer`.**
- **Auth/role → React Context** (the one good use of context here).

Don't reach for Zustand outside the editor. Don't put server data in Zustand.

---

## 6. Data access

- All Supabase access goes through typed query functions in `features/<feature>/queries.ts` (per `ARCHITECTURE.md` §8.3).
- Components never import the Supabase client directly. They call query functions or use TanStack Query hooks that wrap them.
- Every query function returns a typed result and handles its own errors (throw or return a Result type — pick one and be consistent; recommended: throw, let TanStack Query handle).
- Validate untrusted data (anything from the network, including the database) against Zod schemas at the boundary.

---

## 7. Styling

- **Tailwind utility classes** for everything (per `ARCHITECTURE.md` §5).
- **Design tokens via CSS variables** — use the token-based Tailwind classes (`text-secondary`, `bg-surface-2`), not raw hex values.
- **No inline `style={}`** except for dynamic values that can't be expressed in Tailwind (e.g. the per-frame `transform` on player tokens, computed positions).
- **`cn()` helper** (clsx + tailwind-merge) for conditional classes.
- **Mobile-first:** write base styles for mobile, layer `md:`/`lg:` for larger screens.
- **No magic numbers in styles** where a token exists.

---

## 8. The animation engine specifically

The engine (`features/play/engine/`) has stricter rules because it's the most critical, most-tested code:

- **No React.** No imports from `react`. Pure functions and types only.
- **No side effects.** Functions take inputs and return outputs. No mutation of inputs.
- **Fully typed.** Every function has explicit input and output types.
- **Tested thoroughly.** Every exported function has tests covering normal cases and edge cases.
- **Documented.** Each function has a brief doc comment explaining what it computes and any non-obvious math (especially Catmull-Rom).
- **Deterministic.** Same input always yields same output. No randomness, no clock reads.

---

## 9. Error handling

- **User-facing errors** get friendly messages (per `UI_WORKFLOWS.md` §13.5), never raw error strings.
- **Unexpected errors** are logged to Sentry.
- **Network errors** offer a retry path.
- **Validation errors** surface at the field level.
- **Don't swallow errors silently.** Catch, handle, and either recover or surface.
- **Throw `Error` objects, not strings.** Include context in the message.

---

## 10. Comments

- **Comment the why, not the what.** `// regenerate ball states because the model's hints are unreliable` is good; `// loop over actions` is noise.
- **Document non-obvious decisions** inline, especially where the code deviates from a convention for a reason.
- **TODO comments** include context: `// TODO(perf): this recomputes on every render; memoize if it shows up in profiling`.
- **Don't comment out code.** Delete it; git remembers.
- The animation math (Catmull-Rom especially) warrants real explanatory comments.

---

## 11. Git and commits

### 11.1 Branching

- `main` is always deployable.
- Feature work happens on branches: `m5-editor-motion`, `m6-actions`, etc. (milestone-prefixed is helpful).
- Merge to `main` via PR (even solo — it gives you a review surface and a CI gate).

### 11.2 Commit messages

Conventional Commits style:
```
feat: add catmull-rom interpolation to play engine
fix: prevent keyframe time from exceeding play duration
refactor: extract ball-state regeneration into pure function
test: add edge cases for positionAt before first keyframe
docs: update data model with team_side field note
chore: bump dependencies
```

- Present tense, imperative mood ("add" not "added")
- Subject line under ~70 chars
- Body (optional) explains why, not what, for non-trivial changes
- Reference the milestone where useful

### 11.3 Commit size

- Commit logically-complete units, not giant dumps.
- A commit should leave the app in a working state (CI green) where practical.

---

## 12. Testing conventions

Per `ARCHITECTURE.md` §11:
- Engine functions: thorough unit tests (this is the priority).
- Zod schemas: round-trip tests with fixtures.
- Components with logic: test the logic, not the markup.
- Three E2E flows in Playwright (per `ARCHITECTURE.md` §11.3).
- Don't test trivial code or styling.
- Test files co-located with source.
- Fixtures (sample plays) live in a shared `fixtures/` location and are reused across engine tests, schema tests, and AI examples.

---

## 13. Imports

- Use path aliases (`@/features/...`), not deep relative paths.
- Respect the import boundaries in `ARCHITECTURE.md` §13.2:
  - Features don't import other features
  - `lib/` doesn't import features
  - The engine doesn't import React
- Order: external packages, then `@/` aliased imports, then relative. Biome enforces ordering.

---

## 14. Accessibility

- All interactive elements keyboard-accessible.
- Icon-only buttons have `aria-label`.
- The court canvas has a descriptive `<title>`.
- Color is never the only signal (status uses text + color, not color alone).
- Visible focus states everywhere.
- Respect `prefers-reduced-motion` for decorative animation (but the play itself still animates — it's the content).

---

## 15. Performance

- Respect the budgets in `ARCHITECTURE.md` §16.
- The animation loop must not allocate objects per frame (reuse, don't create garbage).
- No `getBoundingClientRect()` inside the frame loop.
- Lazy-load the editor (it's desktop-only and heavy); the viewer should be lean.
- Use `React.memo`, `useMemo`, `useCallback` only where profiling shows benefit — not preemptively.

---

## 16. What not to do

A concise list of anti-patterns, several learned from v1:

- Don't store play data as an unstructured/undocumented JSON blob. The schema is the contract.
- Don't model motion as a list of discrete steps/stills. Motion is continuous (per `DATA_MODEL.md`).
- Don't build features outside v2 scope (no games, stats, scouting — per `PRD.md` §5.2).
- Don't fetch data in `useEffect`. Use TanStack Query.
- Don't put access-control logic in the app. RLS is the contract (per `ARCHITECTURE.md` §8.4).
- Don't add dependencies without weighing the solo-maintenance cost.
- Don't pre-stub future features (the path to scope creep).
- Don't bypass the query-function boundary to hit Supabase from a component.
- Don't use `any`.

---

*End of CONVENTIONS.md v0.1. Final document: `CLAUDE.md`.*
