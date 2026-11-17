// The `forman model` command: what the compiler sees in a project, as JSON or as a short summary.
import type { Effect } from "effect";

/** What the command has to say. `main.ts` prints it and exits with `exit`; the module never prints. */
export interface Said {
  readonly out: string;
  readonly err: string;
  readonly exit: number;
}

export interface ModelCommandApi {
  /** Reads `<root>/blueprint` and describes it. An invalid blueprint is an answer too: its problems, exit 2. */
  readonly run: (options: { readonly root: string; readonly json: boolean }) => Effect.Effect<Said>;
}
