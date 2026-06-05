# CourtVision — AI Integration

**Status:** Draft v0.1 (design-ahead; not built in v2)
**Owner:** Sanketh
**Last updated:** 2026-04-30
**Depends on:** `PRD.md`, `DATA_MODEL.md`, `ARCHITECTURE.md`

---

## 1. What this document is and isn't

This document designs the AI features that are **deferred to v1.1** — they are not built in v2. Its purpose is to ensure v2's data model, schema, and architecture don't make these features painful to add later. By thinking them through now, we avoid the trap that killed v1: bending the foundations around AI prompt-engineering instead of around clean data.

**Read this as a design-ahead spec, not an implementation order.** Nothing here ships until v2 is done and stable.

The AI features in scope for v1.1:
1. **Generate a play from a text prompt** ("Horns set, PG enters to PF, SG flares off a C screen")
2. **Generate a play from a hand-drawn image** (upload a whiteboard/paper diagram → editable animated draft)
3. **Edit an existing play with AI** ("add a flare screen for the 2", "run this against a 2-3 zone")

What's explicitly out of scope even for v1.1:
- A general "assistant" that answers questions across team data (this was in v1; it's cut — see `PRD.md`)
- AI-suggested counters or defensive reads
- AI scouting or opponent analysis
- Auto-generated commentary or coaching tips

---

## 2. Core principle: the LLM reads and writes the play schema

The single most important design decision is this: **the AI's only job is to produce or modify a valid play JSON document** (per `DATA_MODEL.md` §3). It does not draw, animate, or render anything. It emits structured data, that data is validated against the Zod schema, and then the existing renderer animates it.

This means:
- The AI feature reuses 100% of the existing rendering pipeline
- AI output is just data — fully editable by hand afterward, like any play
- Validation is a hard gate: malformed AI output never reaches the database
- There is no "AI mode" in the renderer; an AI-generated play is indistinguishable from a hand-made one once created

This is why `DATA_MODEL.md` insisted on human-readable, semantically-named JSON with stable slot IDs and a fixed coordinate system. Those choices pay off here.

---

## 3. Why v2's data model makes this tractable

Recapping the AI-readiness properties from `DATA_MODEL.md` §7, and why each matters:

| Property | Why the LLM needs it |
|---|---|
| Flat JSON, not a graph | The model emits one document; no cross-reference resolution |
| Stable slot IDs (`slot_pg`, etc.) | The model refers to players consistently across actions and keyframes |
| Semantically named actions (`type: "screen"`) | The model reasons about basketball concepts, not opaque enums |
| Fixed coordinate system (100×94, basket at 50,89) | The model reasons geometrically with a documented frame |
| Stored ball states | The model sees possession directly; doesn't simulate |
| `schema_version` field | The model and validators know the structure version |

Without these, every AI call would require bespoke parsing and repair. With them, the workflow is: prompt → JSON → validate → render.

---

## 4. Feature 1 — Generate from text prompt

### 4.1 User flow

1. Coach is in the editor (or the playbook) and clicks "Generate with AI"
2. A modal asks for a text description of the play
3. Coach types: "Horns set. PG enters to the PF at the right elbow, then SG comes off a flare screen from the C to the left wing for a catch-and-shoot three. PF can also hand off to PG on a re-screen."
4. Coach optionally picks a starting formation hint and a duration hint
5. On submit, a loading state shows ("Drafting your play...")
6. The AI returns a play; it loads into the editor as an **unsaved draft**
7. Coach reviews, edits as needed, and saves — at which point it becomes a normal play with `play_versions.change_source = 'ai'` on the first save

### 4.2 The contract

**Input to the model:**
- A system prompt that defines the schema, the coordinate system, and the rules (see §7)
- The coach's text description
- Optional: starting formation, duration hint
- Optional: the current play (if generating a variation rather than from scratch)

**Output from the model:**
- A single JSON object conforming to the play schema
- No prose, no markdown fences, no explanation — just the JSON

**Validation:**
- Parse the JSON (repair common issues like trailing commas if needed)
- Validate against the play Zod schema (`features/play/schemas.ts`)
- Run semantic checks (see §8)
- If valid → load into editor
- If invalid → retry once with the validation errors fed back to the model; if still invalid, show a friendly error and the raw description so the coach can build manually

### 4.3 What the coach gets

A best-effort animated draft. It will not be perfect. The value is going from blank canvas to "80% there, now I tweak" in seconds instead of minutes. The doc's §4.1 step 6 emphasizes "unsaved draft" — the coach is always in control, and the AI never auto-saves over anything.

---

## 5. Feature 2 — Generate from hand-drawn image

### 5.1 Why this is valuable

Most coaches already have plays drawn on paper, whiteboards, or in apps like FastDraw. The ability to photograph a diagram and get an editable animated version is the single most compelling on-ramp for a coach with an existing playbook. v1 had this feature (the "Generate from hand-drawn play" screen in the old screenshots) and it's worth carrying forward.

### 5.2 User flow

1. Coach clicks "Generate from image"
2. Modal explains best practices (label players PG/SG/etc., solid arrows for passes, dashed for cuts, perpendicular marks for screens)
3. Coach uploads a photo (PNG/JPG)
4. Optional: coach adds text notes clarifying the sequence ("first action is the PG-to-SF pass")
5. The image is uploaded to Supabase Storage
6. The image + notes + system prompt go to a vision-capable model
7. The model returns a play JSON
8. Same validation → editor-draft flow as Feature 1

### 5.3 The hard part

Hand-drawn diagrams are ambiguous. Arrows overlap, labels are messy, the *order* of actions is rarely clear from a static image. This feature will have a lower success rate than text generation. Mitigations:
- The optional notes field lets the coach disambiguate sequence
- The result is always an editable draft, never final
- We set expectations in the UI ("AI will do its best; you'll likely need to adjust timing")

### 5.4 Storage consideration

Uploaded images are stored in a Supabase Storage bucket (`play-source-images/`) with RLS so only the uploading coach's team can access them. The image URL is recorded in the play's metadata for provenance. Images can be purged after the play is created (they're only needed during generation), but keeping them aids debugging and re-generation. Decide retention policy at build time.

---

## 6. Feature 3 — Edit an existing play with AI

### 6.1 User flow

1. Coach has a play open in the editor
2. Coach clicks "Edit with AI"
3. Modal asks what to change: "Add a flare screen for the SG after the entry pass" or "Make this work against a 2-3 zone" or "Speed up the first cut"
4. The current play JSON + the edit instruction + system prompt go to the model
5. The model returns a **modified** play JSON
6. The editor shows a diff/preview: what changed (which slots' paths, which actions added/removed)
7. Coach accepts (loads into editor as unsaved) or rejects (nothing changes)
8. On save, `play_versions.change_source = 'ai'` and the prompt is recorded

### 6.2 Why versioning is critical here

This is the feature that makes the v2 versioning system (per `DATA_MODEL.md` §6) non-negotiable. An AI edit could mangle a play the coach spent an hour on. Because every save creates a version, and because the pre-AI state is preserved, the coach can always revert. The "accept/reject preview" in step 6 is the first safety net; versioning is the second.

### 6.3 The diff preview

When the model returns a modified play, we compute a structural diff against the original:
- Slots whose paths changed
- Actions added, removed, or modified
- Duration changes

This diff is shown as a summary ("Added 1 screen, modified SG's path, extended duration to 7.0s") and visually (the changed players' paths highlighted in the preview). The coach sees what the AI did before committing.

---

## 7. The system prompt (design sketch)

The system prompt is the heart of the integration. It is **not** finalized here — it will be iterated against real outputs during v1.1 — but the structure is locked:

```
You are a basketball play designer. You output ONLY valid JSON
conforming to the CourtVision play schema. No prose, no markdown.

COORDINATE SYSTEM:
- The court is 100 units wide (left sideline = 0, right sideline = 100)
  and 94 units tall (half-court line = 0 at top, baseline = 94 at bottom).
- The basket is at (50, 89). The free-throw line is around y=75.
- The three-point arc is ~23.75 units from the basket.

SCHEMA:
[full play schema definition with field descriptions]

PLAYERS:
- Five offensive slots: slot_pg, slot_sg, slot_sf, slot_pf, slot_c
- Refer to players by these IDs consistently.

ACTIONS:
[the six action types and their required fields]

RULES:
- Every player has a path with at least one keyframe at t=0.
- Actions reference valid slot IDs.
- Ball states must be consistent with pass/handoff/shot actions.
- Time values are in seconds, increasing.
- Keep plays realistic: players move at human speeds (a full-court
  sprint is ~5 units/second in this coordinate space).
- Output a complete, valid play. Do not truncate.

[few-shot examples: 2-3 complete plays with their descriptions]
```

### 7.1 Few-shot examples

The prompt includes 2–3 complete, hand-verified example plays with their text descriptions. These anchor the model's output format and quality. The examples are stored as fixtures (`features/play/ai/examples/`) and double as schema test fixtures.

### 7.2 Ball state generation

The model is asked to emit ball states, but as a safety measure, we **regenerate ball states deterministically** from the actions after the model returns. The model's ball states are a hint; our code derives the authoritative ones from pass/handoff/shot actions. This removes a whole class of "ball teleports" bugs from AI output.

---

## 8. Validation and repair pipeline

AI output is untrusted. The pipeline:

```
model output (string)
  → strip markdown fences if present
  → JSON.parse (with one repair attempt for trailing commas etc.)
  → Zod schema validation
  → semantic validation (below)
  → ball state regeneration
  → load into editor as unsaved draft
```

### 8.1 Semantic validation checks

Beyond schema shape, we check:
- Every action's slot references exist in `slots`
- Every player has ≥1 keyframe, with one at or near t=0
- Time values within a path are strictly increasing
- Coordinates are within the court bounds (0–100, 0–94) — clamp if slightly out
- Action times are within the play duration (extend duration if needed)
- No two keyframes for the same slot at the identical time

### 8.2 Repair vs reject

- **Auto-repairable** (clamp coordinates, extend duration, regenerate ball states, sort keyframes): fix silently
- **Retryable** (missing required fields, invalid slot references): retry once with errors fed back to the model
- **Reject** (still invalid after retry): show the coach a friendly message and fall back to manual editing, preserving their prompt

---

## 9. Model choice

**Not finalized — decided at v1.1 build time** based on cost, quality, and availability. The architecture treats the model as a swappable dependency behind a single interface:

```ts
// features/play/ai/generate.ts
interface PlayGenerator {
  fromText(prompt: string, opts?: GenOptions): Promise<PlayDraft>
  fromImage(image: Blob, notes?: string): Promise<PlayDraft>
  edit(play: Play, instruction: string): Promise<PlayDraft>
}
```

Considerations for model choice:
- **Text generation** needs strong instruction-following and JSON reliability. A frontier model (Claude, GPT-class) is appropriate.
- **Image generation** needs vision capability. A vision-capable frontier model.
- **Cost** matters — each generation is one API call; at low volume this is cents per play. Fine for v1.1.
- **Latency** — coaches will tolerate 5–15 seconds for a generation. Streaming the JSON isn't necessary but could improve perceived speed.

The interface above means we can start with one provider and switch without touching the UI or validation code.

### 9.1 Where the call happens

AI calls happen **server-side** in a Next.js route handler (`app/api/ai/generate/route.ts`), never from the browser. Reasons:
- The model API key must not be exposed to the client
- Server-side lets us validate and repair before the client sees output
- Rate limiting and abuse prevention live here

The browser calls our route; our route calls the model.

---

## 10. Cost control and abuse prevention

Even at small scale, an unprotected AI endpoint is a liability.

- **Per-user rate limit:** e.g. 20 generations per hour per coach. Enforced in the route handler against a simple counter (Supabase table or in-memory for single instance).
- **Auth required:** only authenticated coaches can call the endpoint. RLS-adjacent check in the route.
- **Input size limits:** cap prompt length and image size.
- **Cost monitoring:** log every call's token usage; alert if daily spend exceeds a threshold.

None of this is in v2. It's specified so the v1.1 build includes it from the start rather than bolting it on after a surprise bill.

---

## 11. Provenance and transparency

Per the v1 schema (which had `ai_generated`, `ai_prompt`, `ai_model` fields), we preserve provenance, but in v2's cleaner form: it lives in `play_versions`.

- When an AI generation or edit is saved, the resulting version has `change_source = 'ai'`
- The `change_note` field records the prompt used
- This means the version history shows which versions were AI-touched and what was asked

Coaches can see "this version was AI-generated from the prompt: '...'" in the version history. Transparency builds trust and aids debugging.

We do **not** add a permanent "AI-generated" badge to plays in the playbook (v1 did this). Once a coach reviews and saves an AI draft, it's their play. The provenance lives in history, not as a scarlet letter on the play tile.

---

## 12. Failure modes and UX

AI features fail in specific ways. The UX must handle each gracefully.

| Failure | UX response |
|---|---|
| Model returns invalid JSON after retry | "Couldn't generate a valid play. Here's your description — want to build it manually?" |
| Model times out | "That took too long. Try again or simplify the description." |
| Model returns a nonsensical-but-valid play | Coach sees it in the editor and can reject/edit — no special handling needed |
| Rate limit hit | "You've hit the generation limit for this hour. Try again later or build manually." |
| Image too ambiguous | Result loads but is likely wrong; the UI's expectation-setting (§5.3) covers this |
| API key / billing issue | Logged to Sentry; coach sees a generic "AI is temporarily unavailable" |

The throughline: **AI failure always falls back to manual editing, never to a dead end.** The coach can always build the play by hand.

---

## 13. Build sequence for v1.1

When v1.1 begins, the order:

1. Set up the server route + model interface + validation pipeline (no UI yet; test with fixtures)
2. Build Feature 1 (text generation) end-to-end — it's the simplest and most useful
3. Add Feature 3 (AI edit) — reuses most of Feature 1's pipeline plus the diff preview
4. Add Feature 2 (image generation) last — it's the hardest and lowest success rate

Each feature ships as a vertical slice, fully working, before the next begins (per `PRD.md` principle 6).

---

## 14. What v2 must do to stay AI-ready

A checklist for v2 implementation, so we don't accidentally break the path to AI:

- [ ] The play Zod schema (`features/play/schemas.ts`) is the single source of truth for play structure, exported and importable
- [ ] Ball state regeneration from actions exists as a pure function (used by both the editor and, later, the AI pipeline)
- [ ] The play loads into the editor from a plain JSON object (not just from a database fetch) — so AI output can be loaded the same way
- [ ] The editor supports an "unsaved draft" state distinct from a persisted play
- [ ] Versioning records `change_source` (already in schema)
- [ ] Semantic validation helpers (slot references valid, times increasing, etc.) exist as reusable functions

If v2 ships with these, v1.1's AI features are additive — no refactoring required.

---

## 15. Open questions

- **Streaming vs blocking generation.** Streaming the JSON could improve perceived latency but complicates validation. Decide at build time.
- **Model self-hosting vs API.** v1.1 uses a hosted API. Self-hosting is a far-future cost optimization, not relevant now.
- **Fine-tuning.** If generation quality is poor with prompting alone, a fine-tuned model on basketball plays could help — but that requires a dataset we don't have yet. Prompt-only for v1.1.
- **Image retention policy.** How long to keep uploaded hand-drawn images (§5.4). Decide based on debugging needs and storage cost.

---

*End of AI_INTEGRATION.md v0.1. Next document: `ROADMAP.md`, the milestone plan.*
