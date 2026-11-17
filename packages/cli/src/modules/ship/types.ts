// What the logbook adds to the commands that look at a change: `architect version --next`, `architect impact`'s `next` and
// `stale <ops> in <envs>`, and `generated/model/changes.json` (D3 #1, #14; D3 #64 on where the logbook is found).
import type { Effect } from "effect";
import type { ReleaseEnv } from "@formants/prove";

/** What a command prints and how it exits; only `main.ts` writes it out. */
export interface Said {
  readonly out: string;
  readonly err: string;
  readonly exit: number;
}

export interface ShipOptions {
  readonly root: string;
  /** The process environment, passed in because only `main.ts` reads it. */
  readonly env: ReleaseEnv;
}

export interface ShipApi {
  /** `architect version --next`: the version alone on a line. Needs a logbook: exit 2 with the way to start one when there is none. */
  readonly next: (options: ShipOptions) => Effect.Effect<Said>;
  /**
   * `architect impact`: what changed, what is stale and what is proven. With a logbook: `next <version>` and
   * `stale <ops> in <envs>` (or `stale none`) from its `main` verdicts, and `generated/model/changes.json` written. Without
   * one, or when it doesn't answer, only the local ledger's lines (the second case with a warning on stderr).
   */
  readonly impact: (options: ShipOptions) => Effect.Effect<Said>;
  /**
   * `architect publish --dry-run | --local`: the generated SDK and CLI at the version `architect version --next` says, as
   * production's `publish` list names them. `dry-run` lists exactly what would go out and sends nothing; `local` sends the
   * packages to the registry in `ARCHITECT_REGISTRY`, builds the CLI binary for this machine, and commits the formula to the
   * tap (`ARCHITECT_TAP_REPO`, else `.architect/tap/`). Each line is said as it happens; the result is the exit and any error.
   */
  readonly publish: (options: ShipOptions & { readonly mode: "dry-run" | "local"; readonly say: (line: string) => Effect.Effect<void> }) => Effect.Effect<Said>;
  /** After `architect generate`: write `generated/model/changes.json` when a logbook answers; silent when there is none. */
  readonly changes: (options: ShipOptions) => Effect.Effect<void>;
}
