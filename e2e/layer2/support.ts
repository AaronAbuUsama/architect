// What every Gate 2 check shares, on top of layer 1's support: the architect command with an environment and a
// timeout, a project under git, the planted fixtures, and the generated acme CLI against a running environment.
//
// THE CONTRACT THE CHECKS HOLD THE BUILD TO (D3 #14 names the commands and their output lines; where it is open,
// this is the simplest reading, and each check repeats what it relies on at its top):
//
// - Everything an environment or command needs from outside comes through the process environment, which only
//   main.ts reads: ARCHITECT_OIDC_ISSUER (the issuer URL, `http://127.0.0.1:<port>/architect`), ARCHITECT_OIDC_CLIENT
//   (the scenario a run mints its verdict token as, default `ci-main`), ARCHITECT_OIDC_REPOSITORY / _REF / _WORKFLOW
//   (the claims the logbook demands), ARCHITECT_LIFETIME, ARCHITECT_REGISTRY (an npm registry URL),
//   NPM_CONFIG_USERCONFIG (an npmrc, which holds the registry token), ARCHITECT_TAP_REPO (a local git repository the
//   formula is committed to) and ARCHITECT_FORMULA (its name).
// - `architect env up <env> --port <n>` picks the port; every later command finds a running environment through its
//   pidfile under `.architect/environments/<env>/`. `env up` runs the latest built bundle, building the current
//   revision first when there is none. `env down` on an environment that isn't running is not an error.
// - Ports: check N owns 8900 + 10N .. 8909 + 10N (layer 1 owns 8810..8899); registries are on 4890 + N.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";
import { acme, cli, copyOf, nothingRunning } from "../layer1/support.ts";

export { acme, cli, copyOf, nothingRunning };

export const ports = (n: number) => {
  const base = 8900 + 10 * n;
  return { test: base, staging: base + 1, production: base + 2, logbook: base + 3, issuer: base + 4, rogue: base + 5, local: base + 6, registry: 4890 + n };
};
export type Ports = ReturnType<typeof ports>;

export type Said = { status: number | null; stdout: string; stderr: string; out: string; lines: ReadonlyArray<string> };
const said = (r: { status: number | null; stdout: string; stderr: string }): Said => {
  const out = `${r.stdout}${r.stderr}`;
  return { ...r, out, lines: out.split("\n") };
};

/** The architect command as a user runs it, with an environment and a time limit. */
export const run = (root: string, env: Readonly<Record<string, string>>, ...args: ReadonlyArray<string>): Said =>
  said(spawnSync(process.execPath, [cli, ...args, "--root", root], {
    cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...env }, timeout: 600_000, killSignal: "SIGKILL" }));

/** The architect command left running, for a run a check kills part-way. */
export const start = (root: string, env: Readonly<Record<string, string>>, ...args: ReadonlyArray<string>): ChildProcess =>
  spawn(process.execPath, [cli, ...args, "--root", root], { cwd: root, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const until = async (what: string, ready: () => boolean | Promise<boolean>, ms = 120_000) => {
  for (const started = Date.now(); Date.now() - started < ms;) {
    if (await ready()) return;
    await sleep(250);
  }
  throw new Error(`never became true: ${what}`);
};

export const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

// ---- a project under git ----

const git = (root: string, ...args: ReadonlyArray<string>) => {
  const r = spawnSync("git", ["-c", "user.name=gate2", "-c", "user.email=gate2@example.test", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" });
  expect(r.status, r.stderr).toBe(0);
  return r.stdout.trim();
};

/** The revision is the git commit (D3 #14), so a check's copy is a repository: node_modules and Architect's own state are ignored. */
export const initGit = (root: string) => {
  writeFileSync(join(root, ".gitignore"), "node_modules/\n.architect/\n.wrangler/\n");
  git(root, "init", "-q", "-b", "main");
  return commit(root, "acme");
};
export const commit = (root: string, message: string) => {
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", message);
  return git(root, "rev-parse", "--short", "HEAD");
};

/** A copy of acme as a git repository, and what to do to it: `install` a planted fixture over a path of the copy. */
export const project = () => {
  const copy = copyOf(acme);
  const rev = initGit(copy.root);
  return { ...copy, rev };
};
export const install = (root: string, fixture: string, to: string) =>
  cpSync(join(acme, "test/fixtures/layer2", fixture), join(root, to));

/** Every operation and read in the project's compiled model, by name (`allowance.spend`). */
export const operations = (root: string): ReadonlyArray<string> =>
  Object.keys((JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { operations: Record<string, unknown> }).operations);

export const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---- the generated acme CLI against a running environment ----

/** `acme <args>` as a person: ACME_URL names the environment, ACME_TOKEN signs the call in (never printed). */
export const acmeCli = (root: string, url: string, token: string | undefined, ...args: ReadonlyArray<string>) =>
  said(spawnSync(process.execPath, [join(root, "generated/cli/src/main.ts"), ...args], {
    encoding: "utf8", timeout: 120_000, killSignal: "SIGKILL",
    env: { ...process.env, ACME_URL: url, ...(token === undefined ? {} : { ACME_TOKEN: token }) } }));

export type Person = { readonly email: string; readonly password: string; readonly person: string; readonly token: string };

/** A person who signs up and signs in on a real environment (Better Auth's, not a world's cast). */
export const signUp = (root: string, url: string, name: string): Person => {
  const email = `${name}@acme.test`;
  const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  const up = acmeCli(root, url, undefined, "person", "sign-up", "--email", email, "--password", password, "--name", name);
  expect(up.status, up.stderr).toBe(0);
  const inn = acmeCli(root, url, undefined, "session", "sign-in", "--email", email, "--password", password, "--json");
  expect(inn.status, inn.stderr).toBe(0);
  return { email, password, person: up.stdout.trim(), token: (JSON.parse(inn.stdout) as { token: string }).token };
};

/** ada owns an organisation and has granted olga an allowance of 500; bob is signed in and is nobody's. */
export const seed = (root: string, url: string) => {
  const ada = signUp(root, url, "ada");
  const olga = signUp(root, url, "olga");
  const bob = signUp(root, url, "bob");
  const organization = acmeCli(root, url, ada.token, "organization", "create", "--name", "Acme Demo", "--cap", "1000");
  expect(organization.status, organization.stderr).toBe(0);
  const grant = acmeCli(root, url, ada.token, "allowance", "grant", "--organization", organization.stdout.trim(), "--member", olga.person, "--limit", "500");
  expect(grant.status, grant.stderr).toBe(0);
  return { ada, olga, bob, organization: organization.stdout.trim(), allowance: grant.stdout.trim() };
};

export const getJson = async <T>(url: string, headers: Readonly<Record<string, string>> = {}) => {
  const response = await fetch(url, { headers });
  expect(response.status, url).toBe(200);
  return (await response.json()) as T;
};
