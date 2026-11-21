// Check 35 (snag S-29, `design/goals/03-snags.md`): `ortho prove` fails fast, and says why, when a handler imports a rule its `invariants.ts` does not
// export. With `oneHolderPerName` gone from Plugged In's `blueprint/things/handle/invariants.ts` while `src/handle/resolve.ts` still imports it, wrangler cannot
// build the worker, the world never comes up, and prove waits for ever with nothing said (seen on stand-ins by the checks author and the 🔍 of #241; check 34 stops its own
// prove at 240 s so it fails rather than hangs). Its sibling is check 33, a missing handler file, which this file reads the same way. Written by the checks author; a
// builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. On a copy of `examples/plugged-in` with that export removed, `ortho prove` (the whole run, and `--only` one journey) exits non-zero within 60 s,
// and one line of its output names the missing export (`oneHolderPerName`) together with a file: the invariants file, or a handler file that imports it. No generic
// timeout line stands in for that. Behaviour is pinned, not wording: the matcher below wants those two facts on one line, in any phrasing.
//
// THE BOUND, 60 s, as check 33's: above a healthy world's slowest start, far below a hang. A prove still running at 60 s fails the check, but is left running until 90 s,
// the hard stop, so a slow exit (say at 75 s) is read for what it is, "too late", rather than as a hang. At 90 s prove runs in a process group of its own, and that whole
// group and every descendant found at that moment are stopped; then the check asserts that nothing of the copy is left running.
//
// Red today on one reason: prove does not exit within the bound. Controls, true today: the matcher knows a good message from each wrong one; an intact copy proves a journey
// green inside the bound. No Docker. Prove's own world uses port 0.
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as L from "./loop.ts";
import { cli } from "../layer1/support.ts";
import { nothingRunning, repo } from "./support.ts";
import { worldProcesses } from "./prove-speed.ts";

const BOUND_SECONDS = 60;
const HARD_STOP_SECONDS = 90;
const EXPORT = "oneHolderPerName";
const INVARIANTS = "blueprint/things/handle/invariants.ts";
const example = join(repo, "examples/plugged-in");

const copies: Array<ReturnType<typeof L.freshProject>> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });
const intact = () => { const copy = L.freshProject(example); copies.push(copy); return copy.root; };
/** A copy whose `invariants.ts` no longer declares `oneHolderPerName`, while a handler still imports it: the situation S-29 is about. */
const broken = () => {
  const root = intact();
  const file = join(root, INVARIANTS);
  const text = readFileSync(file, "utf8");
  const stripped = text.replace(/\/\/ A name has one holder[\s\S]*?\}\);\n\n/, "");
  if (stripped === text || stripped.includes(`export const ${EXPORT}`)) throw new Error(`the stand-in could not remove ${EXPORT} from ${INVARIANTS}`);
  if (!readFileSync(join(root, "src/handle/resolve.ts"), "utf8").includes(EXPORT)) throw new Error("no handler imports the rule any more: the stand-in is no longer the S-29 case");
  writeFileSync(file, stripped);
  return root;
};

/** Every process below this pid, whatever its name, as of now. */
const descendants = (top: number): ReadonlyArray<number> => {
  const table = spawnSync("ps", ["-axo", "pid=,ppid="], { encoding: "utf8" }).stdout.split("\n")
    .flatMap((line) => { const m = line.trim().match(/^(\d+)\s+(\d+)$/); return m ? [{ pid: Number(m[1]), ppid: Number(m[2]) }] : []; });
  const below = new Set([top]);
  for (let grew = true; grew;) { grew = false; for (const p of table) if (below.has(p.ppid) && !below.has(p.pid)) { below.add(p.pid); grew = true; } }
  return [...below];
};
const signal = (pids: ReadonlyArray<number>, name: NodeJS.Signals) => { for (const pid of pids) { try { process.kill(pid, name); } catch { /* gone */ } } };

interface Ended { readonly status: number | null; readonly out: string; readonly seconds: number; readonly hung: boolean }
/** `ortho prove <args>` as a user runs it, in a process group of its own; stopped, with all it started, at the hard stop if it is still there. */
const proveOnce = async (root: string, ...args: ReadonlyArray<string>): Promise<Ended> => {
  const child = spawn(process.execPath, [cli, "prove", ...args, "--root", root], { cwd: root, detached: true });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  const started = Date.now();
  let timer: NodeJS.Timeout | undefined;
  const status = await new Promise<number | null | "hung">((resolve) => {
    child.once("close", (code) => resolve(code));
    timer = setTimeout(() => resolve("hung"), HARD_STOP_SECONDS * 1000);
  });
  clearTimeout(timer);
  const seconds = (Date.now() - started) / 1000;
  if (status !== "hung") return { status, out, seconds, hung: false };
  const tree = descendants(child.pid!);
  try { process.kill(-child.pid!, "SIGTERM"); } catch { /* gone */ }
  signal(tree, "SIGTERM");
  await new Promise((r) => setTimeout(r, 3000));
  try { process.kill(-child.pid!, "SIGKILL"); } catch { /* gone */ }
  signal(tree, "SIGKILL");
  return { status: null, out, seconds, hung: true };
};
const leftRunning = async (root: string) => {
  for (let i = 0; i < 20; i++) { if (worldProcesses(root).length === 0 && spawnSync("pgrep", ["-f", root], { encoding: "utf8" }).stdout.trim() === "") return []; await new Promise((r) => setTimeout(r, 250)); }
  return [...worldProcesses(root), spawnSync("pgrep", ["-fl", root], { encoding: "utf8" }).stdout.trim()];
};

