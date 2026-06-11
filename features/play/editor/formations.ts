/**
 * Starting formations for the new-play flow (UI_WORKFLOWS.md §7.10).
 *
 * Each formation places the 5 players at t=0 in normalized court space
 * (DATA_MODEL.md §2: 100×94, basket at 50,89, offense attacks the basket
 * at the bottom). Positions are pure data; createNewPlay() turns a chosen
 * formation into a schema-valid draft Play with a single keyframe each.
 */

import { type Play, playSchema } from "@/features/play/schemas";

export type FormationId = "horns" | "1-4-high" | "box" | "stack" | "spread" | "custom";

export type FormationOption = { id: FormationId; label: string; description: string };

/** Picker options, in display order (UI_WORKFLOWS.md §7.10). */
export const FORMATION_OPTIONS: FormationOption[] = [
  { id: "horns", label: "Horns", description: "Two bigs at the elbows, two in the corners" },
  { id: "1-4-high", label: "1-4 High", description: "Four across the free-throw-line extended" },
  { id: "box", label: "Box", description: "Four in a box around the lane, one up top" },
  { id: "stack", label: "Stack", description: "Players stacked near the lane" },
  { id: "spread", label: "Spread", description: "Five-out, spaced around the arc" },
  { id: "custom", label: "Custom", description: "A neutral arrangement to build from" },
];

/** Default labels per slot (PG, SG, SF, PF, C). */
const SLOT_LABELS = ["PG", "SG", "SF", "PF", "C"] as const;

/** Per-formation slot positions, indexed by slot 0–4. */
const FORMATION_POSITIONS: Record<FormationId, ReadonlyArray<{ x: number; y: number }>> = {
  // PG up top, wings at the slots, bigs at the elbows.
  horns: [
    { x: 50, y: 24 },
    { x: 18, y: 40 },
    { x: 82, y: 40 },
    { x: 38, y: 56 },
    { x: 62, y: 56 },
  ],
  // PG up top, four strung along the free-throw-line extended.
  "1-4-high": [
    { x: 50, y: 26 },
    { x: 20, y: 44 },
    { x: 40, y: 44 },
    { x: 60, y: 44 },
    { x: 80, y: 44 },
  ],
  // PG up top, four around the lane in a box.
  box: [
    { x: 50, y: 22 },
    { x: 36, y: 50 },
    { x: 64, y: 50 },
    { x: 36, y: 70 },
    { x: 64, y: 70 },
  ],
  // Stacked down the middle near the lane.
  stack: [
    { x: 50, y: 28 },
    { x: 50, y: 44 },
    { x: 50, y: 58 },
    { x: 42, y: 72 },
    { x: 58, y: 72 },
  ],
  // Five-out: PG up top, wings, corners.
  spread: [
    { x: 50, y: 22 },
    { x: 16, y: 42 },
    { x: 84, y: 42 },
    { x: 24, y: 66 },
    { x: 76, y: 66 },
  ],
  // Neutral default for "build it yourself".
  custom: [
    { x: 50, y: 30 },
    { x: 25, y: 45 },
    { x: 75, y: 45 },
    { x: 35, y: 65 },
    { x: 65, y: 65 },
  ],
};

/** Default new-play duration, in milliseconds (UI_WORKFLOWS.md §7.10). */
export const DEFAULT_PLAY_DURATION = 4000;

/**
 * Build a fresh draft Play from a formation. Every player gets a single
 * keyframe at t=0; the ball starts with the PG (slot 0). The returned play
 * is schema-validated, so the editor always opens on valid data.
 *
 * `teamId` and `createdBy` come from the caller (the acting coach); the id
 * is a placeholder until the first save assigns the database UUID.
 */
export function createNewPlay(args: {
  formation: FormationId;
  teamId: string;
  createdBy: string;
  name?: string;
  duration?: number;
}): Play {
  const duration = args.duration ?? DEFAULT_PLAY_DURATION;
  const positions = FORMATION_POSITIONS[args.formation];

  const players = positions.map((pos, slot) => ({
    id: `player_${slot}`,
    slot,
    label: SLOT_LABELS[slot] ?? `P${slot}`,
    path: {
      keyframes: [
        { time: 0, x: pos.x, y: pos.y },
        { time: duration, x: pos.x, y: pos.y },
      ],
      type: "cubic" as const,
    },
  }));

  const start = positions[0] ?? { x: 50, y: 47 };
  const play = {
    id: "draft",
    teamId: args.teamId,
    name: args.name ?? "Untitled play",
    category: "offense",
    formation: args.formation === "custom" ? undefined : args.formation,
    tags: [] as string[],
    status: "draft" as const,
    duration,
    players,
    ball: {
      keyframes: [
        { time: 0, x: start.x, y: start.y, inFlight: false },
        { time: duration, x: start.x, y: start.y, inFlight: false },
      ],
      type: "cubic" as const,
    },
    actions: [],
    createdAt: new Date().toISOString(),
    createdBy: args.createdBy,
  };

  return playSchema.parse(play);
}
