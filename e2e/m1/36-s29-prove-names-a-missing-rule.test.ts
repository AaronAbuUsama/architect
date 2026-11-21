// Check 36 (snag S-29, `design/goals/03-snags.md`): `ortho prove` fails fast, and says why, when a handler imports a rule its `invariants.ts` does not
// export. With `oneHolderPerName` gone from Plugged In's `blueprint/things/handle/invariants.ts` while `src/handle/resolve.ts` still imports it, wrangler cannot
// build the worker, the world never comes up, and prove waits for ever with nothing said (seen on stand-ins by the checks author and the 🔍 of #241; check 34 stops its own
// prove at 240 s so it fails rather than hangs). Its sibling is check 33, a missing handler file, which this file reads the same way. Written by the checks author; a
// builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. On a copy of `examples/plugged-in` with that export removed, `ortho prove` (the whole run, and `--only` one journey) exits non-zero within 60 s,
// and one line of its output (colour codes stripped) names the missing export (`oneHolderPerName`) together with a file: the invariants file, or a handler file that imports it,
// and says, near the export, that it is absent ("not exported", "no matching export", "lacks", "missing", ...). No line says the other rule is missing, and no generic timeout
// line stands in for the answer. Behaviour is pinned, not wording: the matcher below wants those facts on one line, in any phrasing.
//
// THE BOUND, 60 s, as check 33's: above a healthy world's slowest start, far below a hang. A prove still running at 60 s fails the check, but is left running until 90 s,
// the hard stop, so a slow exit (say at 75 s) is read for what it is, "too late", rather than as a hang. Prove runs in a process group of its own; whether it exits or hangs, that
// group and every descendant seen while it ran are stopped afterwards, and the check asserts that nothing of the copy is left running.
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
/** The two rules a handler imports from `handle/invariants.ts`, the comment that opens each declaration, and the handlers that import it. */
const RULES = {
  oneHolderPerName: { opens: "// A name has one holder", importers: ["src/handle/resolve.ts", "src/profile/get.ts"], other: "oneNamePerPerson" },
  oneNamePerPerson: { opens: "// A person holds one claimed name", importers: ["src/link/add.ts"], other: "oneHolderPerName" },
} as const;
type Rule = keyof typeof RULES;
/** A copy whose `invariants.ts` no longer declares `rule`, while a handler still imports it: the situation S-29 is about. */
const broken = (rule: Rule) => {
  const root = intact();
  const file = join(root, INVARIANTS);
  const text = readFileSync(file, "utf8");
  const stripped = text.replace(new RegExp(`${RULES[rule].opens}[\\s\\S]*?\\}\\);\\n+`), "");
  if (stripped === text || stripped.includes(`export const ${rule}`) || !stripped.includes(`export const ${RULES[rule].other}`)) throw new Error(`the stand-in could not remove only ${rule} from ${INVARIANTS}`);
  for (const importer of RULES[rule].importers) if (!readFileSync(join(root, importer), "utf8").includes(rule)) throw new Error(`${importer} no longer imports ${rule}: the stand-in is no longer the S-29 case`);
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
/**
 * `ortho prove <args>` as a user runs it, in a process group of its own. Whether it exits or hangs, its group and every descendant seen while it ran are stopped
 * afterwards (a wrangler or workerd that outlives prove is left behind on a shared Mac); the tests then assert nothing of the copy is left.
 */
const proveOnce = async (root: string, ...args: ReadonlyArray<string>): Promise<Ended> => {
  const child = spawn(process.execPath, [cli, "prove", ...args, "--root", root], { cwd: root, detached: true });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  const seen = new Set<number>();
  const watch = () => { for (const pid of descendants(child.pid!)) seen.add(pid); };
  const watcher = setInterval(watch, 1000);
  const started = Date.now();
  let timer: NodeJS.Timeout | undefined;
  const status = await new Promise<number | null | "hung">((resolve) => {
    child.once("close", (code) => resolve(code));
    timer = setTimeout(() => resolve("hung"), HARD_STOP_SECONDS * 1000);
  });
  clearTimeout(timer);
  clearInterval(watcher);
  const seconds = (Date.now() - started) / 1000;
  watch();
  const stop = (name: NodeJS.Signals) => { try { process.kill(-child.pid!, name); } catch { /* gone */ } signal([...seen].filter((pid) => pid !== process.pid), name); };
  stop("SIGTERM");
  await new Promise((r) => setTimeout(r, 2000));
  stop("SIGKILL");
  return status === "hung" ? { status: null, out, seconds, hung: true } : { status, out, seconds, hung: false };
};
const leftRunning = async (root: string) => {
  for (let i = 0; i < 20; i++) { if (worldProcesses(root).length === 0 && spawnSync("pgrep", ["-f", root], { encoding: "utf8" }).stdout.trim() === "") return []; await new Promise((r) => setTimeout(r, 250)); }
  return [...worldProcesses(root), spawnSync("pgrep", ["-fl", root], { encoding: "utf8" }).stdout.trim()];
};

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
/** Colour codes off: wrangler paints esbuild's error even into a file, and `\x1b[1m` glued to `No` leaves no word boundary there. */
const plain = (text: string) => text.replace(/\x1b\[[0-9;]*m/g, "");
/** Phrases that say an export is absent. Bare "not", "no", "never" or "cannot" are not here: they sit in "(not yet checked)" and "no journeys ran". */
const ABSENCE = new RegExp([
  "no matching export", "no export named", "has no export", "(?:is(?:n't| not)|was(?:n't| not)|are(?:n't| not)) exported", "(?:does(?:n't| not)|did(?:n't| not)) (?:export|provide|declare|define|contain|have)",
  "missing", "lacks?", "lacking", "absent", "unresolved import", "not found", "(?:can't|cannot|could not|couldn't) find", "not defined",
].map((phrase) => `\\b(?:${phrase})(?![\\w-])`).join("|"), "gi");
/** A negation just before an absence word turns it round: "none missing", "not missing", "0 files not found". */
const NEGATED = /\b(?:not|no|none|nothing|never|nor|without|0|zero)\W+(?:\w+\W+)?$/i;
/** Where `rule` (a whole word) occurs in the line. */
const wordAt = (line: string, rule: string) => [...line.matchAll(new RegExp(`(?<![\\w$])${rule}(?![\\w$])`, "g"))].map((m) => m.index!);
const NEAR = 100;
/** True when a word of absence, not negated, sits in a clause (`;` ends one) within NEAR characters of `rule`, and `rule` is the nearer of the two rules to it: the line says that rule is absent. */
const blamesOnLine = (line: string, rule: Rule) => line.split(";").some((clause) => {
  const mine = wordAt(clause, rule), other = wordAt(clause, RULES[rule].other);
  return [...clause.matchAll(ABSENCE)].some((m) => {
    const at = (names: ReadonlyArray<number>) => Math.min(...names.map((n) => Math.min(Math.abs(n - (m.index! + m[0].length)), Math.abs(n - m.index!))), Infinity);
    return !NEGATED.test(clause.slice(0, m.index!)) && at(mine) <= NEAR && at(mine) <= at(other);
  });
});
/** Any line, colour stripped, that says `rule` is absent. */
const blames = (out: string, rule: Rule) => plain(out).split("\n").some((line) => blamesOnLine(line, rule));
/**
 * A line that says the export is missing: the absence tied to the export (near it, and nearer than to the other rule), and a file on the same line (the invariants
 * file, or a handler that imports it, at a path boundary). An echo of the import, a "loaded rules" log or "is exported from" carries the first two and not the third.
 */
const namesTheExportAndAFile = (out: string, rule: Rule = EXPORT) => plain(out).split("\n").some((line) =>
  blamesOnLine(line, rule) &&
  new RegExp(`(^|[^\\w.-])(${[INVARIANTS, ...RULES[rule].importers].map(escaped).join("|")})(?![\\w-])`).test(line));
/** Any line that blames a timeout or a wait: the generic message S-29 asks not to be the whole answer. */
const sayTimeout = (out: string) => /time[ds]?[ -]?out|timing out|gave up|never became ready|deadline|waiting for|did not (come up|start|finish|become ready) (in|within)/i.test(out);
const explains = (out: string, rule: Rule = EXPORT) => namesTheExportAndAFile(out, rule) && !sayTimeout(out);
/** What is wrong with how a prove of the broken copy ended: empty when it exited non-zero inside the bound with a message that says why. */
const problems = (ended: Ended, rule: Rule = EXPORT): ReadonlyArray<string> => [
  ...(ended.hung ? [`still running after ${HARD_STOP_SECONDS} s`] : []),
  ...(ended.seconds >= BOUND_SECONDS ? [`took ${ended.seconds} s, not under ${BOUND_SECONDS}`] : []),
  ...(ended.status === null || ended.status === 0 || ended.status >= 126 ? [`exit status is ${ended.status}, not a deliberate failure`] : []),
  ...(namesTheExportAndAFile(ended.out, rule) ? [] : [`no line says ${rule} is missing, with a file`]),
  ...(blames(ended.out, RULES[rule].other) ? [`a line says ${RULES[rule].other} is missing, and it is not`] : []),
  ...(sayTimeout(ended.out) ? ["a generic timeout line"] : []),
];
/** What wrangler writes for the S-29 copy: esbuild's error, coloured even in a file, with a path relative to the worker. */
const WRANGLER_LINE = `  \u001b[31m✘ \u001b[41;31m[\u001b[41;97mERROR\u001b[41;31m]\u001b[0m \u001b[1mNo matching export in "../../blueprint/things/handle/invariants.ts" for import "${EXPORT}"\u001b[0m`;
const said = `src/handle/resolve.ts imports ${EXPORT}, which ${INVARIANTS} does not export`;

describe("36 controls: the matcher, and an intact copy", () => {
  it("the message test knows a good message from each wrong one", () => {
    expect(explains(`prove couldn't run: src/handle/resolve.ts imports ${EXPORT}, which ${INVARIANTS} does not export`)).toBe(true);
    expect(explains(`✘ [ERROR] No matching export in "blueprint/things/handle/invariants.ts" for import "${EXPORT}"`)).toBe(true);
    // The line wrangler really writes, colour codes and all (traced by the 🔍 of #253 in `.ortho/prove/wrangler.log`), with its `../../` path.
    expect(explains(WRANGLER_LINE), "wrangler's own coloured line").toBe(true);
    expect(explains(`${WRANGLER_LINE}\n\u001b[31mX\u001b[0m something else`), "among other lines").toBe(true);
    // Fair phrasings of the same fact.
    expect(explains(`src/handle/resolve.ts: ${EXPORT} isn't exported from ${INVARIANTS}`), "isn't exported").toBe(true);
    expect(explains(`${INVARIANTS} lacks ${EXPORT} (imported by src/handle/resolve.ts)`), "lacks").toBe(true);
    expect(explains(`${EXPORT} is absent from ${INVARIANTS}`), "is absent from").toBe(true);
    expect(explains(`unresolved import ${EXPORT} in src/handle/resolve.ts`), "unresolved import").toBe(true);
    expect(explains(`no matching export for ${EXPORT} in ${INVARIANTS}`), "no matching export").toBe(true);
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
    // Hollow by the 🔍 of #253: one line naming both rules; the export beside a word that is not about its absence.
    expect(explains(`the world could not start: cannot load rules from ${INVARIANTS}: oneHolderPerName, oneNamePerPerson`), "one line naming both, saying nothing is missing").toBe(false);
    expect(explains(`loaded ${INVARIANTS}: ${EXPORT} (not yet checked)`), "a 'not' that is not about the export").toBe(false);
    expect(explains(`${EXPORT} from ${INVARIANTS}; no journeys ran`), "a 'no' that is not about the export").toBe(false);
    expect(explains(`${INVARIANTS}: ${EXPORT}, oneNamePerPerson missing`), "the absence sits on the other rule").toBe(false);
    expect(explains(`${INVARIANTS} lacks oneNamePerPerson ${"x".repeat(150)} ${EXPORT}`), "the absence is far from the export").toBe(false);
    expect(explains(`${INVARIANTS} exports ${EXPORT}, nothing is missing`), "a negated absence word").toBe(false);
    expect(explains(`${EXPORT} is not missing from ${INVARIANTS}`), "not missing").toBe(false);
    expect(explains(`${INVARIANTS}: ${EXPORT} ok; 0 files not found`), "an absence in another clause").toBe(false);
    expect(explains(`${EXPORT} ${INVARIANTS} missing_not`), "absence word inside a longer word").toBe(false);
    expect(blames(`${INVARIANTS}: ${EXPORT}, oneNamePerPerson missing`, "oneNamePerPerson"), "blames reads the other rule").toBe(true);
    expect(blames(said, "oneNamePerPerson"), "a correct line blames only its own rule").toBe(false);
    // Found by the hostile pass: the right words on a line that does not say the export is missing, a longer identifier, a wrong file, other wordings of a wait.
    expect(explains(`src/handle/resolve.ts:3: import { ${EXPORT} } from "../../blueprint/things/handle/invariants.ts"`), "an echo of the import").toBe(false);
    expect(explains(`loaded rules from ${INVARIANTS}: ${EXPORT}`), "a loaded-rules log").toBe(false);
    expect(explains(`${EXPORT} is exported from ${INVARIANTS}`), "says it is there").toBe(false);
    expect(explains(`${EXPORT}V2 not found in ${INVARIANTS}`), "a longer identifier").toBe(false);
    expect(explains(`${EXPORT} missing in blueprint/things/link/invariants.ts`), "another thing's invariants file").toBe(false);
    expect(explains(`${EXPORT} missing in node_modules/foo/invariants.ts`), "another project's invariants file").toBe(false);
    expect(explains(`${EXPORT} missing, imported by src/link/add.ts`), "a handler that does not import it").toBe(false);
    expect(explains(`gave up waiting; the world never became ready (${EXPORT}, ${INVARIANTS})`)).toBe(false);
    expect(explains(`src/link/add.ts imports oneNamePerPerson, which ${INVARIANTS} does not export`, "oneNamePerPerson")).toBe(true);
    expect(explains(`src/link/add.ts imports oneNamePerPerson, which ${INVARIANTS} does not export`), "the other rule's message").toBe(false);
  });

  it("the verdict passes a prove that fails fast and says why, and refuses each way of passing hollow", () => {
    const ok: Ended = { status: 1, out: said, seconds: 5, hung: false };
    expect(problems(ok)).toEqual([]);
    expect(problems({ ...ok, status: 0 }), "exits 0").toHaveLength(1);
    expect(problems({ ...ok, status: null, hung: true, seconds: 90 }).length).toBeGreaterThan(1);
    expect(problems({ ...ok, seconds: 75 }), "exits too late").toHaveLength(1);
    expect(problems({ ...ok, out: "" }), "exits 1 with no message").toHaveLength(1);
    expect(problems({ ...ok, out: `${INVARIANTS} does not export oneNamePerPerson` }), "names the wrong export (and blames the rule that is there)").toHaveLength(2);
    expect(problems({ ...ok, out: `timed out: ${said}` }), "a timeout line").toHaveLength(1);
    expect(problems({ ...ok, status: 2, out: "prove couldn't run" }), "a generic failure").toHaveLength(1);
    expect(problems({ ...ok, status: 139 }), "a crash").toHaveLength(1);
    expect(problems({ ...ok, status: 1, seconds: 3 }, "oneNamePerPerson"), "names the other rule").toHaveLength(2);
    expect(problems({ ...ok, out: `${said}\n${INVARIANTS} lacks oneNamePerPerson` }), "also blames the rule that is there").toHaveLength(1);
    expect(problems({ ...ok, out: `could not start: cannot load rules from ${INVARIANTS}: oneHolderPerName, oneNamePerPerson` }), "one hollow line naming both").toHaveLength(1);
    expect(problems({ ...ok, out: WRANGLER_LINE }), "wrangler's own coloured line").toEqual([]);
  });

  it("an intact copy of Plugged In proves green inside the bound, with `claim a handle` passing, and nothing is left running", async () => {
    const root = intact();
    const ended = await proveOnce(root);
    expect(ended.hung, ended.out.slice(-300)).toBe(false);
    expect(ended.status, ended.out.slice(-300)).toBe(0);
    expect(namesTheExportAndAFile(ended.out), "a healthy prove says a rule is missing").toBe(false);
    expect(namesTheExportAndAFile(ended.out, "oneNamePerPerson"), "a healthy prove says a rule is missing").toBe(false);
    expect(ended.out).toMatch(/^journey claim a handle ✔ \d+\/\d+ steps$/m);
    expect(ended.seconds).toBeLessThan(BOUND_SECONDS);
    expect(await leftRunning(root), "prove left processes of this copy running").toEqual([]);
    nothingRunning(root);
  });
});

describe("36: a handler importing a rule its invariants.ts does not export fails fast and says which", () => {
  const judge = async (root: string, ended: Ended, rule: Rule = EXPORT) => {
    expect(await leftRunning(root), "prove left processes of this copy running").toEqual([]);
    expect(problems(ended, rule), `prove did not fail fast and say why; it printed ${JSON.stringify(ended.out.slice(-500))}`).toEqual([]);
  };

  it("a whole prove with oneHolderPerName removed exits non-zero within 60 s and names the export and a file", async () => {
    const root = broken("oneHolderPerName");
    await judge(root, await proveOnce(root));
  });

  it("the same with `--only 'claim a handle'`: the world cannot start either", async () => {
    const root = broken("oneHolderPerName");
    await judge(root, await proveOnce(root, "--only", "claim a handle"));
  });

  it("a whole prove with oneNamePerPerson removed (a rule only link.add imports): the same, naming that export, not the first", async () => {
    const root = broken("oneNamePerPerson");
    await judge(root, await proveOnce(root), "oneNamePerPerson");
  });
});
