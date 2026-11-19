// The meters module: the portal's own small components, built on Pro's tokens (design/portal.md, "Component inventory").
export const meterNames = ["CallsMeter", "EnvironmentPill", "Move"] as const;
export type MeterName = (typeof meterNames)[number];

/** One window's calls by outcome. */
export interface CallsSplit {
  readonly answered: number;
  readonly refused: number;
  readonly defects: number;
}

export interface CallsMeterProps {
  readonly split: CallsSplit;
  readonly size?: "sm" | "md";
  readonly legend?: boolean;
  /** What the meter is about, for the screen reader ("handle"). */
  readonly label?: string;
  /** Mark the numbers with `data-portal="stat"` (`data-stat`, `data-value`) for a page that carries its data in attributes. */
  readonly hooks?: boolean;
}

export interface EnvironmentPillProps {
  readonly name: string;
  /** Is a source reading it now. */
  readonly live?: boolean;
  /** What it runs on, from the environment's `cloud` and `database` ("D1 local"). */
  readonly runsOn?: string;
  readonly size?: "sm" | "md";
}

/** A machine move: from any of `from` (none means it creates) to `to`. */
export interface MoveProps {
  readonly from: ReadonlyArray<string>;
  readonly to: ReadonlyArray<string>;
}
