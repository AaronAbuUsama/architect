// The real world `up` and `destroy` act through: Cloudflare's REST API, wrangler as a child process, one GET, the bundle's build. `main.ts` adds the way to wait.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import { Build } from "@orthograph/prove";
import { StagingFailed, type Tools } from "../types.ts";
import { account } from "./cloudflare.ts";

const wranglerBin = join(dirname(fileURLToPath(import.meta.resolve("wrangler/package.json"))), "bin/wrangler.js");

export const live = (pause: Tools["pause"], env: Readonly<Record<string, string | undefined>>): Tools => ({
  account,
  // The credentials are wrangler's environment alone; the rest of the process's environment is the caller's, minus any Cloudflare variable it held.
  wrangler: ({ args, cwd, credentials, input }) =>
    Effect.try({
      try: () => {
        const done = spawnSync(process.execPath, [wranglerBin, ...args], {
          cwd,
          encoding: "utf8",
          ...(input === undefined ? {} : { input }),
          maxBuffer: 64 * 1024 * 1024,
          env: { ...clean(env), CLOUDFLARE_API_TOKEN: credentials.token, CLOUDFLARE_ACCOUNT_ID: credentials.account, CI: "1", NO_COLOR: "1", WRANGLER_SEND_METRICS: "false" },
        });
        return { status: done.status ?? 1, output: `${done.stdout ?? ""}${done.stderr ?? ""}` };
      },
      catch: () => new StagingFailed({ message: "wrangler could not be started" }),
    }),
  probe: (url) => Effect.tryPromise({ try: (signal) => fetch(url, { signal }).then((res) => res.status), catch: () => 0 }).pipe(Effect.orElseSucceed(() => 0)),
  pause,
  secret: () => randomBytes(32).toString("hex"),
  build: (root) =>
    Build.build(root, clean(env)).pipe(
      Effect.map((b) => ({ main: b.main, revision: b.revision, sha256: b.sha256 })),
      Effect.mapError((e) => new StagingFailed({ message: e.message })),
    ),
});

/** The environment with no Cloudflare variable in it: a build never holds a credential. */
const clean = (env: Readonly<Record<string, string | undefined>>): Record<string, string> =>
  Object.fromEntries(Object.entries(env).filter((e): e is [string, string] => e[1] !== undefined && !/^(CLOUDFLARE_|CF_|WRANGLER_)/.test(e[0])));
