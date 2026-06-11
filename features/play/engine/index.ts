/**
 * The animation engine: pure, framework-agnostic functions that turn play
 * JSON into positions over time (ANIMATION_DESIGN.md §3).
 *
 * No React imports anywhere in this folder — enforced by no-react.test.ts.
 */

export { type BallPoint, ballPositionAt } from "@/features/play/engine/ball";
export { regenerateBallStates } from "@/features/play/engine/ball-regen";
export { catmullRom, lerp } from "@/features/play/engine/catmull";
export {
  type CourtPoint,
  interpolateKeyframes,
  segmentIndexAt,
} from "@/features/play/engine/interpolate";
export {
  type CutMarkerOverlay,
  type Overlay,
  overlaysFromActions,
  type PassArrowOverlay,
  type ScreenMarkOverlay,
  type ShotArcOverlay,
} from "@/features/play/engine/overlays";
export { positionAt } from "@/features/play/engine/position";
export {
  actionPlayerRefs,
  collectActionIssues,
  collectKeyframeIssues,
  collectPlaySemanticIssues,
  firstKeyframeAtZero,
  lastKeyframeAtDuration,
  type SemanticIssue,
  timesStrictlyIncreasing,
} from "@/features/play/engine/validate";
