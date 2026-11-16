// The npm registry on this machine (Verdaccio): what versions a package has, the next free prerelease, and `npm publish` to it.
import { spawnSync } from "node:child_process";
import { Effect } from "effect";
import { PublishFailed, type Env } from "../types.ts";
import { cleanEnv } from "./env.ts";

/** The registry from `ARCHITECT_REGISTRY`, with its trailing slash; undefined when none is set. */
export const registryOf = (env: Env): string | undefined => {
  const given = env["ARCHITECT_REGISTRY"]?.trim();
  return given ? given.replace(/\/*$/, "/") : undefined;
};

/** The real npm is the cloud pass's: this machine's pass only ever publishes to a registry of its own. */
export const isNpmjs = (registry: string) => new URL(registry).hostname.endsWith("npmjs.org");

const packument = (registry: string, name: string) =>
  fetch(`${registry}${name.replace("/", "%2f")}`, { headers: { accept: "application/json" } }).then((r) =>
    r.status === 404
      ? { versions: [] as ReadonlyArray<string>, tags: {} as Readonly<Record<string, string>> }
      : r.json().then((body) => {
          const found = body as { readonly versions?: Record<string, unknown>; readonly "dist-tags"?: Record<string, string> };
          return { versions: Object.keys(found.versions ?? {}), tags: found["dist-tags"] ?? {} };
        }),
  );

/**
 * The versions a package has on the registry (none when it has never been published), and its dist-tags. A kept-alive connection
 * the registry closed while a long build ran fails once, so a second try is made before the registry is said not to answer.
 */
export const versionsOf = (registry: string, name: string): Effect.Effect<{ readonly versions: ReadonlyArray<string>; readonly tags: Readonly<Record<string, string>> }, PublishFailed> =>
  Effect.tryPromise({
    try: () => packument(registry, name).catch(() => packument(registry, name)),
    catch: () => new PublishFailed({ message: `the registry at ${registry} didn't answer: is it running?` }),
  });

/** `<version>-next.<n>`, one past the highest `n` any of the packages already has. */
export const nextPrerelease = (registry: string, names: ReadonlyArray<string>, version: string) =>
  Effect.gen(function* () {
    const prefix = `${version}-next.`;
    let highest = 0;
    for (const name of names) {
      for (const have of (yield* versionsOf(registry, name)).versions) {
        const n = have.startsWith(prefix) ? Number(have.slice(prefix.length)) : NaN;
        if (Number.isInteger(n) && n > highest) highest = n;
      }
    }
    return `${prefix}${highest + 1}`;
  });

/** `npm publish` of a built package under a dist-tag, to the registry given: the token is in the npmrc `NPM_CONFIG_USERCONFIG` names, never on the command line. */
export const publishPackage = (options: { readonly dir: string; readonly registry: string; readonly tag: string; readonly env: Env }): Effect.Effect<void, PublishFailed> =>
  Effect.try({
    try: () => {
      const run = spawnSync("npm", ["publish", "--registry", options.registry, "--tag", options.tag, "--access", "public", "--ignore-scripts"], {
        cwd: options.dir, encoding: "utf8", env: cleanEnv(options.env), maxBuffer: 16 * 1024 * 1024,
      });
      if (run.status !== 0) throw new Error(`npm publish to ${options.registry} failed:\n${(run.stderr || run.stdout).trim().split("\n").slice(0, 8).join("\n")}`);
    },
    catch: (e) => new PublishFailed({ message: String((e as { message?: unknown }).message ?? e) }),
  });
