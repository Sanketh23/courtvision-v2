# CourtVision — Animation Design

**Status:** Draft v0.1
**Owner:** Sanketh
**Last updated:** 2026-06-07
**Depends on:** `DATA_MODEL.md`, `ARCHITECTURE.md`

---

## 1. Overview

This document describes how play data becomes smooth motion on screen. It covers:
- The rendering architecture and frame loop
- Interpolation strategy (Catmull-Rom splines)
- Engine function signatures and contracts
- Performance budgets and constraints

**Key principle:** The animation engine is **pure TypeScript**. No React, no side effects. The renderer wraps it with React state and hooks. See `CLAUDE.md` guardrail #6.

---

## 2. High-Level Architecture

```
Play JSON (DATA_MODEL.md)
  ↓
Zod Validation (features/play/schemas.ts)
  ↓
Animation Engine (features/play/engine/)
  ├─ positionAt(path, t) → {x, y}
  ├─ ballPositionAt(states, t) → {x, y, inFlight}
  ├─ overlaysFromActions(actions) → Overlay[]
  └─ (Catmull-Rom interpolation, pure math)
  ↓
React Renderer (features/play/viewer/ + features/play/editor/)
  ├─ usePlayEngine(play) hook
  ├─ requestAnimationFrame loop
  └─ React state (timeline cursor, play/pause, speed)
  ↓
SVG/HTML Output (Court component + player tokens + action overlays)
```

**The split is critical:** The engine doesn't know about React. The renderer doesn't care about the math. This lets the engine be tested, reasoned about, and potentially reused (e.g. in AI regeneration).

---

## 3. The Animation Engine

The engine is a pure TypeScript module in `features/play/engine/`. It exports these functions:

### 3.1 `positionAt(path: Path, t: number) → {x: number, y: number}`

Given a player's path (from DATA_MODEL.md) and a time `t` in milliseconds, return the player's position at that time.

**Inputs:**
- `path: Path` — object with `{ keyframes: Keyframe[], type: 'linear' | 'cubic' }`
- `t: number` — time in milliseconds (0 ≤ t ≤ duration)

**Returns:**
- `{x, y}` — position in normalized court space

**Behavior:**
- If `t < 0` or `t > path's implicit duration`, return the first/last keyframe position
- If `t` equals a keyframe time, return that exact keyframe position
- If `t` is between keyframes and `type === 'linear'`, return linear interpolation
- If `t` is between keyframes and `type === 'cubic'`, return Catmull-Rom spline interpolation

**Example:**
```ts
const path = {
  keyframes: [
    { time: 0, x: 20, y: 47 },
    { time: 3000, x: 45, y: 47 },
    { time: 5000, x: 50, y: 47 }
  ],
  type: 'cubic'
};

const pos = positionAt(path, 1500); // Between frame 0 and frame 1, halfway
// Returns something like { x: 32.5, y: 47 } (cubic-interpolated)
```

### 3.2 `ballPositionAt(states: BallState, t: number) → {x: number, y: number, inFlight: boolean}`

Given ball keyframes and a time `t`, return the ball position and flight status.

**Inputs:**
- `states: BallState` — object with `{ keyframes: BallKeyframe[], type: 'linear' | 'cubic' }`
- `t: number` — time in milliseconds

**Returns:**
- `{x, y, inFlight}` — position and whether the ball is in flight

**Behavior:**
- Same interpolation rules as `positionAt`
- If `inFlight: true`, the renderer draws a line; if `false`, a circle (optional, per `UI_WORKFLOWS.md`)

**Note:** In v2, `ballPositionAt` reads the `BallState` from the play JSON directly. In v1.1, it will be regenerated from `Action[]` by a pure function. See `AI_INTEGRATION.md` §14.

### 3.3 `overlaysFromActions(actions: Action[]) → Overlay[]`

Convert a play's actions into **render-ready overlay specifications**. This is called once per play load, not every frame.

**Inputs:**
- `actions: Action[]` — array from play JSON

**Returns:**
- `Overlay[]` — array of overlay objects, each specifying what to draw and when

```ts
type Overlay = {
  id: string
  type: 'pass_arrow' | 'screen_mark' | 'cut_marker' | 'shot_arc'
  time: number         // When this overlay becomes visible
  duration: number     // How long it's visible
  data: {              // Type-specific data
    [key: string]: any
  }
}

// Example:
type PassOverlay = Overlay & {
  type: 'pass_arrow'
  data: {
    from: {x, y}
    to: {x, y}
    fromSlot: number
    toSlot: number
  }
}
```

**Behavior:**
- For each action, create overlay(s) based on its type
- `PassAction` → `pass_arrow` overlay with start/end positions
- `ScreenAction` → `screen_mark` overlay at screener position
- `CutAction` → `cut_marker` overlay on cutting player's path
- `ShotAction` → `shot_arc` overlay from player to basket
- Other actions (dribble, catch, handoff) → no overlay (optional refinement)

**Why pre-compute?** Overlays don't change while the play is animating. Computing them once and caching them is faster than recomputing every frame.

