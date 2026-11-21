// Where a run's Alchemy stack, its input and its state are, and how Alchemy is asked to deploy or destroy it. The stack is generated (`generated/infra/alchemy.run.ts`); the rest is the run's.
import { join } from "node:path";
import { Effect } from "effect";
import { StagingFailed, type Credentials, type Tools } from "../types.ts";

/** The run's folder: the input the stack reads, and Alchemy's local state (`.alchemy/`), which is where Alchemy is run from. */
export const runDir = (root: string, prefix: string) => join(root, ".ortho/staging", prefix);
export const inputPath = (root: string, prefix: string) => join(runDir(root, prefix), "stack-input.json");
export const stackPath = (root: string) => join(root, "generated/infra/alchemy.run.ts");
export const statePath = (root: string, prefix: string) => join(runDir(root, prefix), ".alchemy/state");

/** What Alchemy's own error text can hold is cut short and never holds the token or the account id. */
export const clip = (text: string, c: Credentials) => text.split(c.token).join("[token]").split(c.account).join("[account]").trim().split("\n").slice(-6).join(" | ").slice(0, 300);

/** `alchemy deploy|destroy` of the generated stack at the run's stage. The secret reaches the stack by the environment, never an argument. */
export const alchemy = (tools: Tools, credentials: Credentials, root: string, prefix: string, verb: "deploy" | "destroy", secret: string): Effect.Effect<{ readonly status: number; readonly output: string }, StagingFailed> =>
  tools.alchemy({
    args: [verb, stackPath(root), "--stage", prefix, "--yes"],
    cwd: runDir(root, prefix),
    credentials,
    env: { ORTHO_STAGING_INPUT: inputPath(root, prefix), ORTHO_AUTH_SECRET: secret },
  });
