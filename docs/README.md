# CourtVision — Documentation

Planning and design documentation for CourtVision v2, a basketball playbook app where coaches create animated plays and players study them.

These docs are written to be handed to Claude Code for implementation. **Start with `CLAUDE.md`** — it's the entry point and orients you to everything else.

## Reading order

1. **[CLAUDE.md](./CLAUDE.md)** — entry point; orientation and hard guardrails
2. **[PRD.md](./PRD.md)** — product definition, users, scope
3. **[DATA_MODEL.md](./DATA_MODEL.md)** — play schema + database schema (most important technical doc)
4. **[ANIMATION_DESIGN.md](./ANIMATION_DESIGN.md)** — how data becomes smooth motion
5. **[UI_WORKFLOWS.md](./UI_WORKFLOWS.md)** — every screen, with wireframes
6. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — tech stack, structure, boundaries
7. **[AI_INTEGRATION.md](./AI_INTEGRATION.md)** — v1.1 AI features, designed ahead
8. **[ROADMAP.md](./ROADMAP.md)** — milestone sequence (M0–M10)
9. **[CONVENTIONS.md](./CONVENTIONS.md)** — coding conventions

## Wireframes

The `wireframes/` folder contains SVG wireframes for the four highest-information screens, referenced from `UI_WORKFLOWS.md`:
- `auth-screens.svg`
- `empty-state-create-team.svg`
- `play-editor-desktop.svg`
- `play-viewer-mobile.svg`

## The one-paragraph summary

CourtVision v2 is a deliberately-scoped rewrite. v1 sprawled into a full coaching platform and its core feature — play animation — ended up weak because the data model couldn't represent motion. v2 is the playbook only: coaches build plays as continuous keyframed motion in a desktop editor; players watch them animate on their phones. AI generation and editing are designed-ahead but deferred to v1.1. The animation engine and data model are the foundation, built and proven before the editor on top of them.

## Status

All docs are v0.1 — first complete drafts, reviewed and approved during planning. They should be treated as living documents and kept current as implementation reveals new decisions.
