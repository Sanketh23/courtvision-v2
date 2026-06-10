/**
 * The play schema — the single source of truth for play data
 * (DATA_MODEL.md §3, CLAUDE.md guardrail #3).
 *
 * Everything that touches a play — engine, viewer, editor, future AI —
 * reads and writes this one schema. Field-level shape lives in the Zod
 * definitions; cross-field semantic rules (times increasing, refs valid)
 * are delegated to the reusable helpers in engine/validate.ts so the same
 * rules apply wherever play data is checked.
 */

import { z } from "zod";
import { collectPlaySemanticIssues } from "@/features/play/engine/validate";

/** Normalized court space: 100 wide × 94 tall, origin top-left (DATA_MODEL §2). */
export const COURT_WIDTH = 100;
export const COURT_HEIGHT = 94;
/** The basket location in court space. */
export const BASKET = { x: 50, y: 89 } as const;

const courtX = z.number().min(0).max(COURT_WIDTH);
const courtY = z.number().min(0).max(COURT_HEIGHT);

export const keyframeSchema = z.object({
  /** Milliseconds from play start. */
  time: z.number().min(0),
  x: courtX,
  y: courtY,
});

export const pathSchema = z.object({
  /** At least 2 keyframes: start and end (DATA_MODEL §3.2). */
  keyframes: z.array(keyframeSchema).min(2),
  /** cubic = Catmull-Rom spline; linear = straight segments. */
  type: z.enum(["linear", "cubic"]),
});

export const playerSchema = z.object({
  id: z.string().min(1),
  slot: z.int().min(0).max(4),
  label: z.string().min(1),
  path: pathSchema,
  attributes: z
    .object({
      number: z.int().optional(),
      color: z.string().optional(),
    })
    .optional(),
});

export const ballKeyframeSchema = keyframeSchema.extend({
  /** true = passed/shot (renderer draws flight); false = dribbled/held. */
  inFlight: z.boolean(),
});

export const ballStateSchema = z.object({
  keyframes: z.array(ballKeyframeSchema).min(2),
  type: z.enum(["linear", "cubic"]),
});

const actionBase = {
  id: z.string().min(1),
  /** When the action starts, in milliseconds. */
  time: z.number().min(0),
  /** How long it lasts, in milliseconds. */
  duration: z.number().min(0),
};

export const passActionSchema = z.object({
  ...actionBase,
  type: z.literal("pass"),
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});

export const screenActionSchema = z.object({
  ...actionBase,
  type: z.literal("screen"),
  screener: z.string().min(1),
  target: z.string().min(1),
  defender: z.string().optional(),
});

export const cutActionSchema = z.object({
  ...actionBase,
  type: z.literal("cut"),
  player: z.string().min(1),
  /** Descriptor ("ball", "basket", a position) — not a player reference. */
  toward: z.string().optional(),
});

export const dribbleActionSchema = z.object({
  ...actionBase,
  type: z.literal("dribble"),
  player: z.string().min(1),
});

export const handoffActionSchema = z.object({
  ...actionBase,
  type: z.literal("handoff"),
  from: z.string().min(1),
  to: z.string().min(1),
});

export const shotActionSchema = z.object({
  ...actionBase,
  type: z.literal("shot"),
  player: z.string().min(1),
  location: z.object({ x: courtX, y: courtY }),
  result: z.enum(["make", "miss"]).optional(),
});

export const catchActionSchema = z.object({
  ...actionBase,
  type: z.literal("catch"),
  player: z.string().min(1),
});

export const actionSchema = z.discriminatedUnion("type", [
  passActionSchema,
  screenActionSchema,
  cutActionSchema,
  dribbleActionSchema,
  handoffActionSchema,
  shotActionSchema,
  catchActionSchema,
]);

export const playSchema = z
  .object({
    id: z.string().min(1),
    teamId: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    // The category vocabulary isn't enumerated in DATA_MODEL.md (the DB column
    // is free-form VARCHAR(50); UI chips show "Offense", "BLOB", …), so this
    // stays an open string until the docs pin it down.
    category: z.string().min(1),
    formation: z.string().optional(),
    tags: z.array(z.string()),
    status: z.enum(["draft", "published", "archived"]),

    // The animation contract:
    players: z.array(playerSchema).length(5),
    ball: ballStateSchema,
    actions: z.array(actionSchema),
    /** Total play length in milliseconds. */
    duration: z.number().positive(),

    // Metadata. DATA_MODEL §3.1's type block says `published?` but its §8
    // example uses `publishedAt`/`publishedBy`; we follow the concrete example.
    createdAt: z.iso.datetime(),
    createdBy: z.string().min(1),
    publishedAt: z.iso.datetime().optional(),
    publishedBy: z.string().min(1).optional(),
  })
  .superRefine((play, ctx) => {
    for (const issue of collectPlaySemanticIssues(play)) {
      ctx.addIssue({ code: "custom", message: issue.message, path: issue.path });
    }
  });

export type Keyframe = z.infer<typeof keyframeSchema>;
export type Path = z.infer<typeof pathSchema>;
export type Player = z.infer<typeof playerSchema>;
export type BallKeyframe = z.infer<typeof ballKeyframeSchema>;
export type BallState = z.infer<typeof ballStateSchema>;
export type PassAction = z.infer<typeof passActionSchema>;
export type ScreenAction = z.infer<typeof screenActionSchema>;
export type CutAction = z.infer<typeof cutActionSchema>;
export type DribbleAction = z.infer<typeof dribbleActionSchema>;
export type HandoffAction = z.infer<typeof handoffActionSchema>;
export type ShotAction = z.infer<typeof shotActionSchema>;
export type CatchAction = z.infer<typeof catchActionSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Play = z.infer<typeof playSchema>;
