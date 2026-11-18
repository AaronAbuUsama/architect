// The services around Gate 2's environments, each started and stopped by the check that needs it: the local OIDC issuer
// (D3 #8), Verdaccio (D3 #9, as tools/e2e/starter.sh starts it) and the logbook and environments through ortho itself.
import { generateKeyPairSync, createSign, randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect } from "vitest";
import { type Ports, nothingRunning, ports, repo, run, sleep, until } from "./support.ts";

const ISSUER_IMAGE = "ghcr.io/navikt/mock-oauth2-server:6.1.4@sha256:647dd8c78a54f0e6fcd58d79c884e612f8f998a0662276f3e1db22e464a50192";
const REGISTRY_IMAGE = "verdaccio/verdaccio:6.11.1";

const docker = (...args: ReadonlyArray<string>) => spawnSync("docker", args, { encoding: "utf8" });
const remove = (name: string) => void docker("rm", "-f", name);

/** The claims a GitHub Actions job would carry for `ortho-logbook`, per scenario (D3 #8). */
const scenarios = {
  interactiveLogin: false,
  tokenCallbacks: [{
    issuerId: "ortho",
    tokenExpiry: 600,
    requestMappings: [{
      requestParam: "client_id",
      match: "ci-main",
      claims: { sub: "repo:acme/acme:ref:refs/heads/main", aud: ["ortho-logbook"], repository: "acme/acme", ref: "refs/heads/main", workflow: "ortho" },
    }],
  }],
};

export const trusted = { repository: "acme/acme", ref: "refs/heads/main", workflow: "ortho" };

/** A real OIDC server: a scenario is a client id, and a token for it carries that scenario's claims. */
export const startIssuer = async (name: string, port: number, dir: string) => {
  const config = join(dir, "issuer.json");
  writeFileSync(config, JSON.stringify(scenarios));
  chmodSync(config, 0o644);
  remove(name);
  const started = docker("run", "-d", "--name", name, "-p", `127.0.0.1:${port}:8080`, "-e", "JSON_CONFIG_PATH=/config/issuer.json", "-v", `${config}:/config/issuer.json:ro`, ISSUER_IMAGE);
  expect(started.status, started.stderr).toBe(0);
  const url = `http://127.0.0.1:${port}/ortho`;
  await until(`issuer ${url}`, () => fetch(`${url}/.well-known/openid-configuration`).then((r) => r.ok, () => false), 60_000);
  return url;
};

/** A token the issuer mints for a scenario (client credentials; the server does not check the secret). */
export const mintToken = async (issuer: string, client = "ci-main") => {
  const response = await fetch(`${issuer}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: client, client_secret: "unused" }),
  });
  expect(response.status).toBe(200);
  return ((await response.json()) as { access_token: string }).access_token;
};

/** The same token, claims and key id intact, with a signature from a key of the forger's own. */
export const forge = (token: string) => {
  const [header, payload] = token.split(".");
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const signature = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
};

/** Verdaccio, with the project's own names never proxied to npm; and an npmrc holding a throwaway token, kept in `dir`. */
export const startRegistry = async (name: string, port: number, dir: string) => {
  const storage = join(dir, "registry");
  mkdirSync(storage, { recursive: true });
  chmodSync(storage, 0o777);
  remove(name);
  const started = docker("run", "-d", "--name", name, "-p", `127.0.0.1:${port}:4873`,
    "-v", `${join(import.meta.dirname, "verdaccio.yaml")}:/verdaccio/conf/config.yaml:ro`, "-v", `${storage}:/verdaccio/storage`, REGISTRY_IMAGE);
  expect(started.status, started.stderr).toBe(0);
  const url = `http://localhost:${port}/`;
  await until(`registry ${url}`, () => fetch(`${url}-/ping`).then((r) => r.ok, () => false), 90_000);
  // The token goes to a file and nowhere else: not to the output, not to a command line.
  const password = randomBytes(16).toString("hex");
  const created = await fetch(`${url}-/user/org.couchdb.user:e2e`, {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "e2e", password }) });
  expect(created.status).toBeLessThan(300);
  const npmrc = join(dir, "npmrc");
  writeFileSync(npmrc, `//localhost:${port}/:_authToken=${((await created.json()) as { token: string }).token}\n`, { mode: 0o600 });
  return { url, npmrc };
};

export type Stack = {
  readonly ports: Ports;
  /** The environment variables a command needs: issuer, trusted claims, and the registry when there is one. */
  readonly env: Readonly<Record<string, string>>;
  readonly issuer: string;
  readonly rogue: string | undefined;
  readonly registry: string | undefined;
  readonly logbook: string;
  /** The URL of an environment started by `up`. */
  readonly url: (environment: "test" | "staging" | "production") => string;
  readonly up: (environment: "test" | "staging" | "production", extra?: Readonly<Record<string, string>>) => void;
  readonly down: (environment: "test" | "staging" | "production") => void;
  /** Stop everything this stack started and remove what it made; the problems it met, empty when all went clean. */
  readonly stop: () => ReadonlyArray<string>;
};

