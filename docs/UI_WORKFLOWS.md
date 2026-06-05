# CourtVision — UI Workflows

**Status:** Draft v0.1
**Owner:** Sanketh
**Last updated:** 2026-04-30
**Depends on:** `PRD.md`, `DATA_MODEL.md`, `ANIMATION_DESIGN.md`

---

## 1. Purpose and how to read this doc

This document specifies the layout, hierarchy, and interaction patterns for every screen in CourtVision v2. It is the source of truth for Claude Code on what each screen contains and how it behaves. It is **not** the source of truth for visual polish — exact colors, type sizes, spacing values, and component styles come from a design tokens file produced during implementation.

Every section follows the same structure:
1. A wireframe diagram (SVG embedded for the four highest-information screens; prose-only for simpler ones)
2. A walkthrough of what's in the wireframe
3. Behaviors, states, and edge cases
4. What's deliberately not included

Wireframes are **low-fidelity**. They communicate "this region holds the timeline" and "this rail is for filters" — they do not commit to whether a filter is a chip or a checkbox or a dropdown. When the wireframe and the prose conflict, the prose wins.

The four screens with embedded SVG wireframes (because they're the highest-information surfaces in v2):
- §2 Auth — sign in, create account, join team
- §3 Empty state + create team flow
- §7 Play editor (desktop) — the most important screen
- §8 Play viewer (mobile) — the second most important

Other screens are specified by prose only. Where a reference sketch is mentioned, Claude Code should treat the prose as authoritative and apply standard component patterns.

The screens covered:
- §2 Auth — sign in, create account, join team
- §3 Empty state — first run after creating an account
- §4 Create team flow
- §5 Playbook browse — desktop, coach
- §6 Playbook browse — mobile, player
- §7 Play editor — desktop
- §8 Play viewer — mobile
- §9 Play viewer — desktop
- §10 Version history
- §11 Team / member management
- §12 Account settings
- §13 Cross-cutting patterns

---

## 2. Auth screens

Three entry points: sign in, create account, join team. All are unauthenticated routes (`/sign-in`, `/sign-up`, `/join`).

### 2.1 Wireframe

![Auth screens — sign in, create account, join team](wireframes/auth-screens.svg)

Three cards side by side: sign-in form on the left, create-account form in the middle, join-team flow on the right with a 6-character segmented code input.

### 2.2 Sign in (`/sign-in`)

- Email field, password field
- Forgot password link (right-aligned, opens `/reset-password`)
- "Sign in" primary action
- Bottom link: "New here? Create account" → `/sign-up`
- **Dedicated affordance at the bottom: "Player joining a team? Enter team code"** → `/join`. This is the most important non-obvious detail. Players don't think "I need to sign up"; they think "I have a code." The path must be one tap from the sign-in screen.

### 2.3 Create account (`/sign-up`)

- Full name, email, password (min 8 characters)
- Terms + Privacy consent text inline (not a checkbox; the act of clicking "Create account" is consent)
- After success → routes to `/welcome` (the empty state, §3)
- "Have an account? Sign in" link

### 2.4 Join a team (`/join`)

A two-stage form on one screen:

**Stage 1: Code entry**
- 6-character segmented input. Each character is its own box.
- Letters and digits only, excluding ambiguous characters (no 0, O, 1, I, L)
- Case-insensitive on entry; always displayed and stored uppercase
- Validates the code against `teams.invite_code` as the user types (debounced)
- If valid, the team name appears as confirmation ("Joining Lincoln Eagles") and Stage 2 reveals
- If invalid after 6 characters entered, show a non-blocking error: "Code not found. Check with your coach."

**Stage 2: Account details**
- Name, email, password (same as sign-up)
- "Join team" primary action
- On success: creates auth user, inserts `team_memberships` row with `role = player`, routes to `/playbook` (the player playbook view)

### 2.5 Email verification

Not required in v2. Supabase's default email confirmation is disabled. Users can use the app immediately after signing up. Email verification can be added in v1.1 without UI changes (a banner at the top of the playbook prompting verification suffices).

### 2.6 Password reset

A simple, separate flow at `/reset-password`:
1. Enter email → Supabase sends a magic link
2. Link opens `/set-new-password` with a token in the URL
3. Enter new password twice → submit → redirected to `/sign-in`

This flow does not need its own wireframe — it's standard.

---

## 3. Empty state — no team yet

After a coach signs up, they land on `/welcome` with two choices: create a team (recommended) or join a team (for assistant coaches whose head coach already has the team set up).

### 3.1 Wireframe

![Empty state and create team flow](wireframes/empty-state-create-team.svg)

The empty state on the left shows a clipboard icon, welcome message, and two cards — "Create a team" highlighted as recommended, "Join a team" as the secondary path. The create-team flow on the right is a single screen with name, season, level, and a pre-generated invite code with regenerate/copy controls.

### 3.2 Behavior

- Header: product name + avatar (top right)
- Body: welcome message personalized with the user's name
- Two action cards:
  - **Create a team** (primary, highlighted) → `/team/new`
  - **Join a team** (secondary) → `/join` (but skips Stage 2 since user is already authenticated; just enters code and joins)
- No back button — this is the first screen post-signup
- If a user already has a team membership and somehow lands here, redirect to `/playbook`

### 3.3 What's not here

- No tutorial overlay
- No "watch a 30-second video" prompt
- No marketing copy beyond the welcome message
- No template playbook (cut from v2 scope; consider for v1.1)

---

## 4. Create team flow

A single screen at `/team/new`. Not a multi-step wizard.

### 4.1 Wireframe

See §3.1 — the create-team form is shown on the right side of the empty-state-create-team wireframe.

### 4.2 Form fields

- **Team name** (required, free-text)
- **Season** (required, defaults to the current academic year — Aug–Jul boundary)
- **Level** (optional, dropdown: Youth / High school / AAU / College / Other)

### 4.3 Invite code

The invite code is **shown before submission**, not after. It's pre-generated client-side using the format described in §2.4 (6 characters, letters + digits, no ambiguous characters) and revealed alongside the form. The user can:
- Refresh (regenerate) the code
- Copy to clipboard

Code is committed to the database on form submit. If the chosen code conflicts with an existing team's code (unlikely but possible), the server returns an error and a new code is generated.

### 4.4 Post-submit behavior

After "Create team" is pressed:
1. Insert into `teams` (owner = current user)
2. Insert into `team_memberships` (user = current user, role = coach)
3. Route to `/playbook` (which is now empty — see §5.4)
4. Show a one-time onboarding strip at the top of the playbook: "Share this code with your players: A7K2P9 [Copy] [Share]"

The strip is dismissible. It stays until the team has at least one player member, then auto-dismisses.

---

## 5. Playbook browse — desktop, coach

The home screen for an authenticated coach. Route: `/playbook`.

### 5.1 Wireframe

_No embedded wireframe for this screen. The layout is described in detail in §5.2–§5.8. Refer to the descriptions when implementing._

A reference sketch would show: top bar with product name and team name; left filter rail with categories, status, tags; content area with a search/sort toolbar; a "Recently edited" horizontal strip above a 3-column grid of play tiles; each tile has a court thumbnail, name, pills, and metadata; an empty "+ Create play" tile sits at the end of the grid.

### 5.2 Layout

Three regions:
- **Top bar.** Product name, team name pill, top-right nav (Playbook / Team / Account / avatar)
- **Left rail (180px).** Three filter groups: Categories (single-select), Status (multi-select checkboxes), Tags (pills, click to add to filter)
- **Content area.** Toolbar (search + sort + view toggle + "New play" CTA), then "Recently edited" horizontal strip, then a grid of play tiles

### 5.3 Toolbar

- Search input (300px max width)
- Sort dropdown — options: Recently edited (default), Recently created, Alphabetical, Most actions, Duration
- View toggle — grid (default) / list
- "New play" primary button — opens the editor at `/play/new`

### 5.4 "Recently edited" strip

Above the grid, a single horizontally-scrollable row of the 4–6 most recently edited plays. This strip is **independent of active filters** — it always shows recent activity. Useful for "what was I just working on?" Each tile in the strip is the same component as a grid tile but in a horizontal orientation (smaller).

When the playbook is empty (0 plays), the strip is hidden and the grid shows a single large "Create your first play" empty card.

### 5.5 Play tiles

Each tile:
- Thumbnail (SVG, generated from `play.data` on the fly — no caching)
- Play name (one line, truncated with ellipsis)
- Category pill + 1–2 tag pills
- Subtle metadata line: "Edited 2 min ago · 6.0s · 4 actions"
- Hover: subtle border change + cursor pointer
- Click: navigates to `/play/:id` (the viewer; the editor is reached from there via Edit button)

### 5.6 Grid behavior

- 3 columns at >1100px width, 2 columns at 800–1100px, 1 column below 800px (rare for the coach desktop view but supported)
- Empty "+ Create play" tile appears as the last grid item, visually dashed-border, lower contrast

### 5.7 Filtering

- Click a category → filters grid AND updates the URL to `?category=offense`
- Click a status checkbox → adds to filter; multiple statuses ORed
- Click a tag pill → adds to filter; multiple tags ANDed
- Filter chips appear in a row above the grid (small "x" to remove)
- "Clear all filters" link when ≥1 filter active

### 5.8 Empty state (zero plays)

When the playbook has no plays:
- "Recently edited" strip is hidden
- Grid shows one large card: "Your playbook is empty. Create your first play to get started." with a CTA button
- The invite code onboarding strip from §4.4 may still be visible at top if no players have joined yet

---

## 6. Playbook browse — mobile, player

The player's home screen. Route: `/playbook` (same path; layout adapts).

### 6.1 Wireframe

_No embedded wireframe for this screen. The layout is described in detail in §6.2–§6.7._

A reference sketch would show: a phone-sized layout with team name and "Playbook" title at the top, a search bar below, horizontally-scrollable category chips, a "Recently added" featured section with 1–2 highlighted cards plus plain rows, and an "All plays" list with thumbnails, names, categories, and an unstudied dot indicator for plays not yet marked studied.

### 6.2 Layout

Single column, no left rail. Top to bottom:
- Header: team name (small) + "Playbook" title + avatar (top right)
- Search bar
- Horizontally-scrollable category chips ("All", "Offense", "BLOB", etc.)
- "Recently added" section (5 most recently added plays, regardless of how old)
- "All plays" section (paginated list, sorted by Recent by default)

### 6.3 "Recently added" section

5 most recently added plays. The newest 1–2 are visually elevated (filled background, colored border) and have a "New" pill if added in the last 7 days. The rest are plain rows. Each row links to `/play/:id`.

### 6.4 All plays list

- Thumbnail (smaller, ~48px) + name + category + duration
- **Unstudied dot indicator on the right** — small filled dot on plays the player has not marked studied
- Sort dropdown at the section heading ("Recent" default; options: Alphabetical, Most-studied)
- Tap a row → `/play/:id`

### 6.5 Pull to refresh

Standard iOS/Android gesture supported. Refreshes the play list from the server. Coaches can see new plays appear immediately without app reinstall.

### 6.6 Empty state (zero plays)

When the team has no plays yet:
- Both sections hidden
- A friendly message: "Your coach hasn't added any plays yet. Check back soon."

### 6.7 Avatar tap behavior

Tapping the top-right avatar opens an action sheet (iOS-style) or dropdown menu (Android/desktop):
- Account
- Switch team (hidden in v2 since one team; surfaced in v1.1)
- Sign out

---

## 7. Play editor — desktop

The most important screen in v2. Route: `/play/:id/edit` (or `/play/new` for create flow).

### 7.1 Wireframe

![Play editor — desktop](wireframes/play-editor-desktop.svg)

Top bar with play name, draft status, save state, and Undo/Redo/Show paths toggle/Preview/Save buttons. Left rail with the 5 players list (PG highlighted as selected) and a 6-button "Add action" grid. Central court canvas with PG selected and its keyframed path visible. Right rail with play properties (name, category, formation, duration, tags, description). Bottom timeline split into a master scrubber row and per-slot lanes showing each player's keyframes and any actions they're involved in.

### 7.2 Top bar

- Back arrow (returns to `/playbook`)
- Play name (editable inline — click to edit)
- Status pill (Draft / Published / Archived)
- "Last saved X ago" subtle label
- Top-right: Undo, Redo, Show paths toggle (default ON), Preview, Save

"Save" is the only primary button. Other top-bar actions are secondary buttons.

### 7.3 Left rail — players and actions

Two stacked sections:

**Players**
- 5 player slots listed (PG, SG, SF, PF, C by default)
- Each shows keyframe count
- Click a slot → selects that player on the canvas
- Double-click → rename (label) the slot
- Selected slot is highlighted

**Add action**
- Grid of action buttons: Pass, Screen, Cut, Dribble, Handoff, Shot
- Action buttons activate only when the selection makes them valid (e.g. Pass requires 2 selected players; Shot requires 1)
- Click an active button → adds the action at the current timeline position with the selected players as participants

This implements the selection-drives-actions model from `ANIMATION_DESIGN.md` §8.3.

### 7.4 Center — the court

- Half-court rendered as SVG (per `ANIMATION_DESIGN.md`)
- 5 players visible, positioned at their current-time interpolated position
- Selected player highlighted (filled vs outline)
- Selected player's full path visible as a curved line with keyframe dots (if "Show paths" is on, all players' paths are visible; the selected one's keyframe dots are shown)
- Top-left of the canvas: status pill (e.g. "t = 0.0s · PG selected")
- Drag a player → creates or moves a keyframe at the current timeline position
- Drag a keyframe dot → moves that keyframe's position (not its time)
- Right-click a player or keyframe → context menu (delete keyframe, etc.)

### 7.5 Right rail — properties

Always visible. Fields:
- Name (text input)
- Category (dropdown)
- Formation (free-text)
- Duration (number, with auto-extend hint)
- Tags (chip input)
- Description (multiline text)

Changes here update the play data immediately (debounced). Save persists.

### 7.6 Bottom timeline

Two parts:

**Master timeline**
- Play/pause button (left)
- Current time readout (e.g. "1.4s")
- Scrubber bar with action tick marks
- End-time readout
- Speed dropdown (0.25× / 0.5× / 1× / 2×)

**Per-slot lanes (collapsible)**
- One horizontal lane per player
- Each lane shows the player's keyframes as dots and any actions they're involved in as colored bars with labels
- Drag a keyframe in the lane → changes its time
- Drag an action bar → moves the action's time
- Header has a chevron to collapse all lanes into a single summary row

### 7.7 Save behavior

- Manual save (Cmd/Ctrl+S or Save button) writes the play to the database
- A trigger creates a new `play_versions` row on every save (see `DATA_MODEL.md` §6)
- "Saved" indicator briefly flashes; "Last saved X ago" label updates
- Unsaved changes warning on navigation away

### 7.8 Undo / redo

- Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z
- Stack lives in memory only; cleared on navigation away from the editor
- Versioning (cross-session rewind) is separate — see §10

### 7.9 Keyboard shortcuts

- Space — play/pause
- Cmd/Ctrl+S — save
- Cmd/Ctrl+Z / Shift+Z — undo / redo
- Arrow keys — nudge selected player or keyframe (1 court unit)
- Delete / Backspace — remove selected keyframe (not the only one) or selected action
- 1–5 — quick-select player by slot index
- P, S, D, C, H, T — quick-add Pass, Screen, Dribble, Cut, Handoff, shoT (when selection is valid)

These are spec'd here so Claude Code knows to wire them.

### 7.10 New play flow

When the coach clicks "New play" from `/playbook`:
1. Editor opens at `/play/new`
2. A modal asks for the starting formation: Horns / 1-4 high / Box / Stack / Spread / Custom
3. Picking a formation places 5 players in that configuration with one keyframe each at `t=0`
4. Picking "Custom" places 5 players in a default neutral arrangement
5. Duration defaults to 4 seconds; play name defaults to "Untitled play"
6. First save creates the row in the database; subsequent saves update

### 7.11 What's not here

- No AI buttons (deferred to v1.1)
- No comments
- No live preview window separate from the editor canvas
- No defender placement (offense-only in v2)
- No "compare two versions" view in the editor (lives in version history modal, §10)

---

## 8. Play viewer — mobile

The player's primary screen. Route: `/play/:id` (mobile layout).

### 8.1 Wireframe

![Play viewer — mobile](wireframes/play-viewer-mobile.svg)

A phone-sized layout: header with back arrow, "N of M" position, and kebab menu; title block with category/formation/tag pills; court canvas taking roughly a third of the vertical space with the current frame visible (PF has just received the pass, ball in the air); timeline + transport row with time readout, speed pills, scrubber with action tick marks, and a big circular play/pause button flanked by loop and bookmark; steps list with the current step highlighted; coach's notes; footer with "Mark studied" and prev/next chevrons.

### 8.2 Layout

Vertical stack, scrollable. Top to bottom:
1. Header: back arrow, "N of M" position, kebab menu
2. Title block: play name, category + formation + tag pills
3. Court canvas (~35% of viewport)
4. Timeline + transport
5. Steps list
6. Notes from coach (hidden if empty)
7. Footer: "Mark studied" + prev/next chevrons

### 8.3 Court canvas

- Half-court SVG (per `ANIMATION_DESIGN.md`)
- Players visible at their interpolated positions
- **Player motion paths shown clearly** — faint colored lines from each player's start to end, with the "traveled" segment slightly darker than the "remaining" segment (see §13.3 for cross-cutting pattern)
- Action overlays visible during the relevant time window (pass arrows, screen marks, etc.)
- No keyframe dots (editor-only)
- No drag handlers (viewer is read-only)

### 8.4 Timeline + transport

Compact row above the steps list:
- Time readout + speed picker (3 buttons: 0.5× / 1× / 2× — with 1× as the default, see §13.4)
- Scrubber bar with action tick marks
- Big circular play/pause button (centered)
- Loop toggle (left of play/pause)
- Bookmark (right of play/pause) — saves the play for quick access (light feature, defer if needed)

### 8.5 Steps list

Each action rendered as a row:
- Time (e.g. "1.2s")
- Action description (e.g. "Pass: PG → PF")
- Coach's note (if present)

The currently active action is highlighted. Tapping a row jumps the scrubber to that time. The list scrolls naturally with the page.

### 8.6 Notes from coach

The play's `description` field, rendered as plain prose. If empty, the section is hidden entirely.

### 8.7 Mark studied + navigation

Footer bar pinned to the bottom of the page content (not the viewport — it's part of the scrollable page):
- "Mark studied" checkbox + label
- Prev / next chevrons to navigate within the playbook order

Tapping "Mark studied" updates `play_progress` for this user/play.

### 8.8 What's not here

- No comments or replies
- No share button (sharing requires team membership, not public)
- No download / export
- No fullscreen video mode (the play already fills the visual space available)

---

## 9. Play viewer — desktop

Same data as §8, wider layout. Route: same as mobile, layout adapts at ≥800px.

### 9.1 Wireframe

_No embedded wireframe for this screen. The layout is described in detail in §9.2–§9.4. It mirrors the mobile viewer (§8.1) in a wider two-column layout._

A reference sketch would show: top bar with back arrow, play name, metadata pill row, and an Edit button (visible only to coaches); two-column body with the court canvas on the left (60% width) and the steps list as a right-side panel (40%); transport controls below the court; coach's notes full-width below; prev/next chevrons centered at the bottom.

### 9.2 Layout

- Top bar: back arrow + play name + metadata pill row + Edit button (coach only)
- Two-column body: court canvas (60% width) + steps list (40% width)
- Below: transport controls (play/pause, scrubber, speed)
- Below transport: "Notes from coach" (full width)
- Bottom: prev/next chevrons centered

### 9.3 Coach vs player

The desktop viewer is the same component for coaches and players. The Edit button is conditionally rendered based on the viewer's role membership. Players never see an Edit button.

### 9.4 Auto-pause behavior

When the play finishes (and loop is off), the viewer auto-pauses on the final frame. Hitting play again restarts from t=0.

---

## 10. Version history

Triggered from the editor's "..." menu (a kebab in the top bar, not shown in the wireframe but spec'd here). Renders as a modal overlay.

### 10.1 Wireframe

_No embedded wireframe for this screen. The layout is described in detail in §10.2–§10.4._

A reference sketch would show: a modal overlay with the play name as title, version count below, then a list of versions newest-first with the current version highlighted (no Restore action) and older versions each showing a "Restore" link.

### 10.2 Behavior

- Modal opens, dims the editor behind
- Each version row: version number, change summary (auto-generated; "Edited screen timing" / "Manual save" / "AI edit" / "Restored from v8"), timestamp, source label
- Current version is highlighted, no Restore action
- Older versions have a "Restore" link that opens a confirmation: "Restoring will create a new version (v13). Earlier versions are kept. Proceed?"
- Click "Proceed" → server-side restore (creates new version with `change_source = 'restore'` and `snapshot = old version's snapshot`)
- After restore, modal closes and editor reloads with the restored play
- Close button (X) dismisses the modal

### 10.3 Preview before restore

Click a version row (not the Restore link) → a side panel within the modal renders a small play preview at that version. This is read-only — coach can scrub through the past state to confirm before restoring.

### 10.4 Pruning

Not in v2. All versions kept forever. Storage analysis in `DATA_MODEL.md` §6.

---

## 11. Team / member management

Route: `/team`. Coach-only.

### 11.1 Wireframe

_No embedded wireframe for this screen. The layout is described in detail in §11.2–§11.5._

A reference sketch would show: team name and season pill at the top; an invite code section with the code displayed prominently and refresh/copy/share controls; members list below with the coach at the top ("you" annotation), then players alphabetically — each row showing avatar, name, join date, role pill, and a kebab menu for member actions.

### 11.2 Sections

- **Team info.** Name (editable), season, level
- **Invite code.** Big display, with refresh (regenerates and invalidates old), copy, and share (opens system share sheet on mobile, copies link on desktop)
- **Members.** Coach listed first with "you" annotation; players listed alphabetically. Each row: avatar, name, join date, role pill, kebab (...)

### 11.3 Member actions (via kebab)

- Remove from team (confirmation dialog)
- Change role — **greyed out in v2** since only `player` role exists for non-owners. Surfaced in v1.1 when assistant coach role arrives.

### 11.4 Self-removal

The coach (owner) cannot be removed and cannot leave the team. The only way to dissolve a team is via "Delete team" in a "Danger zone" section at the bottom of this page:
- Type team name to confirm
- All plays, memberships, versions are deleted (cascade)
- Coach is returned to `/welcome`

### 11.5 What's not here

- No "Pending invitations" list — v2 uses an open invite code, not per-link invites
- No bulk operations on members

---

## 12. Account settings

Route: `/account`.

### 12.1 Wireframe

_No embedded wireframe for this screen. The layout is described in detail in §12.2–§12.4._

A reference sketch would show: an "Account" page header; a profile block at the top with avatar, name, and email; then a vertical list of settings options — Edit profile, Change password, Manage team, Contact support, Sign out (in destructive style). A "Danger zone" with account deletion appears under the Edit profile sub-screen.

### 12.2 Sections

- **You** — avatar, name, email
- **Edit profile** — name (and avatar later)
- **Change password** — current + new + confirm
- **Manage team** — shortcut to `/team`
- **Contact support** — opens `mailto:` link or a feedback form
- **Sign out** — destructive style, ends session

### 12.3 Danger zone

Under "Edit profile," a collapsed "Danger zone" section:
- Delete account — confirmation required (re-enter password)
- Deletes auth user; cascades to memberships (Supabase RLS prevents orphaned coach-only teams)
- If user is sole coach of a team with players, the delete is blocked with explanation: "Delete or transfer your team first."

### 12.4 What's not here

- No notification preferences (no notifications in v2)
- No appearance / theme preferences (system theme followed by default)
- No connected accounts / SSO

---

## 13. Cross-cutting patterns

Patterns that recur across multiple screens. Spec'd once here.

### 13.1 Loading states

- Skeleton placeholders for play tiles, member rows, version list rows
- The court canvas shows a simple "Loading play..." text + spinner when fetching
- No full-page spinners — always partial loading

### 13.2 Empty states

Each list view has an empty state with:
- Friendly icon
- One-sentence explanation
- One action (if applicable)

Empty states are never errors.

### 13.3 Player motion paths in the viewer

For both mobile and desktop viewers:
- Each player's full path is rendered as a faint colored line from start to end
- The "traveled" portion (from start to the current scrub time) is rendered slightly darker/thicker
- The "remaining" portion is lighter/thinner
- Path color is unique per player slot (PG = blue family, SG = teal family, etc. — defined in design tokens)
- Player tokens themselves remain the dominant visual element; paths are subordinate

This is "clearly visible" without becoming visual noise.

### 13.4 Speed control

- Viewer: 3 buttons — 0.5×, 1× (default), 2×
- Editor: same buttons, plus 0.25× available via dropdown for precision editing

### 13.5 Error handling

- Network errors → inline non-blocking banner at the top: "Couldn't save. [Retry]"
- Validation errors → field-level inline messages
- 404 / not found → dedicated screen: "Play not found. [Back to playbook]"
- 401 / unauthorized → redirect to `/sign-in`

### 13.6 Responsive breakpoints

- Mobile: <600px
- Tablet: 600–1024px
- Desktop: ≥1024px

The play editor is desktop-only (≥1024px). Coaches who open `/play/:id/edit` on mobile see a message: "The editor needs a larger screen. Open this on a laptop or tablet."

The viewer adapts gracefully across all sizes.

### 13.7 Color and dark mode

- Default theme follows system preference
- Manual override in account settings (v1.1, not v2)
- All wireframes in this doc work in both themes
- Specific color tokens defined in `frontend-tokens.md` (deferred file — Claude Code may use its standard Tailwind palette guided by examples)

### 13.8 Accessibility

- All interactive elements have visible focus states
- Buttons have aria-labels where icon-only
- Court canvas has descriptive `<title>` for screen readers
- Color is never the sole signal (e.g. "draft" status uses a pill with a word, not just a color dot)
- Keyboard navigation supported throughout

### 13.9 Persistence of UI state

Stored in localStorage per-user:
- Show paths toggle (editor) — default ON
- Last view mode (grid vs list)
- Last sort selection
- Last category filter

Reset on sign out.

---

## 14. Routing map

For Claude Code reference. All routes assume authenticated context unless noted.

| Route | Screen | Auth | Roles |
|---|---|---|---|
| `/sign-in` | Sign in | public | — |
| `/sign-up` | Create account | public | — |
| `/join` | Join team | public | — |
| `/reset-password` | Password reset | public | — |
| `/set-new-password?token=...` | Set new password | public | — |
| `/welcome` | Empty state | auth | any (no team) |
| `/team/new` | Create team | auth | any (no team) |
| `/playbook` | Playbook browse | auth | coach or player |
| `/play/new` | Editor (new play) | auth | coach |
| `/play/:id` | Viewer | auth | coach or player |
| `/play/:id/edit` | Editor (existing) | auth | coach |
| `/play/:id/versions` | Version history (modal context) | auth | coach |
| `/team` | Team management | auth | coach |
| `/account` | Account settings | auth | coach or player |

---

## 15. Open questions

- **Bookmark in player viewer.** Light feature, spec'd at §8.4. Cut if implementation is non-trivial — it's the lowest-value feature in v2.
- **Color palette for player paths.** Defined in implementation. May need iteration after seeing real plays.
- **Court visual style.** Hardwood texture vs flat dark vs flat light. Decide during implementation. The wireframes assume flat / muted.
- **Onboarding tour.** None planned for v2. Reconsider if user testing reveals confusion.

---

*End of UI_WORKFLOWS.md v0.1. Next document: `ARCHITECTURE.md`, which defines the tech stack, project structure, and module boundaries.*
