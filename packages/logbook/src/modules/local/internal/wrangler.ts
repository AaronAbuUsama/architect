import { spawn, type ChildProcess } from "node:child_process";
import { openSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import type { Launch, LaunchOptions } from "../types.ts";

const bin = join(dirname(fileURLToPath(import.meta.resolve("wrangler/package.json"))), "bin/wrangler.js");
const config = join(dirname(fileURLToPath(import.meta.url)), "../../../../wrangler.jsonc");

export const launch = ({ port, state, policy }: LaunchOptions): Launch => {
  const vars = {
    OIDC_ISSUER: policy.issuer,
    OIDC_JWKS_URL: policy.jwksUrl,
    OIDC_AUDIENCE: policy.audience ?? "forman-logbook",
    ALLOWED_REPOSITORY: policy.repository,
    ALLOWED_REFS: policy.refs.join(","),
    ALLOWED_WORKFLOWS: policy.workflows.join(","),
  };
  return {
    command: process.execPath,
    args: [bin, "dev", "--config", config, "--port", String(port), "--ip", "127.0.0.1", "--persist-to", state, "--inspector-port", "0",
      ...Object.entries(vars).flatMap(([k, v]) => ["--var", `${k}:${v}`])],
    env: { CI: "1", WRANGLER_SEND_METRICS: "false" },
  };
};

/** The launch as a child of this process, its output appended to `log`. */
export const spawnLaunch = (run: Launch, log: string) =>
  Effect.sync((): ChildProcess => {
    const out = openSync(log, "a");
    return spawn(run.command, [...run.args], { stdio: ["ignore", out, out], env: { ...process.env, ...run.env } });
  });

export const stop = (child: ChildProcess) =>
  Effect.callback<void>((resume) => {
    if (child.exitCode !== null) return resume(Effect.void);
    child.once("exit", () => resume(Effect.void));
    child.kill("SIGTERM");
  });
