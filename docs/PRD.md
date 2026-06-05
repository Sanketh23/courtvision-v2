# CourtVision — Product Requirements Document (v2)

**Status:** Draft v0.1
**Owner:** Sanketh
**Last updated:** 2026-04-30

---

## 1. Summary

CourtVision is a web-based basketball playbook app. Coaches create animated plays on a desktop editor; coaches and players review them on any device, with a mobile-first viewer experience for players. The product's defining differentiator is the quality of its play animation — coaches should be able to communicate *motion*, not just positions, to their players.

This document describes **v2**, a focused rewrite of an earlier version (also called CourtVision) that grew beyond its intended scope. v2 deliberately constrains itself to the playbook itself. Future modules — games, plans, scouting, stats — are intentionally excluded and will be designed separately when the playbook foundation is solid.

---

## 2. Why v2 exists

The earlier version of CourtVision attempted to be a full coaching operations platform: playbook + roster + schedule + game stats + game plans + scouting + an AI assistant across all of it. Built solo via vibecoding, it suffered from the predictable problem: every feature worked partially, and the central feature — animated plays — was the weakest of all. Plays "animated" by stepping through still frames of player positions; there was no real concept of motion, time, or simultaneous action.

v2 is a deliberate restart with three commitments:

1. **Scope discipline.** v2 is the playbook only. Nothing else.
2. **Animation done right.** The play data model and rendering pipeline are designed for continuous motion from the start, not retrofitted onto a step-list.
3. **Plan first, build second.** Every significant decision is captured in documentation before code is written, and the rest of the documentation is produced before implementation begins.

---

## 3. Users

### 3.1 Primary user — the coach

A basketball coach at any level (youth, high school, AAU, college). The coach is the buyer and the power user. They:

- Create and maintain a playbook of 20–100+ plays
- Spend most of their time in the **play editor** on a desktop or laptop
- Need to communicate plays to players quickly and clearly
- May not be highly technical; the editor must feel like a coaching tool, not a CAD program
- Will judge the product primarily on: how fast can I get a play out of my head and into the app

### 3.2 Secondary user — the player

A player on a coach's team, accessing the team's playbook to study. They:

- Sign in via a team code or invite link
- Use the app primarily on their phone, often briefly (a few minutes between practices)
- Need plays to load instantly and animate smoothly on a mid-tier Android device
- May review the same play many times, so scrubbing and slowing it down matters
- Are not creating or editing — view-only

### 3.3 Out of scope for v2

- **Assistant coaches** as a distinct role with edit permissions. v2 supports `coach` (full access) and `player` (view-only). A future version can add `assistant_coach`.
- **Multi-team coaches** (e.g. a coach managing varsity and JV separately). v2 supports one team per coach. Workaround for now: create separate accounts.
- **Parents, recruiters, opposing scouts** — not addressed.

---

## 4. Problems being solved

For coaches:
- Static diagrams (whiteboards, paper, FastDraw stills) communicate position but not motion. Players see *where* but not *when* or *how*.
- Existing tools that do animate plays (e.g. FastDraw, Just Play) are expensive, often desktop-only, and not designed for player consumption on a phone.
- Drawing plays is slow. A coach needs an editor that's at least as fast as a whiteboard.

For players:
- Plays are easy to forget between practices. There is no good way to review them on a phone.
- Static diagrams in a Google Doc, group chat, or PDF are the typical fallback. They're hard to follow.
- Players need a "watch and re-watch" experience — closer to a video than a document.

---

## 5. v2 scope

### 5.1 In scope

**Authentication & teams**
- Email/password sign up and sign in
- Sign out, password reset
- Create a team (you become the owner/coach)
- Invite players via shareable code or link
- Join a team as a player using a code

**Playbook**
- Create, edit, rename, duplicate, archive, and delete plays
- Categorize plays (offense, defense, BLOB, SLOB, ATO, press break, transition, custom tag)
- Search and filter the playbook
- Browse the playbook on desktop and mobile
- Each play has a name, category, formation label, optional description, optional tags, status (draft / published / archived), and the play data itself

**Play editor (desktop-first)**
- Half-court canvas at a fixed aspect ratio
- Place 5 offensive players on the court with position labels (PG, SG, SF, PF, C — editable)
- Define motion over time: each player has a path from start to end
- Add discrete actions on top of motion: pass, screen, dribble, cut, handoff, shot
- Real timeline with a scrubber, not a step list
- Play / pause / speed control / scrub during editing
- Save, undo, redo

