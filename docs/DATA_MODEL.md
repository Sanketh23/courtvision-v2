# CourtVision — Data Model

**Status:** Draft v0.1
**Owner:** Sanketh
**Last updated:** 2026-06-07
**Depends on:** `PRD.md`, `CLAUDE.md`

---

## 1. Overview

This document defines:
- The **play JSON schema** — the contract for all play data
- The **database schema** — tables, relationships, and Row Level Security policies
- The **coordinate system** — how positions on the court are represented
- **Semantic constraints** — what makes a play valid

The play JSON schema is the single source of truth. Everything — the editor, the viewer, the future AI — reads and writes this one schema. See `CLAUDE.md` guardrail #3.

---

## 2. Coordinate System

The court is represented in **normalized space**: 100 units wide × 94 units tall, origin at **top-left**, with the basket at **(50, 89)**.

```
(0, 0) ─────────────────────── (100, 0)
│                                    │
│         ╱─────────╲               │
│        │  BASKET   │  (50, 89)    │
│         ╲─────────╱               │
│                                    │
│                                    │
(0, 94) ─────────────────────── (100, 94)
```

**Why this system:**
- Normalized space (0–100, 0–94) decouples data from screen size
- Canvas renderers map this to pixels: e.g. 800×752px screen = scale factor 8
- Simple to reason about: a player at (50, 10) is at the top-center of the court
- Fractional units are fine: (50.5, 45.3) is valid

**All player positions and ball positions use this coordinate system.** See `ANIMATION_DESIGN.md` for how interpolation works within this space.

---

## 3. The Play JSON Schema

A play is an immutable JSON structure. It lives in the database and is validated against a Zod schema in `features/play/schemas.ts`.

### 3.1 High-level structure

```ts
type Play = {
  id: string                    // UUID, database-assigned
  teamId: string                // Which team owns this play
  name: string                  // e.g. "Spread P&R"
  description?: string          // Optional coaching notes
  category: PlayCategory        // "offense", "defense", etc. (v2: offense-only)
  formation?: string            // e.g. "5-out", "4-1"
  tags: string[]                // Custom labels
  status: "draft" | "published" | "archived"
  
  // The animation contract:
  players: Player[]             // Offensive lineup (5 required in v2)
  ball: BallState              // Ball motion and possession
  actions: Action[]            // Pass, screen, shot, etc.
  duration: number              // Total play length in milliseconds
  
  // Metadata:
  createdAt: string            // ISO timestamp
  createdBy: string            // User ID (coach)
  published?: string           // ISO timestamp, null if draft
  publishedBy?: string         // User ID of publishing coach
}
```

### 3.2 Player

Each offensive player occupies a "slot" and has a motion path.

```ts
type Player = {
  id: string                    // UUID, or "player_0" through "player_4" (M0 style)
  slot: 0 | 1 | 2 | 3 | 4     // Slot assignment (fixed in v2, editable in editor)
  label: string                 // "PG", "SG", "SF", "PF", "C" (or custom)
  path: Path                    // Motion from start to end
  attributes?: {
    number?: number             // Jersey number (future)
    color?: string              // Player token color (future, derived from slot)
  }
}

type Path = {
  keyframes: Keyframe[]        // At least 2 required: start and end
  type: "linear" | "cubic"     // Interpolation type (cubic = Catmull-Rom)
}

type Keyframe = {
  time: number                  // Milliseconds, 0 ≤ time ≤ duration
  x: number                     // Coordinate (0–100)
  y: number                     // Coordinate (0–94)
}
```

**Constraints:**
- Slots are 0–4 (5 players max in v2)
- Keyframes must be sorted by time (strictly increasing)
- First keyframe time must be 0
- Last keyframe time must equal play duration
- Coordinates must be within [0, 100] × [0, 94]

### 3.3 Ball

The ball can be in flight or possessed by a player.

```ts
type BallState = {
  keyframes: BallKeyframe[]    // At least 2: initial and final
  type: "linear" | "cubic"     // Interpolation type
}

type BallKeyframe = {
  time: number                  // Milliseconds
  x: number                     // Position (0–100)
  y: number                     // Position (0–94)
  inFlight: boolean            // true = passed/shot, false = dribbled/held
}
```

**Constraints:**
- Same time-ordering rules as player paths
- Keyframes should align with action events (pass start, shot release, etc.)
- `inFlight: true` is a visual cue; the renderer draws a line for in-flight balls

**Important:** Ball positions are **regenerated from actions** by a pure function (`ballPositionAt` in `features/play/engine/`). This is the contract for AI editing in v1.1 — the editor never writes ball positions directly. See `AI_INTEGRATION.md` §14.