/** A line that carries the missing export and a file: the invariants file, or a handler under `src/` that imports it. */
const namesTheExportAndAFile = (out: string) => out.split("\n").some((line) => line.includes(EXPORT) && /invariants\.ts|src\/(handle|profile|link)\/[\w.-]+\.ts/.test(line));
/** Any line that blames a timeout: the generic message S-29 asks not to be the whole answer. */
const sayTimeout = (out: string) => /time[ds]?[ -]?out|did not (come up|start|finish) (in|within)/i.test(out);
const explains = (out: string) => namesTheExportAndAFile(out) && !sayTimeout(out);

describe("35 controls: the matcher, and an intact copy", () => {
  it("the message test knows a good message from each wrong one", () => {
    expect(explains(`prove couldn't run: src/handle/resolve.ts imports ${EXPORT}, which ${INVARIANTS} does not export`)).toBe(true);
    expect(explains(`✘ [ERROR] No matching export in "blueprint/things/handle/invariants.ts" for import "${EXPORT}"`)).toBe(true);
    expect(explains(`the world could not start: ${EXPORT} is not exported (src/handle/resolve.ts)`)).toBe(true);
    // Hollow answers: nothing said, a generic line, a file with no export, an export with no file, the wrong export, a timeout dressed with the names.
    expect(explains("")).toBe(false);
    expect(explains("prove couldn't run")).toBe(false);
    expect(explains("the world could not start")).toBe(false);
    expect(explains(`prove couldn't run: ${INVARIANTS} could not be loaded`)).toBe(false);
    expect(explains(`prove couldn't run: ${EXPORT} is missing`)).toBe(false);
    expect(explains(`src/handle/resolve.ts imports oneNamePerPerson, which ${INVARIANTS} does not export`)).toBe(false);
    expect(explains(`src/handle/claim.ts imports oneNamePerPerson, which ${INVARIANTS} does not export\n${EXPORT} was fine`)).toBe(false);
    expect(explains(`timed out waiting for the world: ${EXPORT} in ${INVARIANTS}`)).toBe(false);
    expect(explains(`the world did not come up within 30 s (src/handle/resolve.ts, ${EXPORT})`)).toBe(false);
    expect(explains(`prove couldn't run: ${EXPORT}\nsrc/handle/resolve.ts`), "two facts on two lines").toBe(false);
  });

  it("an intact copy of Plugged In proves green inside the bound, with `claim a handle` passing, and nothing is left running", async () => {
    const root = intact();
    const ended = await proveOnce(root);
    expect(ended.hung, ended.out.slice(-300)).toBe(false);
    expect(ended.status, ended.out.slice(-300)).toBe(0);
    expect(ended.out).toMatch(/^journey claim a handle ✔ \d+\/\d+ steps$/m);
    expect(ended.seconds).toBeLessThan(BOUND_SECONDS);
    nothingRunning(root);
  });
});

describe("35: a handler importing a rule its invariants.ts does not export fails fast and says which", () => {
  const judge = async (root: string, ended: Ended) => {
    expect(await leftRunning(root), "prove left processes of this copy running").toEqual([]);
    expect(ended.hung, `prove was still running after ${HARD_STOP_SECONDS} s with nothing said: ${JSON.stringify(ended.out.slice(-200))}`).toBe(false);
    expect(ended.seconds, `prove took ${ended.seconds} s to end: ${ended.out.slice(-200)}`).toBeLessThan(BOUND_SECONDS);
    expect(ended.status, ended.out.slice(-300)).not.toBe(0);
    expect(namesTheExportAndAFile(ended.out), `no line names ${EXPORT} and a file:\n${ended.out.slice(-600)}`).toBe(true);
    expect(sayTimeout(ended.out), `a generic timeout stands in for the reason:\n${ended.out.slice(-600)}`).toBe(false);
  };

  it("a whole prove with oneHolderPerName removed exits non-zero within 60 s and names the export and a file", async () => {
    const root = broken();
    await judge(root, await proveOnce(root));
  });

  it("the same with `--only 'claim a handle'`: the world cannot start either", async () => {
    const root = broken();
    await judge(root, await proveOnce(root, "--only", "claim a handle"));
  });
});