### 3.4 Catmull-Rom Interpolation

Catmull-Rom is a cubic spline that:
1. Passes through every control point (keyframe)
2. Produces smooth curves between points
3. Requires 4 points to interpolate between the middle two

**Implementation:**
```ts
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  
  return (
    0.5 * (
      2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    )
  );
}
```

**For edge cases** (near the first or last keyframe):
- Duplicate the first keyframe before it: `[kf[0], kf[0], kf[1], kf[2], ...]`
- Duplicate the last keyframe after it: `[..., kf[n-2], kf[n-1], kf[n-1]]`

**Time normalization:**
When interpolating between two keyframes at times `t1` and `t2`, normalize `t` to `[0, 1]`:
```ts
const normalizedT = (t - t1) / (t2 - t1);
```

### 3.5 Linear Interpolation

For `type: 'linear'` paths:
```ts
function linearInterpolate(p1: number, p2: number, t: number): number {
  return p1 + (p2 - p1) * t;
}
```

where `t` is normalized to `[0, 1]` as above.

---

## 4. The React Renderer

The renderer wraps the engine with React state and a `requestAnimationFrame` loop.

### 4.1 `usePlayEngine(play: Play) → PlayEngineState`

**Purpose:** Manage animation state and provide frame-by-frame position updates.

**Returns:**
```ts
type PlayEngineState = {
  // Playback state
  isPlaying: boolean
  currentTime: number      // Current position in milliseconds
  speed: number            // Playback speed (0.25, 0.5, 1, 2)
  looping: boolean         // Whether to loop at the end
  
  // Precomputed data
  overlays: Overlay[]      // From overlaysFromActions
  
  // Functions to control playback
  play: () => void
  pause: () => void
  seek: (time: number) => void
  setSpeed: (speed: number) => void
  toggleLoop: () => void
  
  // Utilities
  positionAt: (playerSlot: number, t: number) => {x, y}
  ballPositionAt: (t: number) => {x, y, inFlight}
  duration: number
}
```

**Implementation sketch:**
```ts
export function usePlayEngine(play: Play): PlayEngineState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [looping, setLooping] = useState(false);
  
  const overlays = useMemo(() => overlaysFromActions(play.actions), [play.actions]);
  
  // requestAnimationFrame loop
  useEffect(() => {
    if (!isPlaying) return;
    
    let frameId: number;
    let lastTime = performance.now();
    
    const animate = (now: number) => {
      const deltaMs = now - lastTime;
      lastTime = now;
      
      setCurrentTime(prev => {
        let next = prev + deltaMs * speed;
        if (next >= play.duration) {
          if (looping) {
            return 0; // Reset to start
          } else {
            setIsPlaying(false);
            return play.duration; // Pause at end
          }
        }
        return next;
      });
      
      frameId = requestAnimationFrame(animate);
    };
    
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, speed, looping, play.duration]);
  
  return {
    isPlaying,
    currentTime,
    speed,
    looping,
    overlays,
    play: () => setIsPlaying(true),
    pause: () => setIsPlaying(false),
    seek: (time) => setCurrentTime(time),
    setSpeed,
    toggleLoop: () => setLooping(l => !l),
    positionAt: (slot, t) => positionAt(play.players[slot].path, t),
    ballPositionAt: (t) => ballPositionAt(play.ball, t),
    duration: play.duration,
  };
}
```

### 4.2 The Frame Loop

In the viewer/editor component:
```tsx
const PlayViewer = ({ play }: { play: Play }) => {
  const engine = usePlayEngine(play);
  
  return (
    <div>
      {/* Court SVG */}
      <Court>
        {/* Player tokens at engine.positionAt(slot, engine.currentTime) */}
        {play.players.map((player, slot) => {
          const pos = engine.positionAt(slot, engine.currentTime);
          return <PlayerToken key={slot} x={pos.x} y={pos.y} label={player.label} />;
        })}
        
        {/* Ball */}
        {(() => {
          const ball = engine.ballPositionAt(engine.currentTime);
          return <Ball x={ball.x} y={ball.y} inFlight={ball.inFlight} />;
        })()}
        
        {/* Action overlays */}
        {engine.overlays
          .filter(o => o.time <= engine.currentTime && engine.currentTime <= o.time + o.duration)
          .map(o => <Overlay key={o.id} overlay={o} playersMap={play.playersMap} />)}
      </Court>
      
      {/* Transport controls */}
      <TransportControls engine={engine} />
      
      {/* Scrubber timeline */}
      <Scrubber
        currentTime={engine.currentTime}
        duration={engine.duration}
        onChange={engine.seek}
      />
    </div>
  );
};
```

**Key point:** The component queries the engine on every render (`engine.positionAt`, `engine.ballPositionAt`). The engine is fast enough for 60fps.

---

## 5. Performance Targets

Per `ARCHITECTURE.md` §16 and `CLAUDE.md` guardrail #8:

