// `ortho env up|destroy staging` against a pretend account, in this process: what the real verbs do with the plan, with no cloud, no wrangler and no credential. Check 37 (e2e/m1) runs the printed plan through the real command.
import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeStaging, prefixOf, stagingUrl } from "./service.ts";
import type { Account, Credentials, Options, Tools } from "./types.ts";

const example = resolve(import.meta.dirname, "../../../../../examples/plugged-in");
const scratch = join(example, "tmp/cli-staging");
const root = join(scratch, "plugged-in");
const credentials = { token: "token-for-the-test", account: "account-for-the-test" };
const options = (run: string | undefined, creds: Options["credentials"] = credentials): Options => ({ root, environment: "staging", run, credentials: creds });

beforeAll(() => {
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  for (const path of ["ortho.config.ts", "blueprint", "generated", "package.json"]) cpSync(join(example, path), join(root, path), { recursive: true });
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

interface Pretend { readonly tools: Tools; readonly calls: string[]; readonly workers: Set<string>; readonly databases: Map<string, string> }
/** A pretend account holding `workers` and `databases` (name to id); every call is noted. Wrangler "deploys" by adding the Worker named in the config it was given. */
const pretend = (workers: ReadonlyArray<string> = [], databases: ReadonlyArray<string> = [], wrangler: (args: ReadonlyArray<string>, tries: number) => { status: number; output: string } = () => ({ status: 0, output: "" })): Pretend => {
  const calls: string[] = [];
  const held = new Set(workers);
  const dbs = new Map(databases.map((n, i) => [n, `id-${i}`]));
  const account = (_c: Credentials): Account => ({
    workers: Effect.sync(() => [...held]),
    databases: Effect.sync(() => [...dbs].map(([name, id]) => ({ name, id }))),
    createDatabase: (name) => Effect.sync(() => { calls.push(`create ${name}`); dbs.set(name, `new-${dbs.size}`); return `new-${dbs.size - 1}`; }),
    deleteWorker: (name) => Effect.sync(() => { calls.push(`delete worker ${name}`); held.delete(name); }),
    deleteDatabase: (id) => Effect.sync(() => { calls.push(`delete database ${id}`); for (const [n, i] of dbs) if (i === id) dbs.delete(n); }),
    subdomain: Effect.succeed("acct"),
  });
  const attempts = new Map<string, number>();
  const tools: Tools = {
    account,
    wrangler: ({ args, input }) => Effect.sync(() => {
      const verb = args.slice(0, 2).join(" ");
      attempts.set(verb, (attempts.get(verb) ?? 0) + 1);
      calls.push(`wrangler ${verb}${input === undefined ? "" : " (secret on stdin)"}`);
      return wrangler(args, attempts.get(verb) ?? 1);
    }),
    probe: () => Effect.succeed(200),
    pause: (ms) => Effect.sync(() => { calls.push(`pause ${ms}`); }),
    secret: () => "not-a-real-secret",
    build: () => Effect.succeed({ main: "/built/main.js", revision: "abc1234", sha256: "f".repeat(64) }),
  };
  return { tools, calls, workers: held, databases: dbs };
};
const run = <A>(e: Effect.Effect<A>) => Effect.runPromise(e);

describe("staging up and destroy", () => {
  it("the prefix and the address come from one place", () => {
    expect(prefixOf("plugged-in", "7")).toBe("ortho-pluggedin-stg-7");
    expect(stagingUrl("ortho-pluggedin-stg-7", "acct")).toBe("https://ortho-pluggedin-stg-7-worker.acct.workers.dev");
  });

  it("destroy deletes what the run's prefix owns, matched at a dash, and nothing else", async () => {
    const mine = "ortho-pluggedin-stg-1";
    const world = pretend(
      [`${mine}-worker`, "ortho-pluggedin-stg-12-worker", `${mine}x-worker`, "someone-elses", `ortho-acme-stg-1-worker`],
      [`${mine}-db`, "ortho-pluggedin-stg-12-db", "other-db", `${mine}-db-ledger`],
    );
    const said = await run(makeStaging(world.tools).destroy(options("1")));
    expect(said.exit).toBe(0);
    expect([...world.workers].sort()).toEqual(["ortho-acme-stg-1-worker", "ortho-pluggedin-stg-12-worker", "someone-elses", `${mine}x-worker`].sort());
    expect([...world.databases.keys()].sort()).toEqual(["ortho-pluggedin-stg-12-db", "other-db"]);
    // Workers first: a database a Worker binds is not deleted while it is bound.
    expect(world.calls.findIndex((c) => c.startsWith("delete worker"))).toBeLessThan(world.calls.findIndex((c) => c.startsWith("delete database")));
    expect(said.out).not.toContain("someone-elses");
  });

  it("destroy of a run nothing was made for deletes nothing and says so", async () => {
    const world = pretend(["other"], ["other-db"]);
    const said = await run(makeStaging(world.tools).destroy(options("9")));
    expect(said.exit).toBe(0);
    expect(world.calls).toEqual([]);
  });

  it.each(["up", "destroy"] as const)("%s with no token or no account id exits 2 naming what is missing, and never touches the cloud", async (verb) => {
    const world = pretend();
    const touched: string[] = [];
    const tools = { ...world.tools, account: () => { touched.push("account"); return world.tools.account(credentials); } };
    for (const [creds, named] of [[{ token: undefined, account: "a" }, "CLOUDFLARE_API_TOKEN"], [{ token: "t", account: undefined }, "CLOUDFLARE_ACCOUNT_ID"], [{ token: "", account: "" }, "CLOUDFLARE_API_TOKEN"]] as const) {
      const said = await run(makeStaging(tools)[verb](options("5", creds)));
      expect(said.exit).toBe(2);
      expect(said.err).toContain(named);
    }
    expect(touched).toEqual([]);
    expect(world.calls).toEqual([]);
  });

  it("a bad run id is refused before the cloud is asked anything", async () => {
    const world = pretend();
    for (const bad of [undefined, "", "Run1", "1-2", "x".repeat(21)]) {
      const said = await run(makeStaging(world.tools).destroy(options(bad)));
      expect(said.exit, String(bad)).toBe(2);
      expect(said.err).toMatch(/--run/);
    }
    expect(world.calls).toEqual([]);
  });

  it("up makes the database, applies its migrations, deploys, sets the secret and says the address", async () => {
    const world = pretend();
    const said = await run(makeStaging(world.tools).up(options("77")));
    expect(said.err).toBe("");
    expect(said.exit).toBe(0);
    expect(said.out).toBe("staging up https://ortho-pluggedin-stg-77-worker.acct.workers.dev\n");
    expect(world.calls).toEqual(["create ortho-pluggedin-stg-77-db", "wrangler d1 migrations", "wrangler deploy --config", "wrangler secret put (secret on stdin)", "pause 2000", "pause 2000"]);
    // The derived config names the plan's database with its real id, turns the address on and the previews off, and carries the bundle.
    const config = JSON.parse(readFileSync(join(root, ".ortho/staging/ortho-pluggedin-stg-77/wrangler.json"), "utf8").split("\n").filter((l) => !l.startsWith("//")).join("\n")) as Record<string, any>;
    expect(config).toMatchObject({ name: "ortho-pluggedin-stg-77-worker", main: "/built/main.js", no_bundle: true, workers_dev: true, preview_urls: false });
    expect(config["d1_databases"]).toMatchObject([{ binding: "DB", database_name: "ortho-pluggedin-stg-77-db", database_id: "new-0" }]);
    expect(config["vars"]).toMatchObject({ ORTHO_ENVIRONMENT: "staging", ORTHO_REVISION: "abc1234", ORTHO_BUNDLE_SHA256: "f".repeat(64) });
    expect(JSON.stringify(config)).not.toContain(credentials.token);
  });

  it("a first deploy that fails with code 10007 is tried again after a pause, once", async () => {
    const world = pretend([], [], (args, tries) => (args[0] === "deploy" && tries === 1 ? { status: 1, output: "This Worker does not exist on your account [code: 10007]" } : { status: 0, output: "" }));
    const said = await run(makeStaging(world.tools).up(options("78")));
    expect(said.exit, said.err).toBe(0);
    expect(world.calls.filter((c) => c.startsWith("wrangler deploy"))).toHaveLength(2);
    expect(world.calls).toContain("pause 20000");
  });

  it("a deploy that fails any other way fails up (exit 1), with wrangler's words and no credential", async () => {
    const world = pretend([], [], (args) => (args[0] === "deploy" ? { status: 1, output: `boom for ${credentials.token} in ${credentials.account}` } : { status: 0, output: "" }));
    const said = await run(makeStaging(world.tools).up(options("79")));
    expect(said.exit).toBe(1);
    expect(said.err).toContain("the deploy failed");
    expect(said.err).not.toContain(credentials.token);
    expect(said.err).not.toContain(credentials.account);
  });
});
