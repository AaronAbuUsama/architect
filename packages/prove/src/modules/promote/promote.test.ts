// L2.05's done-when checks, on a copy of acme under git, through the `architect promote` command: it refuses a revision
// without verdicts and accepts one that has them, production is refused without staging verdicts, one bundle hash runs in
// test, staging and production, and a dirty tree or an unbuilt bundle is refused. Real wrangler and workerd for the
// logbook and the three environments, real collectors and a real OIDC server (mock-oauth2-server, pinned by digest) in
// Docker. Ports 9030 to 9049 are this file's.
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Environments } from "#modules/environments/service.js";

const ISSUER_IMAGE = "ghcr.io/navikt/mock-oauth2-server:6.1.4@sha256:647dd8c78a54f0e6fcd58d79c884e612f8f998a0662276f3e1db22e464a50192";
const PORTS = { logbook: 9030, test: 9031, staging: 9032, production: 9033, issuer: 9034 };
const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const cli = resolve(import.meta.dirname, "../../../../cli/src/main.ts");
const trusted = { repository: "acme/acme", workflow: "architect" };
const container = `architect-l205-issuer-${process.pid}`;
const visible = (from: string) => !basename(from).startsWith(".");
const docker = (...args: ReadonlyArray<string>) => spawnSync("docker", args, { encoding: "utf8" });
const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const git = (root: string, ...args: ReadonlyArray<string>) => {
  const r = spawnSync("git", ["-c", "user.name=l2", "-c", "user.email=l2@example.test", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" });
  expect(r.status, r.stderr).toBe(0);
  return r.stdout.trim();
};
const commit = (root: string, message: string) => {
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", message);
  return git(root, "rev-parse", "--short", "HEAD");
};

/** A copy of acme under git, outside the repository: its revision is a commit of its own. */
const parent = mkdtempSync(join(realpathSync(tmpdir()), "architect-l205-"));
const root = join(parent, "acme");
for (const part of ["blueprint", "generated", "implementation", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
mkdirSync(join(root, "node_modules"));
for (const entry of readdirSync(join(acme, "node_modules"))) if (entry !== ".bin") symlinkSync(join(acme, "node_modules", entry), join(root, "node_modules", entry));
writeFileSync(join(root, ".gitignore"), "node_modules/\n.architect/\n.wrangler/\n");
git(root, "init", "-q", "-b", "main");
const first = commit(root, "acme");
const operations = Object.keys((JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { operations: Record<string, unknown> }).operations);

const issuer = `http://127.0.0.1:${PORTS.issuer}/architect`;
const logbook = `http://127.0.0.1:${PORTS.logbook}`;
const env = {
  ARCHITECT_OIDC_ISSUER: issuer, ARCHITECT_OIDC_CLIENT: "ci-main",
  ARCHITECT_OIDC_REPOSITORY: trusted.repository, ARCHITECT_OIDC_REF: "refs/heads/main", ARCHITECT_OIDC_WORKFLOW: trusted.workflow,
};

/** What `architect <args>` printed and how it ended. */
const architect = (...args: ReadonlyArray<string>) => {
  const r = spawnSync(process.execPath, [cli, ...args, "--root", root], { cwd: root, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024, timeout: 900_000 });
  const out = `${r.stdout}${r.stderr}`;
  return { status: r.status, out, lines: out.split("\n") };
};

const scenario = (client: string, ref: string) => ({
  requestParam: "client_id", match: client,
  claims: { sub: `repo:acme/acme:ref:${ref}`, aud: ["architect-logbook"], repository: trusted.repository, ref, workflow: trusted.workflow },
});
const scenarios = { interactiveLogin: false, tokenCallbacks: [{ issuerId: "architect", tokenExpiry: 600, requestMappings: [scenario("ci-main", "refs/heads/main"), scenario("ci-pr", "refs/pull/7/merge")] }] };

const mint = async (client: string) => {
  const r = await fetch(`${issuer}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: client, client_secret: "unused" }) });
  return ((await r.json()) as { access_token: string }).access_token;
};
const post = async (client: string, revision: string, environment: string, operation: string, verdict: "pass" | "fail" = "pass") => {
  const r = await fetch(`${logbook}/verdicts`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await mint(client)}` }, body: JSON.stringify({ revision, environment, operation, verdict }) });
  expect(r.status).toBe(200);
};
type Row = { operation: string; verdict: string; environment: string; ref: string; revision: string };
const held = async (revision: string, environment: string) =>
  (await (await fetch(`${logbook}/verdicts?revision=${revision}&environment=${environment}`)).json()) as Array<Row>;
/** What the environment itself says it runs, found where it is. */
const bundleOf = async (name: "test" | "staging" | "production") => {
  const where = await run(Environments.status({ root, name }));
  expect(where.state, name).toBe("up");
  expect((where as { port: number }).port, `${name}'s port`).toBe(PORTS[name]);
  return (await (await fetch(`${(where as { url: string }).url}/_architect/bundle`)).json()) as { revision: string; sha256: string };
};

beforeAll(async () => {
  const dir = join(parent, "issuer");
  mkdirSync(dir);
  const config = join(dir, "issuer.json");
  writeFileSync(config, JSON.stringify(scenarios));
  chmodSync(config, 0o644);
  docker("rm", "-f", container);
  const started = docker("run", "-d", "--name", container, "-p", `127.0.0.1:${PORTS.issuer}:8080`, "-e", "JSON_CONFIG_PATH=/config/issuer.json", "-v", `${config}:/config/issuer.json:ro`, ISSUER_IMAGE);
  expect(started.status, started.stderr).toBe(0);
  for (let i = 0; i < 300 && !(await fetch(`${issuer}/.well-known/openid-configuration`).then((r) => r.ok, () => false)); i++) await sleep(200);
  // A pull request's token is trusted by the logbook, so that only a verdict's ref, not its signature, keeps it from counting.
  const policy = { issuer, repository: trusted.repository, refs: ["refs/heads/main", "refs/pull/*/merge"], workflows: [trusted.workflow] };
  expect((await run(Environments.up({ root, name: "logbook", port: PORTS.logbook, policy }))).url).toBe(logbook);
}, 600_000);

afterAll(async () => {
  for (const name of ["production", "staging", "test", "logbook"]) await run(Environments.down({ root, name }));
  docker("rm", "-f", container);
  rmSync(parent, { recursive: true, force: true });
});

describe("architect promote", () => {
  it("refuses a dirty tree and a revision with no built bundle, each naming what is wrong", { timeout: 600_000 }, () => {
    const unbuilt = architect("promote", "--to", "staging");
    expect(unbuilt.status, unbuilt.out).toBe(1);
    expect(unbuilt.lines, unbuilt.out).toContain(`refused: ${first} has no built bundle: run \`architect build\``);

    expect(architect("build").status).toBe(0);
    writeFileSync(join(root, "implementation/handlers/allowance/spend.ts"), `${readFileSync(join(root, "implementation/handlers/allowance/spend.ts"), "utf8")}\n// edited, not committed\n`);
    const dirty = architect("promote", "--to", "staging");
    expect(dirty.status, dirty.out).toBe(1);
    expect(dirty.out).toContain(`refused: the working tree differs from ${first}`);
    // Nothing was started for a refused promotion.
    expect(dirty.out).not.toContain("up http");
    git(root, "checkout", "--", "implementation/handlers/allowance/spend.ts");
  });

  it("refuses a revision without main test verdicts, naming what is missing, and accepts one that has them", { timeout: 900_000 }, async () => {
    const none = architect("promote", "--to", "staging");
    expect(none.status, none.out).toBe(1);
    expect(none.lines, none.out).toContain(`refused: ${first} has no green verdicts in test`);
    expect(none.out).toContain(`missing: ${operations.join(", ")}`);

    // A pull request's verdicts never count, even from a signed token the logbook trusts.
    for (const op of operations) await post("ci-pr", first, "test", op);
    const pull = architect("promote", "--to", "staging");
    expect(pull.status, pull.out).toBe(1);
    expect(pull.lines, pull.out).toContain(`refused: ${first} has no green verdicts in test`);

    // All but one on main, and one that failed: both are named.
    const [failing, absent, ...rest] = operations;
    for (const op of rest) await post("ci-main", first, "test", op);
    await post("ci-main", first, "test", failing!, "fail");
    const partial = architect("promote", "--to", "staging");
    expect(partial.status, partial.out).toBe(1);
    expect(partial.out).toContain(`refused: ${first} has no green verdicts in test for every operation`);
    expect(partial.out).toContain(`missing: ${[failing, absent].sort().join(", ")}`);
    expect(await bundleStatus("staging")).toBe("down");
  });

  it("production is refused without staging verdicts, then takes what staging proved: one bundle in test, staging and production", { timeout: 1_800_000 }, async () => {
    // Environments the way the checks run them: up on a port of their own, which a promotion then keeps.
    expect(architect("env", "up", "test", "--port", String(PORTS.test)).status).toBe(0);
    const proved = architect("prove", "--env", "test");
    expect(proved.status, proved.out.slice(-3000)).toBe(0);

    const refused = architect("promote", "--to", "production");
    expect(refused.status, refused.out).toBe(1);
    expect(refused.lines, refused.out).toContain(`refused: ${first} has no green verdicts in staging`);
    expect(await bundleStatus("production")).toBe("down");
    for (const name of ["staging", "production"] as const) expect(architect("env", "up", name, "--port", String(PORTS[name])).status).toBe(0);

    const staged = architect("promote", "--to", "staging");
    expect(staged.status, staged.out.slice(-3000)).toBe(0);
    expect(staged.out).toContain("prove ✔");
    const hash = (JSON.parse(readFileSync(join(root, `.architect/artefacts/${first}/bundle.json`), "utf8")) as { sha256: string }).sha256;
    expect(staged.out).toContain(`sha256:${hash}`);
    const verdicts = await held(first, "staging");
    expect(verdicts.map((v) => v.operation).sort()).toEqual([...operations].sort());
    expect(verdicts.every((v) => v.verdict === "pass" && v.ref === "refs/heads/main")).toBe(true);

    const released = architect("promote", "--to", "production");
    expect(released.status, released.out.slice(-3000)).toBe(0);
    expect(released.lines, released.out).toContain(`production from staging ${first} sha256:${hash}`);
    expect(released.lines.some((l) => /^skipped .+ \(cloud pass\)$/.test(l)), released.out).toBe(true);

    // The same bundle, byte for byte, in all three.
    for (const name of ["test", "staging", "production"] as const) expect(await bundleOf(name), name).toEqual({ revision: first, sha256: hash });

    // Production has a verdict per operation too: staging's, carried to the same bundle, so staleness reaches it.
    expect((await held(first, "production")).map((v) => `${v.operation}:${v.verdict}`).sort()).toEqual(operations.map((o) => `${o}:pass`).sort());

    // The release is in the logbook, with the version the model gave.
    const last = (await (await fetch(`${logbook}/releases/latest`)).json()) as { version: string; revision: string };
    expect(last).toMatchObject({ version: "1.0.0", revision: first });

    // Promoting the revision again changes nothing: it is already the last release, and the logbook keeps one.
    const again = architect("promote", "--to", "production");
    expect(again.status, again.out).toBe(0);
    expect(again.lines, again.out).toContain(`release 1.0.0 already recorded for ${first}`);
    expect(await (await fetch(`${logbook}/releases/latest`)).json()).toEqual(last);
  });
});

/** `down` or `up` as `architect env status` says it. */
const bundleStatus = (name: string) => Promise.resolve(architect("env", "status", name).lines[0]!.endsWith(" down") ? "down" : "up");
