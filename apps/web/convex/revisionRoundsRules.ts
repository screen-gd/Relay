/**
 * Pure revision-round and scope rules (#78). No database access, so every
 * rule is unit-testable and the AI never computes a count or an amount.
 *
 * Revision Round: one client feedback cycle on a Project Output that the
 * editor closes by delivering the next Media Version. Version N+1 closes a
 * round when version N received at least one client comment before N+1 was
 * created. Comments are counted per version, not individually, and versions
 * delivered without intervening client feedback do not count. A version with
 * feedback but no successor is an open round: shown, not counted.
 */

export type RoundVersion = {
  versionNumber: number;
  /** ISO time the Media Version was created. */
  createdAt: string;
  /** ISO time of the earliest client comment on this version, if any. */
  firstFeedbackAt: string | null;
};

export type OutputRounds = {
  /** Rounds closed by delivered versions, before any editor correction. */
  computed: number;
  /** Version numbers that closed a round, ascending. */
  closingVersions: number[];
  /** The current version has client feedback waiting for a new version. */
  openRound: boolean;
};

/** Counts closed revision rounds for one Project Output. */
export function countOutputRounds(versions: RoundVersion[]): OutputRounds {
  const sorted = [...versions].sort(
    (a, b) => a.versionNumber - b.versionNumber
  );
  const closingVersions: number[] = [];
  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1];
    const next = sorted[index];
    if (
      previous.firstFeedbackAt !== null &&
      !(Date.parse(previous.firstFeedbackAt) > Date.parse(next.createdAt))
    )
      closingVersions.push(next.versionNumber);
  }
  const latest = sorted[sorted.length - 1];
  return {
    computed: closingVersions.length,
    closingVersions,
    openRound: Boolean(latest && latest.firstFeedbackAt !== null),
  };
}

export const MAX_INCLUDED_ROUNDS = 50;
export const MAX_ROUND_ADJUSTMENT = 200;

/** Rounds after the editor's correction, never below zero. */
export function correctedRounds(computed: number, adjustment: number) {
  return Math.max(0, computed + adjustment);
}

/** Adjustment that makes the counted rounds equal `rounds`. */
export function adjustmentFor(computed: number, rounds: number) {
  if (
    !Number.isSafeInteger(rounds) ||
    rounds < 0 ||
    rounds > MAX_ROUND_ADJUSTMENT
  )
    throw new Error(
      `Rounds must be a whole number from 0 to ${MAX_ROUND_ADJUSTMENT}`
    );
  return rounds - computed;
}

export type LimitSource = "project" | "template" | "workspace";

/**
 * Included rounds, applied per output or per project by `RoundBasis`. The
 * Project limit wins, then the Workflow Template (package) limit, then the
 * Workspace default. Null means no limit was set, so rounds can never exceed
 * scope.
 */
export function resolveIncludedRounds(limits: {
  project?: number;
  template?: number;
  workspace?: number;
}): { includedRounds: number | null; source: LimitSource | null } {
  for (const source of ["project", "template", "workspace"] as const) {
    const value = limits[source];
    if (value !== undefined) return { includedRounds: value, source };
  }
  return { includedRounds: null, source: null };
}

/**
 * What Included Rounds cover: each Project Output separately, or every
 * output of the Project together.
 */
export type RoundBasis = "per_output" | "per_project";
export type BasisSource = "project" | "workspace" | "default";

/** The Project choice wins, then the Workspace default, then per output. */
export function resolveRoundBasis(bases: {
  project?: RoundBasis;
  workspace?: RoundBasis;
}): { roundBasis: RoundBasis; source: BasisSource } {
  if (bases.project) return { roundBasis: bases.project, source: "project" };
  if (bases.workspace)
    return { roundBasis: bases.workspace, source: "workspace" };
  return { roundBasis: "per_output", source: "default" };
}

/**
 * Billable extra rounds for a Project. Per output, each output's rounds over
 * the limit add up. Per project, rounds of all outputs are summed before the
 * limit applies, so no single output carries billable extra rounds.
 */
export function scopeExtraRounds(
  basis: RoundBasis,
  roundsUsed: readonly number[],
  includedRounds: number | null
): { total: number; perOutput: number[] } {
  if (basis === "per_project")
    return {
      total: extraRounds(
        roundsUsed.reduce((sum, rounds) => sum + rounds, 0),
        includedRounds
      ),
      perOutput: roundsUsed.map(() => 0),
    };
  const perOutput = roundsUsed.map((rounds) =>
    extraRounds(rounds, includedRounds)
  );
  return { total: perOutput.reduce((sum, extra) => sum + extra, 0), perOutput };
}

/** Validates an editor-entered included-rounds limit. */
export function checkIncludedRounds(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_INCLUDED_ROUNDS)
    throw new Error(
      `Included rounds must be a whole number from 0 to ${MAX_INCLUDED_ROUNDS}`
    );
  return value;
}

export function extraRounds(roundsUsed: number, includedRounds: number | null) {
  return includedRounds === null ? 0 : Math.max(0, roundsUsed - includedRounds);
}

export const MAX_RATE = 1_000_000;
export const MAX_EXTRA_HOURS = 500;

/** Validates a saved rate and rounds it to cents. */
export function checkRate(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > MAX_RATE)
    throw new Error(`Rates must be between 0 and ${MAX_RATE}`);
  return Math.round(value * 100) / 100;
}

/** Validates extra work hours in quarter-hour steps. */
export function checkExtraHours(value: number) {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_EXTRA_HOURS ||
    !Number.isInteger(value * 4)
  )
    throw new Error(
      `Extra hours must be 0 to ${MAX_EXTRA_HOURS} in quarter hours`
    );
  return value;
}

export type ExtraCharges = {
  extraRounds: number | null;
  extraHours: number | null;
  /** Null unless every billed component has a saved rate. */
  total: number | null;
};

/** Computes change-order amounts in whole cents to avoid float drift. */
export function extraCharges(options: {
  extraRounds: number;
  extraHours: number;
  extraRoundRate: number | null;
  extraHourRate: number | null;
}): ExtraCharges {
  const cents = (rate: number | null, quantity: number) =>
    quantity === 0
      ? 0
      : rate === null
        ? null
        : Math.round(Math.round(rate * 100) * quantity);
  const rounds = cents(options.extraRoundRate, options.extraRounds);
  const hours = cents(options.extraHourRate, options.extraHours);
  const amount = (value: number | null, quantity: number) =>
    value === null || quantity === 0 ? null : value / 100;
  return {
    extraRounds: amount(rounds, options.extraRounds),
    extraHours: amount(hours, options.extraHours),
    total:
      rounds === null || hours === null || rounds + hours === 0
        ? null
        : (rounds + hours) / 100,
  };
}