### 3.4 Actions

Actions are discrete events on top of the continuous motion. They have timing and semantic meaning.

```ts
type Action = 
  | PassAction
  | ScreenAction
  | CutAction
  | DribbleAction
  | HandoffAction
  | ShotAction
  | CatchAction

type ActionBase = {
  id: string                    // UUID
  time: number                  // When the action starts (milliseconds)
  duration: number              // How long it lasts (milliseconds)
}

type PassAction = ActionBase & {
  type: "pass"
  from: string                  // Player slot ID (e.g. "player_0")
  to: string                    // Target player slot ID
  label?: string                // e.g. "skip pass", "chest pass" (future)
}

type ScreenAction = ActionBase & {
  type: "screen"
  screener: string              // Player setting the screen
  target: string                // Player being screened for
  defender?: string             // Defender being screened (future)
}

type CutAction = ActionBase & {
  type: "cut"
  player: string                // Player making the cut
  toward?: string               // What they're cutting toward (ball, basket, position)
}

type DribbleAction = ActionBase & {
  type: "dribble"
  player: string                // Player dribbling
}

type HandoffAction = ActionBase & {
  type: "handoff"
  from: string                  // Player handing off
  to: string                    // Player receiving
}

type ShotAction = ActionBase & {
  type: "shot"
  player: string                // Player taking the shot
  location: { x: number; y: number }  // Where the shot is taken from
  result?: "make" | "miss"      // Future: game-flow dependent
}

type CatchAction = ActionBase & {
  type: "catch"
  player: string                // Player catching the ball
}
```

**Constraints:**
- `from` and `to` slots must exist in the `players` array
- `time` must be in [0, duration]
- `duration` should be reasonable (e.g. 100–1000ms for a pass)
- Actions can overlap in time (a screen can happen during a cut)
- Actions are **renderable as visual overlays** — see `ANIMATION_DESIGN.md` §6

---

## 4. Database Schema

### 4.1 Teams Table

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code VARCHAR(8) UNIQUE NOT NULL,  -- e.g. "CV7X2KZM"
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### 4.2 Team Memberships Table

```sql
CREATE TABLE team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('coach', 'player')),
  joined_at TIMESTAMP DEFAULT now(),
  UNIQUE(team_id, user_id)
);
```

### 4.3 Plays Table

```sql
CREATE TABLE plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,  -- "offense", "defense", etc.
  formation VARCHAR(100),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  -- The play data (stored as JSONB for validation and querying)
  data JSONB NOT NULL,
  
  created_at TIMESTAMP DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  published_at TIMESTAMP,
  published_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT valid_json CHECK (jsonb_typeof(data) = 'object')
);
```

### 4.4 Play Versions Table

```sql
CREATE TABLE play_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  play_id UUID NOT NULL REFERENCES plays(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  UNIQUE(play_id, version_number),
  CONSTRAINT valid_json CHECK (jsonb_typeof(data) = 'object')
);

CREATE INDEX idx_play_versions_play_id ON play_versions(play_id);
```

**Versioning contract:** Every `INSERT` or `UPDATE` to `plays.data` triggers a database trigger that inserts a row into `play_versions` with the old data. The current play and its history are both available.

---

## 5. Row Level Security (RLS)

**Critical principle:** RLS enforces access control at the database layer. Application code does not re-check permissions. See `CLAUDE.md` guardrail #4.

### 5.1 RLS Policies

**Coaches** can:
- See all plays in their teams (published or draft)
- Create, edit, delete plays in their teams
- See all versions of plays in their teams

