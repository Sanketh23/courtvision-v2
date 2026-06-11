/**
 * Semantic validation helpers for play data (DATA_MODEL.md §3.2, §6.2).
 *
 * These are pure, structural functions: they accept minimal shapes rather
 * than importing the Zod-inferred types, so they can be reused by the schema
 * refinements, the editor, and the future AI pipeline (AI_INTEGRATION.md §14)
 * without import cycles.
 */

export type SemanticIssue = {
  /** Path into the play object, e.g. ["players", 2, "path", "keyframes"]. */
  path: (string | number)[];
  message: string;
};

type Timed = { time: number };

/** Keyframe times must be strictly increasing (no duplicates, no reversals). */
export function timesStrictlyIncreasing(keyframes: readonly Timed[]): boolean {
  for (let i = 1; i < keyframes.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: bounds guaranteed by loop
    if (keyframes[i]!.time <= keyframes[i - 1]!.time) return false;
  }
  return true;
}

/** A path must begin at t=0 (DATA_MODEL §3.2). */
export function firstKeyframeAtZero(keyframes: readonly Timed[]): boolean {
  return keyframes.length > 0 && keyframes[0]?.time === 0;
}

/** A path's last keyframe must land exactly on the play duration. */
export function lastKeyframeAtDuration(keyframes: readonly Timed[], duration: number): boolean {
  return keyframes.length > 0 && keyframes[keyframes.length - 1]?.time === duration;
}

/** Issues for a single keyframe sequence (player path or ball). */
export function collectKeyframeIssues(
  keyframes: readonly Timed[],
  duration: number,
  path: (string | number)[],
): SemanticIssue[] {
  const issues: SemanticIssue[] = [];
  if (!timesStrictlyIncreasing(keyframes)) {
    issues.push({ path, message: "Keyframe times must be strictly increasing" });
  }
  if (!firstKeyframeAtZero(keyframes)) {
    issues.push({ path, message: "First keyframe must be at time 0" });
  }
  if (!lastKeyframeAtDuration(keyframes, duration)) {
    issues.push({
      path,
      message: `Last keyframe must be at the play duration (${duration}ms)`,
    });
  }
  return issues;
}

type ActionLike = {
  type: string;
  time: number;
  duration: number;
  [key: string]: unknown;
};

/** The player-id fields each action type must reference (DATA_MODEL §3.4). */
const ACTION_PLAYER_REF_FIELDS: Record<string, string[]> = {
  pass: ["from", "to"],
  screen: ["screener", "target"],
  cut: ["player"],
  dribble: ["player"],
  handoff: ["from", "to"],
  shot: ["player"],
  catch: ["player"],
};

/** The player ids an action references (e.g. pass → [from, to]). */
export function actionPlayerRefs(action: ActionLike): string[] {
  const fields = ACTION_PLAYER_REF_FIELDS[action.type] ?? [];
  return fields
    .map((field) => action[field])
    .filter((value): value is string => typeof value === "string");
}

/** Issues for the action list: refs must exist, times must be in bounds. */
export function collectActionIssues(
  actions: readonly ActionLike[],
  playerIds: ReadonlySet<string>,
  duration: number,
): SemanticIssue[] {
  const issues: SemanticIssue[] = [];
  actions.forEach((action, index) => {
    for (const ref of actionPlayerRefs(action)) {
      if (!playerIds.has(ref)) {
        issues.push({
          path: ["actions", index],
          message: `Action references unknown player "${ref}"`,
        });
      }
    }
    if (action.time < 0 || action.time > duration) {
      issues.push({
        path: ["actions", index, "time"],
        message: `Action time must be within [0, ${duration}]`,
      });
    }
  });
  return issues;
}

type PlayerLike = { id: string; slot: number; path: { keyframes: Timed[] } };
type PlayLike = {
  duration: number;
  players: PlayerLike[];
  ball: { keyframes: Timed[] };
  actions: ActionLike[];
};

/**
 * All semantic issues for a play beyond field-level shape checks.
 * Returns an empty array for a semantically valid play.
 *
 * This is the reusable entry point required by AI_INTEGRATION.md §14; the
 * Zod schema's superRefine delegates to it so there is a single source of
 * truth for what "semantically valid" means.
 */
export function collectPlaySemanticIssues(play: PlayLike): SemanticIssue[] {
  const issues: SemanticIssue[] = [];

  if (play.duration <= 0) {
    issues.push({ path: ["duration"], message: "Duration must be greater than 0" });
  }

  const seenSlots = new Set<number>();
  const seenIds = new Set<string>();
  play.players.forEach((player, index) => {
    if (seenSlots.has(player.slot)) {
      issues.push({ path: ["players", index, "slot"], message: `Duplicate slot ${player.slot}` });
    }
    seenSlots.add(player.slot);
    if (seenIds.has(player.id)) {
      issues.push({
        path: ["players", index, "id"],
        message: `Duplicate player id "${player.id}"`,
      });
    }
    seenIds.add(player.id);
    issues.push(
      ...collectKeyframeIssues(player.path.keyframes, play.duration, [
        "players",
        index,
        "path",
        "keyframes",
      ]),
    );
  });

  issues.push(...collectKeyframeIssues(play.ball.keyframes, play.duration, ["ball", "keyframes"]));
  issues.push(...collectActionIssues(play.actions, seenIds, play.duration));

  return issues;
}
