// Check 33 (found by the reviews of #214): `ortho prove` fails fast, and says why, when a handler file is missing. A developer's typo or
// delete must not leave prove sitting for minutes: with `src/allowance/revoke.ts` removed, wrangler cannot resolve the import, the world
// never comes up, and prove (warm or cold) waited more than 120 to 170 s with nothing said. Written by the checks author; a builder never
// edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. In a copy of acme with a handler removed, `ortho prove` (the whole run, and `--only` one journey, which needs the
// same world) exits non-zero within 60 s and says why: the text names the file wrangler cannot resolve (`src/allowance/revoke`), or says
// the world could not start together with wrangler's own error (`Could not resolve`, or the build error it printed).
//
// THE BOUND, 60 s. A healthy `ortho prove --only` takes 5 to 12 s on the shared Mac and a whole healthy prove of acme 10 to 45 s under
// load (checks 29 and 30 measured both); a world that cannot start should fail after the time a world takes to start, not after a
// whole run. 60 s is above the slowest healthy start seen, so a loaded machine does not make this red, and a third of the shortest
// hang seen (more than 170 s), so a hang does. Nothing waits for it to end: the check stops prove at the bound, by its pid, and then
// stops what it started (wrangler, workerd) by the pids that name this copy's temporary folder.
//
// Red today on one reason: prove does not exit within the bound ("still running after 60 s"). Controls, true today: the same prove with the
// handler present exits well inside the bound, with the journey's verdict; and a copy that is not broken is not called broken.
// No Docker. Prove's own world uses port 0.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cli, copyOf, acme, nothingRunning } from "../layer1/support.ts";
import { worldProcesses, worldProcessesUnder } from "./prove-speed.ts";

const BOUND_SECONDS = 60;
const HANDLER = "src/allowance/revoke.ts";

const copies: Array<ReturnType<typeof copyOf>> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });
const fresh = () => { const copy = copyOf(acme); copies.push(copy); return copy.root; };

const stopByPid = async (pids: ReadonlyArray<number>) => {
  for (const pid of pids) { try { process.kill(pid, "SIGTERM"); } catch { /* gone */ } }
  await new Promise((r) => setTimeout(r, 3000));
  for (const pid of pids) { try { process.kill(pid, "SIGKILL"); } catch { /* gone */ } }
};

interface Ended { readonly status: number | null; readonly out: string; readonly seconds: number; readonly hung: boolean }
/** `ortho prove <args>` as a user runs it; stopped at the bound by pid (and what it started, by the folder it names) if it is still there. */
const proveWithin = async (root: string, ...args: ReadonlyArray<string>): Promise<Ended> => {
  const child = spawn(process.execPath, [cli, "prove", ...args, "--root", root], { cwd: root });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  const started = Date.now();
  const status = await new Promise<number | null | "hung">((resolve) => {
    child.once("close", (code) => resolve(code));
    setTimeout(() => resolve("hung"), BOUND_SECONDS * 1000);
  });
  const seconds = (Date.now() - started) / 1000;
  if (status === "hung") {
    const lines = [...worldProcesses(root), ...worldProcessesUnder(child.pid!)];
    await stopByPid([child.pid!, ...lines.map((l) => Number(l.split(/\s+/)[0]))]);
    return { status: null, out, seconds, hung: true };
  }
  return { status, out, seconds, hung: false };
};

/** What the message must do: name the file, or say the world could not start with wrangler's own error. */
const explains = (out: string) =>
  /src\/allowance\/revoke/.test(out) ||
  (/(could(?: no|n')t|unable to|failed to) (?:be )?start|did not start|never came up/i.test(out) && /Could not resolve|wrangler|esbuild|build failed|ERROR/i.test(out));

describe("33 controls: with its handler present, prove ends inside the bound with the journey's verdict", () => {
  it("the message test knows a good message from a bad one", () => {
    expect(explains("prove couldn't run: the world could not start: wrangler: Could not resolve \"../../src/allowance/revoke.ts\"")).toBe(true);
    expect(explains("prove couldn't run: the world could not start (wrangler build failed: ERROR Could not resolve ./x.ts)")).toBe(true);
    expect(explains("src/allowance/revoke.ts is missing")).toBe(true);
    expect(explains("")).toBe(false);
    expect(explains("prove couldn't run")).toBe(false);
    expect(explains("the world could not start")).toBe(false);
    expect(explains("Could not resolve something")).toBe(false);
  });

  it("acme with revoke.ts present proves `health is up`: exit within the bound, the journey passes, and nothing is left running", async () => {
    const root = fresh();
    const ended = await proveWithin(root, "--only", "health is up");
    expect(ended.hung, ended.out.slice(-300)).toBe(false);
    expect(ended.out).toMatch(/^journey health is up ✔ 1\/1 steps$/m);
    expect(ended.seconds).toBeLessThan(BOUND_SECONDS);
    nothingRunning(root);
  });

  it("acme with revoke.ts present proves `an outsider cannot revoke` (the journey that reaches the file's operation), inside the bound", async () => {
    const root = fresh();
    const ended = await proveWithin(root, "--only", "an outsider cannot revoke");
    expect(ended.hung, ended.out.slice(-300)).toBe(false);
    expect(ended.out).toMatch(/^journey an outsider cannot revoke ✔ 1\/1 steps$/m);
    nothingRunning(root);
  });
});

describe("33: a missing handler fails fast and says why", () => {
  it("a whole prove with src/allowance/revoke.ts removed exits non-zero within 60 s and names the file or says the world could not start, with wrangler's error", async () => {
    const root = fresh();
    rmSync(join(root, HANDLER));
    const ended = await proveWithin(root);
    expect(ended.hung, `prove was still running after ${BOUND_SECONDS} s with nothing said: ${JSON.stringify(ended.out.slice(-200))}`).toBe(false);
    expect(ended.status, ended.out.slice(-300)).not.toBe(0);
    expect(explains(ended.out), `the message does not say why:\n${ended.out.slice(-600)}`).toBe(true);
    nothingRunning(root);
  });

  it("the same with `--only 'health is up'`, a journey that never touches the missing file's operation: the world cannot start either", async () => {
    const root = fresh();
    rmSync(join(root, HANDLER));
    const ended = await proveWithin(root, "--only", "health is up");
    expect(ended.hung, `prove was still running after ${BOUND_SECONDS} s with nothing said: ${JSON.stringify(ended.out.slice(-200))}`).toBe(false);
    expect(ended.status, ended.out.slice(-300)).not.toBe(0);
    expect(explains(ended.out), `the message does not say why:\n${ended.out.slice(-600)}`).toBe(true);
    nothingRunning(root);
  });
});
