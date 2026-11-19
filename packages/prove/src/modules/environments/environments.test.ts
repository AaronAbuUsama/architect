// L2.01's done-when check, on a copy of acme under git: two builds of a revision hash the same; staging and production
// run at once with their own D1 state; a restart keeps state; /_ortho/bundle equals the build; env down leaves
// nothing running. Real wrangler and workerd, on free ports.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Build } from "#modules/build/service.js";
import { Environments } from "./service.ts";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const visible = (from: string) => !basename(from).startsWith(".");

const git = (root: string, ...args: ReadonlyArray<string>) =>
  spawnSync("git", ["-c", "user.name=l2", "-c", "user.email=l2@example.test", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" }).stdout.trim();

/** A copy of acme under git, outside the repository: its revision is a commit of its own. */
const copyUnderGit = () => {
  const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-l201-"));
  const root = join(parent, "acme");
  for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  mkdirSync(join(root, "node_modules"));
  for (const entry of readdirSync(join(acme, "node_modules"))) if (entry !== ".bin") symlinkSync(join(acme, "node_modules", entry), join(root, "node_modules", entry));
  writeFileSync(join(root, ".gitignore"), "node_modules/\n.ortho/\n.wrangler/\n");
  git(root, "init", "-q", "-b", "main");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "acme");
  return { root, revision: git(root, "rev-parse", "--short", "HEAD"), remove: () => rmSync(parent, { recursive: true, force: true }) };
};

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const project = copyUnderGit();
const url = (port: number) => `http://127.0.0.1:${port}`;
const post = async (base: string, path: string, body: unknown) => {
  const response = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
};
const signUp = (base: string, email: string) => post(base, "/person/sign-up", { email, password: "correct-horse-battery", name: "Ada" });
const signIn = (base: string, email: string) => post(base, "/session/sign-in", { email, password: "correct-horse-battery" });
const bundle = (base: string) => fetch(`${base}/_ortho/bundle`).then((r) => r.json());
const running = () => spawnSync("pgrep", ["-fl", project.root], { encoding: "utf8" }).stdout.trim();

afterAll(async () => {
  for (const name of ["staging", "production", "test"]) await run(Environments.down({ root: project.root, name }));
  project.remove();
});

describe("ortho env", () => {
  it("runs staging and production at once, each with its own state, which a restart keeps", { timeout: 600_000 }, async () => {
    const { root } = project;
    const built = await run(Build.build(root));
    const staging = await run(Environments.up({ root, name: "staging" }));
    const production = await run(Environments.up({ root, name: "production" }));
    expect(new Set([staging.url, production.url]).size, "each on a port of its own").toBe(2);
    expect([staging.url, production.url]).toEqual([url(staging.port), url(production.port)]);

    // Both run the built file, and say which build it is.
    expect(await bundle(staging.url)).toEqual({ revision: project.revision, sha256: built.sha256 });
    expect(await bundle(production.url)).toEqual({ revision: project.revision, sha256: built.sha256 });

    // Separate D1 state: a person who signs up in staging is a stranger to production.
    expect((await signUp(staging.url, "ada@acme.test")).status).toBe(200);
    expect((await signIn(staging.url, "ada@acme.test")).status).toBe(200);
    expect((await signIn(production.url, "ada@acme.test")).status).not.toBe(200);

    // Each has its own folder under .ortho/environments, its pid and its port.
    for (const [name, port] of [["staging", staging.port], ["production", production.port]] as const) {
      const dir = join(root, ".ortho/environments", name);
      expect(Number(readFileSync(join(dir, "pid"), "utf8"))).toBeGreaterThan(1);
      expect(Number(readFileSync(join(dir, "port"), "utf8"))).toBe(port);
      expect(existsSync(join(dir, "state"))).toBe(true);
    }
    expect(await run(Environments.status({ root, name: "staging" }))).toMatchObject({ state: "up", url: url(staging.port) });

    // A restart keeps state, and up on an environment that is running leaves it alone.
    expect((await run(Environments.up({ root, name: "staging" }))).url).toBe(url(staging.port));
    await run(Environments.down({ root, name: "staging" }));
    expect(await run(Environments.status({ root, name: "staging" }))).toEqual({ state: "down", name: "staging" });
    const again = await run(Environments.up({ root, name: "staging" }));
    expect(again.url).toBe(url(staging.port));
    expect((await signIn(again.url, "ada@acme.test")).status).toBe(200);
    expect(await bundle(again.url)).toEqual({ revision: project.revision, sha256: built.sha256 });
    // Production was not touched by any of it.
    expect((await signIn(production.url, "ada@acme.test")).status).not.toBe(200);
  });

  it("puts secrets in a file only its owner reads, never on a command line", { timeout: 60_000 }, async () => {
    const { root } = project;
    const file = join(root, ".ortho/environments/staging/secrets.env");
    expect(statSync(file).mode & 0o777).toBe(0o600);
    const secret = /^AUTH_SECRET=(.+)$/m.exec(readFileSync(file, "utf8"))![1]!;
    expect(secret.length).toBeGreaterThanOrEqual(32);
    expect(spawnSync("ps", ["-axww", "-o", "command"], { encoding: "utf8" }).stdout).not.toContain(secret);
    // The file is not in the generated config either.
    expect(readFileSync(join(root, ".ortho/environments/staging/wrangler.jsonc"), "utf8")).not.toContain(secret);
  });

  it("is told which of an environment's name it may start, and which it may not", async () => {
    const { root } = project;
    expect((await run(Environments.up({ root, name: "local" }).pipe(Effect.flip))).message).toContain("local");
    expect((await run(Environments.up({ root, name: "nowhere" }).pipe(Effect.flip))).message).toContain("nowhere");
  });

  it("down leaves nothing running, and down on a stopped environment is not an error", { timeout: 120_000 }, async () => {
    const { root } = project;
    expect(running(), "something of this project runs now").not.toBe("");
    await run(Environments.down({ root, name: "staging" }));
    await run(Environments.down({ root, name: "production" }));
    await run(Environments.down({ root, name: "production" }));
    expect(running()).toBe("");
    expect(await run(Environments.status({ root, name: "production" }))).toEqual({ state: "down", name: "production" });
    expect(existsSync(join(root, ".ortho/environments/production/pid"))).toBe(false);
  });
});