**Players** can:
- See published plays in their teams only
- Cannot edit, delete, or create plays
- Can see play versions (for "restore" UX, but can't actually restore)

**Mechanics:**

```sql
-- Coaches see all plays in their teams
CREATE POLICY "coaches_see_own_team_plays" ON plays
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_memberships
      WHERE user_id = auth.uid() AND role = 'coach'
    )
  );

-- Players see published plays in their teams
CREATE POLICY "players_see_published_plays" ON plays
  FOR SELECT
  USING (
    status = 'published' AND
    team_id IN (
      SELECT team_id FROM team_memberships
      WHERE user_id = auth.uid() AND role = 'player'
    )
  );

-- Only coaches can insert/update/delete
CREATE POLICY "coaches_can_mutate" ON plays
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_memberships
      WHERE user_id = auth.uid() AND role = 'coach'
    )
  );
```

(Full policies defined in migrations; this is the shape.)

---

## 6. Validation

### 6.1 Schema Validation

The Zod schema in `features/play/schemas.ts` validates:
- All required fields present
- Types match (numbers are numbers, strings are strings)
- Constraints: slot IDs in [0–4], times increasing, coordinates in bounds
- Action references point to valid players

### 6.2 Semantic Validation

Beyond Zod, the engine performs semantic checks:
- Ball keyframe times align with action start/end times (approximately)
- No duplicate player slots
- Duration > 0

These are enforced at edit time in the editor (M5/M6) and at save time in the API.

---

## 7. Future Extensions (Out of Scope for v2)

These are mentioned in case you're reading ahead:

- **Defenders:** The schema allows a `defenders: Player[]` array. M2+ will not build defender rendering, but M0 can leave room for it.
- **Full court:** The coordinate system works for full-court (e.g. 100 × 200). The viewer scales to aspect ratio. M0 does not build this UI.
- **Ball physics:** Currently ball keyframes are linear/cubic interpolation. Future: ballistic arc for accurate shot trajectories.
- **Play metadata:** Fields like difficulty, age_group, NBA_equivalent can be added without schema breakage.

---

## 8. Example: "Spread P&R" Play

Here's a minimal fixture play (5-second play, PG/SG pick-and-roll):

```json
{
  "id": "play_001",
  "teamId": "team_001",
  "name": "Spread P&R",
  "description": "PG dribbles off screen from PF, kicks out to SG",
  "category": "offense",
  "formation": "5-out",
  "tags": [],
  "status": "published",
  "duration": 5000,
  "players": [
    {
      "id": "player_0",
      "slot": 0,
      "label": "PG",
      "path": {
        "keyframes": [
          { "time": 0, "x": 20, "y": 47 },
          { "time": 3000, "x": 45, "y": 47 },
          { "time": 5000, "x": 50, "y": 47 }
        ],
        "type": "cubic"
      }
    },
    {
      "id": "player_1",
      "slot": 1,
      "label": "SG",
      "path": {
        "keyframes": [
          { "time": 0, "x": 80, "y": 30 },
          { "time": 5000, "x": 75, "y": 20 }
        ],
        "type": "linear"
      }
    },
    {
      "id": "player_2",
      "slot": 2,
      "label": "SF",
      "path": {
        "keyframes": [
          { "time": 0, "x": 75, "y": 60 },
          { "time": 5000, "x": 75, "y": 60 }
        ],
        "type": "linear"
      }
    },
    {
      "id": "player_3",
      "slot": 3,
      "label": "PF",
      "path": {
        "keyframes": [
          { "time": 0, "x": 30, "y": 70 },
          { "time": 3000, "x": 40, "y": 50 },
          { "time": 5000, "x": 45, "y": 40 }
        ],
        "type": "cubic"
      }
    },
    {
      "id": "player_4",
      "slot": 4,
      "label": "C",
      "path": {
        "keyframes": [
          { "time": 0, "x": 50, "y": 80 },
          { "time": 5000, "x": 50, "y": 80 }
        ],
        "type": "linear"
      }
    }
  ],
  "ball": {
    "keyframes": [
      { "time": 0, "x": 20, "y": 47, "inFlight": false },
      { "time": 2500, "x": 45, "y": 47, "inFlight": false },
      { "time": 3500, "x": 75, "y": 25, "inFlight": true },
      { "time": 5000, "x": 75, "y": 20, "inFlight": false }
    ],
    "type": "cubic"
  },
  "actions": [
    {
      "id": "action_0",
      "type": "dribble",
      "player": "player_0",
      "time": 0,
      "duration": 2500
    },
    {
      "id": "action_1",
      "type": "screen",
      "screener": "player_3",
      "target": "player_0",
      "time": 2000,
      "duration": 1500
    },
    {
      "id": "action_2",
      "type": "pass",
      "from": "player_0",
      "to": "player_1",
      "time": 3000,
      "duration": 500
    }
  ],
  "createdAt": "2026-01-15T10:30:00Z",
  "createdBy": "user_coach_001",
  "publishedAt": "2026-01-16T14:00:00Z",
  "publishedBy": "user_coach_001"
}
```

---

## 9. Notes for Implementers

1. **The Zod schema** (`features/play/schemas.ts`) is the contract. It's referenced by the editor, viewer, and tests.
2. **Ball positions are regenerated,** not persisted. The `ballPositionAt(actions, t)` function in `features/play/engine/` is pure and deterministic.
3. **Database triggers** handle versioning automatically; the API never calls version creation explicitly.
4. **RLS is the permission boundary.** No `if (userRole === 'coach')` in components; the database returns the right rows.
5. **JSON validation** happens in two places: Zod schema at the application boundary, and database CHECK constraints for extra safety.

---

*This document is the contract for all play data in CourtVision v2.*