- **Viewer JavaScript bundle:** < 150 KB gzipped (including React, Tailwind, all components)
- **Frame rate:** 60 fps on a mid-range Android phone (Pixel 6a equivalent)
- **Scrubbing:** Responsive (< 16 ms frame time even while scrubbing)
- **Play load time:** Instant (play data already loaded, parsing is fast)

**Achieving these:**
1. Engine functions are tight loops, no allocations in hot paths
2. `overlaysFromActions` is memoized; computed once per play
3. The viewer component only re-renders when `currentTime` changes (usePlayEngine updates a single state)
4. Overlays are pre-filtered by time; only visible ones are rendered
5. SVG rendering is delegated to the browser (no Canvas pixel-pushing in v2)

---

## 6. Engine Testing Strategy

Per `ARCHITECTURE.md` §11, the engine is snapshot-tested:

```ts
describe('positionAt', () => {
  it('returns exact position at keyframe time', () => {
    const path = fixtures.simplePath;
    const pos = positionAt(path, 1000); // 1000ms is a keyframe
    expect(pos).toEqual(fixtures.simplePath.keyframes[1]);
  });

  it('interpolates smoothly between keyframes (cubic)', () => {
    const path = fixtures.curvedPath;
    const halfway = positionAt(path, 1500); // Midway between t=1000 and t=2000
    expect(halfway).toMatchSnapshot();
  });

  it('handles edge cases', () => {
    const path = fixtures.simplePath;
    expect(positionAt(path, -100)).toEqual(path.keyframes[0]);
    expect(positionAt(path, 999999)).toEqual(path.keyframes[path.keyframes.length - 1]);
  });
});

describe('ballPositionAt', () => {
  it('regenerates ball position from fixture play actions', () => {
    const play = fixtures.spreadPR;
    const ballAt3000ms = ballPositionAt(play.ball, 3000);
    expect(ballAt3000ms).toMatchSnapshot();
  });

  it('marks in-flight balls correctly', () => {
    const states = fixtures.ballWithPass;
    const duringPass = ballPositionAt(states, 3000);
    expect(duringPass.inFlight).toBe(true);
  });
});
```

---

## 7. Fixtures

The engine is tested against hand-authored JSON fixture plays, stored in `features/play/fixtures/`:

```
features/play/fixtures/
├── spread-pr.json         # "Spread P&R" (from DATA_MODEL.md §8)
├── triangle-offense.json  # Triangle offense
├── oop-defense.json       # Out-of-bounds play
└── index.ts               # Exports all fixtures as constants
```

Each fixture:
1. Is a valid Play JSON per the Zod schema
2. Tests a specific case (simple motion, complex timing, etc.)
3. Is used in snapshot tests to catch regressions

---

## 8. Rendering Overlays

Overlays are visual cues that explain what's happening. They're drawn on top of the court.

### 8.1 Pass Arrow

```
From: Player A
To: Player B
Draw: Curved arrow from A's position to B's position
Timing: Visible during the pass duration
```

### 8.2 Screen Mark

```
At: Screener's position
Draw: Circle or X mark centered on the screener
Timing: Visible during the screen duration
```

### 8.3 Cut Marker

```
On: Cutting player's path segment
Draw: Highlight or dash pattern on the path
Timing: Visible during the cut
```

### 8.4 Shot Arc

```
From: Shooter's position
To: Basket (50, 89)
Draw: Arc or parabola
Timing: Visible during shot duration
```

**Implementation:** See `ANIMATION_DESIGN.md` §4.3 for `overlaysFromActions` contract. Each overlay type has a handler in the renderer.

---

## 9. Future: AI-Driven Ball Regeneration

This is deferred to v1.1 but documented here for architecture continuity.

When AI editing ships, the flow becomes:

```
User edits play in editor
  ↓
Editor calls regenerateBallStates(actions: Action[]) → BallState
  ↓
Pure function, deterministic:
  - Infers ball position from action sequence
  - Places pass start/end at player positions
  - Interpolates between action times
  - Returns new BallState
  ↓
New BallState is written to play.ball
  ↓
Viewer renders with updated ball motion
```

The function signature is:

```ts
export function regenerateBallStates(
  actions: Action[],
  players: Player[],
  duration: number
): BallState {
  // Deterministic; no side effects
  // For every action, compute ball positions
  // Return { keyframes, type: 'cubic' }
}
```

This function is pure TS and will be exported from `features/play/engine/`. See `AI_INTEGRATION.md` §14.

---

## 10. Notes for Implementers

1. **Test the engine first.** Snapshot tests for `positionAt` and `ballPositionAt` should pass before the viewer is built.
2. **Fixture plays matter.** Spend time hand-authoring good fixtures that cover edge cases.
3. **Performance profile early.** Use DevTools to ensure the loop hits 60fps.
4. **No React in the engine.** If you're tempted to import React in `features/play/engine/`, stop. Import it in the renderer instead.
5. **Overlays are optional in M3.** The viewer works without them; add them after basic animation works.

---

*This document specifies the contract for smooth play animation in CourtVision v2.*