**Play viewer (mobile-first, also works on desktop)**
- Open a play, see it animate
- Play / pause / scrub timeline / change speed (0.25x, 0.5x, 1x, 2x)
- Loop toggle
- Read the play's name, description, and a text-based action timeline (Pass: PG → SG, Screen: PF → SF, etc.) alongside the animation
- "Studied" toggle (light feature — player marks they've reviewed a play)

**Versioning**
- Every save creates a play version (snapshot of the play data)
- View history of a play, restore an old version
- Critical for AI editing later — the coach must always be able to undo an AI change

### 5.2 Out of scope for v2 (explicitly)

- **AI features.** Generation from text, generation from hand-drawn images, AI editing — all deferred to v1.1. The architecture and data model will accommodate them; the UI and integrations won't be built in v2.
- **Defensive players.** Plays are offense-only in v2. The data model will allow for defenders later but the editor and viewer will not support them yet.
- **Full-court plays.** Half-court only.
- **Video upload, breakdown, or video overlay.**
- **Real-time collaboration / live whiteboard.** No two coaches editing the same play simultaneously.
- **Comments, chat, social features.** No interaction between users beyond the team membership boundary.
- **Game plans, schedules, scouting reports, stats, matchup planning, postgame review.** All deferred to future modules.
- **Multi-team management.** One team per coach.
- **Assistant coach role.** Only `coach` and `player` roles in v2.
- **Native iOS or Android apps.** Mobile web only.
- **Payment, subscription, billing.** Free during v2; monetization design happens later.
- **Public play library / sharing plays across teams.** Plays belong to one team.
- **Play export (PDF, image, video).** Out of scope for v2.

### 5.3 Deferred to v1.1 (post-v2 launch)

These are listed separately because they're the next things to build, and v2 architecture must not preclude them:

- AI play generation from text prompt
- AI play generation from uploaded hand-drawn image
- AI play editing ("add a flare screen for the 2", "run this against a 2-3 zone")
- Assistant coach role
- Play export to shareable video or GIF

---

## 6. Design principles

These principles drive every decision; when in doubt, return to them.

1. **Animation is the product.** If we have to choose between adding a feature and making the animation better, we make the animation better. The animation is what makes CourtVision different from a Google Doc with diagrams.

2. **The editor must feel as fast as a whiteboard, ideally faster.** A coach with an idea should be able to get it on screen in under a minute for a simple play. Any UX that requires more than two clicks for a common action is suspect.

3. **The player viewer must work on a $200 Android over hotel WiFi.** Bundle size, image weight, and animation performance are all first-class concerns. We test on real low-end devices.

4. **Manual editing is always available.** Even when AI features ship, every play is fully editable by hand. Nothing is locked behind AI.

5. **The play data model is the source of truth.** Plays are stored as structured JSON, human-readable, designed so an LLM could read and write it. Every renderer (desktop editor, mobile viewer, future export) reads the same data.

6. **No feature ships until the full flow works end-to-end.** A half-built feature is worse than no feature. We do vertical slices, not horizontal layers.

7. **Document the *why*, not just the *what*.** Future-you and Claude Code both need to know why decisions were made. Capture reasoning in commit messages and docs.

8. **Design for the second user, not just the first.** Architecture choices should anticipate the second module (likely game plans) without building it. But never *build* for it speculatively.

---

## 7. Success criteria

v2 is "done" when:

- A coach can sign up, create a team, and create a recognizable, smooth-animating play in under 10 minutes their first time, with no documentation
- A player can join a team via code on their phone and watch a play animate smoothly within 5 minutes of receiving the link
- The play editor handles a 4-action play (e.g. pass → screen → cut → shot) without any janky behavior
- The mobile viewer renders at 60fps on a mid-range Android (concretely: a Pixel 6a or equivalent)
- A coach can edit a play, save, and the new version is reflected for players within seconds
- All v2 in-scope features are implemented, manually tested, and documented
- The codebase is clean enough that adding AI generation in v1.1 doesn't require schema migrations

v2 is **not** trying to:
- Be feature-competitive with FastDraw or Just Play (we're a smaller, more focused product)
- Have a marketing site, pricing page, or onboarding flow polished enough for paid customers
- Handle 10,000 users (we're optimizing for "works great for the first 100 coaches who try it")

---

## 8. Constraints and context

- **Sole developer.** All implementation is by Sanketh, with Claude Code as the primary coding assistant. Documentation must be detailed enough that Claude Code can implement from it without constant hand-holding.
- **Long-term real product.** v2 is the foundation for something Sanketh wants real coaches to use. Architecture and data model decisions are made with that horizon in mind.
- **Existing code is discarded.** The previous CourtVision codebase is not reused. The Supabase project may be reused or recreated; that's a decision in `ARCHITECTURE.md`.
- **No fixed deadline.** The brief is "however long it takes — do it right." This is interpreted as: do not rush, but do not over-engineer either. v2 should be buildable in roughly 2–4 months of focused solo work, depending on how much time per week.

---

## 9. Open questions (to resolve in subsequent docs)

These are not unresolved philosophy — they're concrete decisions deferred to specific later documents:

- **Tech stack.** Frontend framework, animation library, hosting. → `ARCHITECTURE.md`
- **Play data model schema.** The single most important technical decision in this project. → `DATA_MODEL.md`
- **Animation rendering technology.** SVG vs Canvas vs HTML/CSS+transforms. → `ANIMATION_DESIGN.md`
- **Database schema.** Postgres tables, RLS policies, indexes. → `DATA_MODEL.md`
- **AI integration approach.** Model, prompts, schema, guardrails. → `AI_INTEGRATION.md` (deferred)

---

## 10. Glossary

Terms used throughout the docs, defined once here so Claude Code and future-Sanketh share vocabulary:

- **Play** — a single offensive sequence; the core unit of content in CourtVision
- **Action** — a discrete event within a play (pass, screen, cut, dribble, handoff, shot)
- **Frame / keyframe** — a moment in time within a play; positions and actions are anchored to keyframes
- **Formation** — the starting configuration of the 5 offensive players (e.g. "Horns", "1-4 high")
- **Playbook** — a team's full collection of plays
- **Team** — a group consisting of one coach (owner) and zero or more players
- **Membership** — the relationship between a user and a team, with a role (`coach` or `player`)
- **Editor** — the desktop-first interface where a coach creates and edits plays
- **Viewer** — the mobile-first interface where coaches and players watch plays animate

---

*End of PRD v0.1. Next document: `DATA_MODEL.md`, where the play schema is designed.*