/** The local OIDC issuer, the logbook (`ortho env up logbook`) and, if asked, a rogue second issuer and Verdaccio. */
export const startStack = async (root: string, check: number, options: { readonly registry?: boolean; readonly rogue?: boolean; readonly env?: Readonly<Record<string, string>> } = {}): Promise<Stack> => {
  const p = ports(check);
  const dir = mkdtempSync(join(tmpdir(), "ortho-gate2-"));
  const id = `${process.pid}-${check}`;
  const containers = [`ortho-l2-issuer-${id}`, `ortho-l2-rogue-${id}`, `ortho-l2-registry-${id}`];
  const running = new Set<string>();
  const problems: Array<string> = [];
  const stop = () => {
    for (const name of [...running].reverse()) {
      const down = run(root, env, "env", "down", name);
      if (down.status !== 0) problems.push(`env down ${name}: ${down.out.slice(-500)}`);
    }
    running.clear();
    // Verdaccio owns its mounted files on Linux. Empty only this stack's live registry before removing it,
    // as the publishing fixture does; absent/no-registry and failed-start stacks still remove their own containers.
    if (options.registry) {
      const registry = docker("inspect", "-f", "{{.State.Running}}", containers[2]!);
      if (registry.status === 0 && registry.stdout.trim() === "true") {
        const emptied = docker("exec", containers[2]!, "sh", "-c", "rm -rf /verdaccio/storage/*");
        if (emptied.status !== 0) problems.push(`registry storage cleanup: ${emptied.stderr.trim()}`);
      }
    }
    for (const name of containers) remove(name);
    rmSync(dir, { recursive: true, force: true });
    return problems;
  };
  const env: Record<string, string> = {};
  try {
    const issuer = await startIssuer(containers[0]!, p.issuer, dir);
    const rogue = options.rogue ? await startIssuer(containers[1]!, p.rogue, dir) : undefined;
    const registry = options.registry ? await startRegistry(containers[2]!, p.registry, dir) : undefined;
    Object.assign(env, {
      ORTHO_OIDC_ISSUER: issuer, ORTHO_OIDC_CLIENT: "ci-main",
      ORTHO_OIDC_REPOSITORY: trusted.repository, ORTHO_OIDC_REF: trusted.ref, ORTHO_OIDC_WORKFLOW: trusted.workflow,
      HOMEBREW_NO_AUTO_UPDATE: "1", HOMEBREW_NO_ANALYTICS: "1", ...options.env,
      ...(registry ? { ORTHO_REGISTRY: registry.url, NPM_CONFIG_USERCONFIG: registry.npmrc } : {}),
    });
    const up = (name: string, port: number, extra: Readonly<Record<string, string>> = {}) => {
      const said = run(root, { ...env, ...extra }, "env", "up", name, "--port", String(port));
      running.add(name);
      expect(said.status, said.out.slice(-2000)).toBe(0);
      expect(said.lines, said.out).toContain(`${name} up http://127.0.0.1:${port}`);
    };
    up("logbook", p.logbook);
    return {
      ports: p, env, issuer, rogue, registry: registry?.url, logbook: `http://127.0.0.1:${p.logbook}`,
      url: (environment) => `http://127.0.0.1:${p[environment]}`,
      up: (environment, extra) => up(environment, p[environment], extra),
      down: (environment) => {
        const said = run(root, env, "env", "down", environment);
        expect(said.status, said.out).toBe(0);
      },
      stop,
    };
  } catch (error) {
    stop();
    throw error;
  }
};

/** What an afterAll does for a check: stop the stack, then see that nothing of this copy still runs. */
export const finish = async (root: string, stack: Stack | undefined) => {
  const problems = stack?.stop() ?? [];
  await sleep(500);
  nothingRunning(root);
  expect(problems).toEqual([]);
};

const orthographPackages = ["orthograph", "compiler", "language-effect", "lint", "generators", "host-cloudflare", "logbook", "prove", "cli", "preset"] as const;

/**
 * Every `@orthograph/*` package, built and published to the stack's registry as tools/e2e/starter.sh does, so that what promote
 * publishes (`@acme/sdk`) resolves all its dependencies locally. The throwaway user's token stays in the temp npmrc; nothing prints it.
 */
export const publishOrthograph = (stack: Stack) => {
  const registry = stack.registry;
  const npmrc = stack.env["NPM_CONFIG_USERCONFIG"];
  if (registry === undefined || npmrc === undefined) throw new Error("the stack has no registry");
  const built = spawnSync("pnpm", ["nx", "run-many", "-t", "build", "--outputStyle=static"], { cwd: repo, encoding: "utf8", env: { ...process.env, NX_DAEMON: "false" }, timeout: 900_000 });
  expect(built.status, built.stdout.slice(-2000) + built.stderr.slice(-2000)).toBe(0);
  for (const name of orthographPackages) {
    const published = spawnSync("pnpm", ["publish", "--registry", registry, "--no-git-checks"], {
      cwd: join(repo, "packages", name), encoding: "utf8", env: { ...process.env, NPM_CONFIG_USERCONFIG: npmrc }, timeout: 300_000 });
    expect(published.status, `${name}: ${published.stderr.slice(-1500)}`).toBe(0);
  }
};
