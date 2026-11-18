// Check 1 (D3 #15.1, walkthrough step 9): `ortho prove --env test` makes a test world with a lifetime, posts a signed
// verdict per operation to the logbook, and destroys the world; a run killed part-way leaves a world that
// `ortho worlds reap` removes after its lifetime.
//
// Chosen where D3 #14 is open:
// - Output, in this order: `world test-<id> · expires in <lifetime>`, one line `verdicts <op> ✔  <op> ✔ …   (revision <rev>)`
//   naming every operation by its full name (`allowance.spend`), then `world destroyed`; exit 0. The lifetime is printed as
//   given: ORTHO_LIFETIME=20s prints `expires in 20s`; with none set, the environment's own (any non-empty text).
// - The logbook answers `GET <logbook>/verdicts?revision=<rev>&environment=test` with a JSON array of
//   `{ revision, environment, operation, verdict }`, `verdict` being `"pass"` for a green one.
// - `ortho env status test` prints `test up <url>` or `test down`, and for the test environment adds `worlds <n>`: the
//   worlds it holds now.
// - `ortho worlds reap` with the test environment down starts it, lets past-due alarms fire, and prints `reaped <n>`.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Stack, finish, startStack } from "./services.ts";
import { escape, getJson, operations, project, run, sleep, start, until } from "./support.ts";

const copy = project();
let stack: Stack | undefined;
beforeAll(async () => { stack = await startStack(copy.root, 1); });
afterAll(async () => { try { await finish(copy.root, stack); } finally { copy.remove(); } });

type Verdict = { revision: string; environment: string; operation: string; verdict: string };

describe("check 1: prove --env test", () => {
  it("makes a world with a lifetime, posts a signed verdict per operation, and destroys the world", async () => {
    const s = stack!;
    s.up("test");
    const proved = run(copy.root, s.env, "prove", "--env", "test");
    expect(proved.status, proved.out.slice(-3000)).toBe(0);
    const world = proved.lines.findIndex((l) => /^world test-[\w-]+ · expires in \S+/.test(l));
    const verdicts = proved.lines.findIndex((l) => l.startsWith("verdicts "));
    const destroyed = proved.lines.indexOf("world destroyed");
    expect(world, proved.out).toBeGreaterThanOrEqual(0);
    expect(verdicts, proved.out).toBeGreaterThan(world);
    expect(destroyed, proved.out).toBeGreaterThan(verdicts);

    const line = proved.lines[verdicts]!;
    expect(line.endsWith(`(revision ${copy.rev})`), line).toBe(true);
    const names = operations(copy.root);
    for (const op of names) expect(line, op).toMatch(new RegExp(`(^|\\s)${escape(op)} ✔`));

    // The logbook holds exactly what the line says: one passing verdict per operation, for this revision, in test.
    const held = await getJson<ReadonlyArray<Verdict>>(`${s.logbook}/verdicts?revision=${copy.rev}&environment=test`);
    expect(held.map((v) => v.operation).sort()).toEqual([...names].sort());
    expect(held.every((v) => v.verdict === "pass" && v.revision === copy.rev && v.environment === "test")).toBe(true);

    // The world is gone.
    const status = run(copy.root, s.env, "env", "status", "test");
    expect(status.lines, status.out).toContain("worlds 0");
  });

  it("a run killed part-way leaves a world that worlds reap removes after its lifetime", async () => {
    const s = stack!;
    const lifetime = 20;
    const env = { ...s.env, ORTHO_LIFETIME: `${lifetime}s` };
    const child = start(copy.root, env, "prove", "--env", "test");
    let seen = "";
    child.stdout!.on("data", (chunk: Buffer) => { seen += chunk.toString(); });
    await until("the world line", () => /^world test-[\w-]+ · expires in 20s/m.test(seen), 240_000);
    const killedAt = Date.now();
    await new Promise<void>((resolve) => { child.once("exit", () => resolve()); child.kill("SIGKILL"); });
    const id = /^world (test-[\w-]+) · expires in 20s/m.exec(seen)![1]!;
    expect(seen).not.toContain("world destroyed");

    // Still within its lifetime: the world is there and reap leaves it alone.
    expect(run(copy.root, env, "env", "status", "test").lines).toContain("worlds 1");
    expect(run(copy.root, env, "worlds", "reap").lines).toContain("reaped 0");

    // Alarms fire only while a workerd runs, so with the environment down it is reap that starts it (D3 #7).
    s.down("test");
    await sleep(Math.max(0, killedAt + (lifetime + 3) * 1000 - Date.now()));
    const reaped = run(copy.root, env, "worlds", "reap");
    expect(reaped.status, reaped.out).toBe(0);
    expect(reaped.lines, `${id}: ${reaped.out}`).toContain("reaped 1");
    expect(run(copy.root, env, "worlds", "reap").lines).toContain("reaped 0");

    // Reap may leave the environment it started running; either way it holds no world.
    if (run(copy.root, env, "env", "status", "test").lines.includes("test down")) s.up("test");
    expect(run(copy.root, env, "env", "status", "test").lines).toContain("worlds 0");
  });
});
