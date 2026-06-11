/**
 * Hand-authored fixture plays (ANIMATION_DESIGN.md §7).
 *
 * Each fixture is plain JSON parsed through the play schema at module load,
 * so an invalid fixture fails fast everywhere it's used. The plain-JSON
 * round trip is deliberate: it proves plays load from raw JSON objects,
 * which is the same path AI-generated plays will take (AI_INTEGRATION.md §14).
 */

import { type Play, playSchema } from "@/features/play/schemas";
import giveAndGoJson from "./give-and-go.json";
import spreadPrJson from "./spread-pr.json";
import stationaryJson from "./stationary.json";

/** "Spread P&R" — the reference play from DATA_MODEL.md §8. Cubic paths. */
export const spreadPr: Play = playSchema.parse(spreadPrJson);

/** "Give and Go" — linear paths with hand-verifiable midpoints; pass/cut/shot. */
export const giveAndGo: Play = playSchema.parse(giveAndGoJson);

/** All players stationary — zero-motion edge case for cubic interpolation. */
export const stationary: Play = playSchema.parse(stationaryJson);

/** Fixtures keyed by play id, for lookup by routes and tests. */
export const fixturePlays: Record<string, Play> = {
  [spreadPr.id]: spreadPr,
  [giveAndGo.id]: giveAndGo,
  [stationary.id]: stationary,
};
