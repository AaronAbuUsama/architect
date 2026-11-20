// Check 29 (ST1.23, Goal 3): `ortho prove --changed` proves only the journeys a change touches, names every journey it skipped, and
// proves everything, saying why, when it cannot tell. A miss is a false green, so this check is the point of the slice.
// Written by the checks author from `design/research/speed-and-vitest-proposal.md` (A2, B1); a builder never edits this file or
// `prove-speed.ts` (AGENTS.md, "Journeys and checks come first"). The choice of surface is `design/decisions/ST1-23-prove-changed.md`.
//
// THE SURFACE THE CHECK EXPECTS (the builder's brief)
//   ortho prove --changed [--report <file>] [--json] [--root <dir>]      (--env local only, like --only)
//   Base: the record of the last proof, `.ortho/evidence/proven.json`, which prove already writes. No git, no ref. The record must
//   also be able to tell, on the next run, which files changed since it was made: it keeps a content hash of every file of the
//   project that can change a proof (blueprint/, src/, journeys/, generated/, ortho.config.ts, package.json), by relative path, so a
//   record made in one folder holds in a copy of it (CI cache, this check). The model's own hashes already place three of them:
//   `operations.<op>.hash` (the declaration), `journeys.<file>.sourceHash`, `startingWorlds.<name>.sourceHash`, and prove's
//   `handlerHashes` the handler.
//   Rerun, exactly: a journey whose own file changed; a journey (through its steps or the starting worlds it stands on, oldest first)
//   that calls an operation whose handler, declaration or last verdict (failed, never proven) changed; a journey whose starting world
//   changed. Nothing else.
//   Cannot tell: a changed, added or removed file that is none of those (ortho.config.ts, package.json, a helper in src/ no handler
//   is known to import, any new file) or no record at all. Then it proves every journey and says why.
//   Says, in text (stdout):
//     prove --changed: proving <n> of <total> journeys               (it can tell; n may be 0)
//     journey <name> skipped: nothing it calls changed               (one line per skipped journey, the name as `Blueprint.journey` gives it)
//     prove --changed: proving all <total> journeys: <why>           (it cannot tell; <why> matches /cannot place/ and names each such file
//                                                                      by its path from the project root, or is "no record of an earlier prove")
//   and in the report (--report, --json), beside the existing fields (`journeys` holds only the journeys it ran), a new section
//     "changed": { "base": "last proof", "rerun": [<names>], "skipped": [<names>], "fellBack": null | { "reason": <why>, "files": [<paths>] } }
//   Exit and verdict: 0 and `passed` when every journey it ran passed and the evals it judges pass (what it skipped keeps its recorded
//   verdicts, which stand until what they rest on changes). 1 otherwise. After a run it records what it ran: a pass is recorded as
//   proven, a failure is not (the next --changed reruns it), and what it skipped keeps its record, so a second --changed straight
//   after, with nothing changed, runs 0 of the journeys and exits 0.
//
// HOW IT IS JUDGED. Each row plants one change in a copy of acme, seeded with the record a full prove made in an earlier copy, then
// asserts the EXACT set of journeys rerun and the exact set named skipped, against sets worked out from `generated/model/model.json`
// (`calling`, `standingOn`), never from prove's output: a comment in a handler (spend, grant, revoke), a number in a read's
// declaration, a sentence in an operation's, a comment in a journey, a comment in a starting world (one that another is made
// from too), and, for a file the map cannot place, a line in the config or package.json, a new helper, and an existing helper
// edited and deleted. Comments differ in their words every time, so nothing can be keyed on them. Two changes at once are the
// union; a placeable change beside one it cannot place falls back; a second run straight after a rerun runs none; a failing change
// is rerun until it passes. Besides prove's own report, each run is judged from what it recorded elsewhere: every journey is
// reported step by step as the model declares them, the ones that fail are the ones that must, and the operations the collector
// heard (`.ortho/prove-telemetry`, which prove empties at the start of a run) are within what the journeys it ran call and
// include everything their starting worlds make. A prove that runs everything fails each row but the fall-backs; one that runs
// nothing fails each row that has a journey to rerun; one that is one journey off, or the right count of the wrong ones, fails the
// same way; the controls plant each of those into the judge (and the world run for a skipped journey, the steps left out, a journey
// that fails where it should pass).
//
// Not planted here, and left to the builder's own tests and the review: a change only an eval catches (what a skipped operation's
// evals judged keeps its record until what it rests on changes), and a second project.
//
// Red today on one reason only: `--changed` is an unrecognized flag, a usage error (exit 1, "Unrecognized flag: --changed in command
// ortho prove"), so no report is written. Controls, true today: the full prove and the record it writes; the sets, from the model; the
// planted failure is real; the judge accepting a right run and refusing every wrong one; a record made in one folder holding in
// another (`ortho impact`: stale none); each plant seen by `ortho impact` (a handler, a declaration) or, for a journey (its `sourceHash` is the model's), the
// map cannot place, not seen by it. No Docker. Each row starts workerd worlds of its own through prove, on ports from the OS.
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { acme, copyOf, nothingRunning, run } from "./support.ts";
import { append, calling, edit, journeyNames, modelOf, perfect, problems, prove, standingOn, stepsShortfall, worldCallsOf, type Expected, type JourneyMap, type Proved } from "./prove-speed.ts";

const RECORD = ".ortho/evidence/proven.json";
const SPEND = "src/allowance/spend.ts";
const GRANT = "src/allowance/grant.ts";
const GET = "blueprint/things/allowance/verbs/get.ts";
const REVOKE = "blueprint/things/allowance/verbs/revoke.ts";
const JOURNEY = "journeys/outsider-cannot-revoke.ts";
const CONFIG = "ortho.config.ts";
const HELPER = "src/allowance/format.ts";
/** A helper no handler imports, in every copy and in the record: edited and deleted below. HELPER is the one that is new. */
const MONEY = "src/allowance/money.ts";
const MONEY_SOURCE = "export const money = (n: bigint) => `${n}`;\n";
const PACKAGE = "package.json";
/** Files outside blueprint/, src/ and journeys/ that can change a proof, in every copy and in the record: any change to one proves everything. */
const LOCK = "pnpm-lock.yaml";
const TSCONFIG = "tsconfig.json";
const ENV = ".env";
const OTHER_FILES: Readonly<Record<string, string>> = { [LOCK]: "lockfileVersion: '9.0'\n", [ENV]: "# a note, no value\n" };
const WORLD = "blueprint/starting-worlds";
const REVOKE_HANDLER = "src/allowance/revoke.ts";

const SPEND_JOURNEYS = ["revoke then spend", "spend twice with one request", "spend within an allowance"];
const FAILING = ["spend twice with one request", "spend within an allowance"];
const GRANT_JOURNEYS = ["grant an allowance", "an outsider cannot revoke", "read an allowance", "revoke then spend", "spend twice with one request", "spend within an allowance"];

const copies: Array<ReturnType<typeof copyOf>> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });
let baseline: ReturnType<typeof copyOf>;
let map: JourneyMap;
let all: ReadonlyArray<string>;
let record: string;
let first: Proved;
afterAll(() => baseline?.remove());

/** A copy of acme holding the record the full prove made in the baseline copy (a CI cache restored, a folder moved). */
const seeded = (withRecord = true) => {
  const copy = copyOf(acme);
  copies.push(copy);
  writeFileSync(join(copy.root, MONEY), MONEY_SOURCE);
  for (const [file, text] of Object.entries(OTHER_FILES)) writeFileSync(join(copy.root, file), text);
  if (withRecord) {
    mkdirSync(dirname(join(copy.root, RECORD)), { recursive: true });
    writeFileSync(join(copy.root, RECORD), record);
  }
  return copy.root;
};
/** A comment changes a file's bytes, not what it does; its words differ each time, so nothing can be keyed on them. */
const note = () => `\n// planted ${Math.random().toString(36).slice(2)}: a comment changes the bytes, not what the code does\n`;
const plantHandler = (root: string) => append(root, SPEND, note());
const plantGrant = (root: string) => append(root, GRANT, note());
const plantRead = (root: string) => edit(root, GET, (t) => t.replace('"50 millis"', '"60 millis"'));
const plantOperation = (root: string) => edit(root, REVOKE, (t) => t.replace("Nothing more can be spent from it.", "Nothing more can be spent from it, ever."));
const plantJourney = (root: string) => append(root, JOURNEY, note());
/** The one log line that says why `grant` refused a limit over the cap: no journey reads logs, the explainability eval does. */
const dropDecidingLog = (root: string) => edit(root, GRANT, (t) => t.replace(/^\s*yield\* Effect\.logInfo\("the limit is over.*\n/m, ""));
const breakSpend = (root: string) => edit(root, SPEND, (t) => t.replace("return { remaining: remaining - amount }", "return { remaining }"));

const expecting = (ran: ReadonlyArray<string>, over: Partial<Expected> = {}): Expected => ({ ran, fellBackOn: null, all, map, passes: true, ...over });
const judged = (proved: Proved, want: Expected) => expect(problems(proved, want), `${proved.out.slice(-300)}`).toEqual([]);

beforeAll(async () => {
  baseline = copyOf(acme);
  writeFileSync(join(baseline.root, MONEY), MONEY_SOURCE);
  for (const [file, text] of Object.entries(OTHER_FILES)) writeFileSync(join(baseline.root, file), text);
  first = await prove(baseline.root);
  map = modelOf(baseline.root);
  all = journeyNames(map);
  record = existsSync(join(baseline.root, RECORD)) ? readFileSync(join(baseline.root, RECORD), "utf8") : "";
}, 600_000);

describe("29 controls: the instruments, and what today's prove already does", () => {
  it("the full prove passes on acme's 11 journeys and leaves the record every row starts from", () => {
    expect(first.status, first.out.slice(-800)).toBe(0);
    expect(first.report?.journeys.map((j) => j.name).sort()).toEqual([...all]);
    expect(all).toHaveLength(11);
    expect(JSON.parse(record).proven["allowance.spend"]).toBeDefined();
    nothingRunning(baseline.root);
  });

  it("the full prove's spans satisfy the steps rule: each operation is heard at least as often as the steps of the journeys that reach its handler", () => {
    expect(stepsShortfall(map, all, first.counts)).toEqual([]);
    expect(first.counts.get("allowance.revoke"), "revoke then spend's refused spend and the two refused revokes leave only one").toBe(1);
  });

  it("an eval-only plant is real: a full prove passes every journey and fails grant's explainability alone", async () => {
    const root = seeded(false);
    dropDecidingLog(root);
    const full = await prove(root);
    expect(full.report!.journeys.filter((j) => j.verdict !== "pass")).toEqual([]);
    expect(full.status).toBe(1);
    expect(full.out.match(/^allowance\.\S+ \S+ ✘.*$/gm)?.filter((l) => !l.includes(" coverage ") && !l.includes(" evals ")).map((l) => l.split(" ").slice(0, 3).join(" "))).toEqual(["allowance.grant explainability ✘"]);
    nothingRunning(root);
  });

  it("the sets come from the model: spend is called by 3 journeys, grant by 6 (five stand on `funded`), get by 2, revoke by 2", () => {
    expect(calling(map, "allowance.spend")).toEqual(SPEND_JOURNEYS);
    expect(calling(map, "allowance.grant")).toEqual([...GRANT_JOURNEYS].sort());
    expect(calling(map, "allowance.get")).toEqual(["read an allowance", "spend twice with one request"]);
    expect(calling(map, "allowance.revoke")).toEqual(["an outsider cannot revoke", "revoke then spend"]);
    expect(all.filter((name) => !SPEND_JOURNEYS.includes(name))).toHaveLength(8);
  });

  it("a break planted in spend.ts fails exactly 2 of the 3 journeys that call spend, on a full prove: the planted failure is real", async () => {
    const root = seeded(false);
    breakSpend(root);
    const full = await prove(root);
    expect(full.status, full.out.slice(-300)).toBe(1);
    expect(full.report!.journeys.filter((j) => j.verdict !== "pass").map((j) => j.name).sort()).toEqual(FAILING);
    nothingRunning(root);
  });

  it("the judge accepts a right run, and refuses each way of being wrong: everything, nothing, one more, one fewer, the right count of the wrong ones", () => {
    const rows: ReadonlyArray<readonly [string, Expected]> = [
      ["spend", expecting(SPEND_JOURNEYS)],
      ["none", expecting([])],
      ["fall back, a file", expecting(all, { fellBackOn: [CONFIG] })],
      ["fall back, no record", expecting(all, { fellBackOn: [], reason: /no record of an earlier prove/ })],
      ["a failing run", expecting(SPEND_JOURNEYS, { passes: false, fails: FAILING })],
      ["spend, evals judged", expecting(SPEND_JOURNEYS, { judges: ["allowance.spend"] })],
      ["an eval alone fails", expecting(calling(map, "allowance.grant"), { passes: false, fails: [], judges: ["allowance.grant"], evalFails: ["allowance.grant explainability ✘"] })],
    ];
    for (const [row, want] of rows) {
      const right = perfect(want);
      expect(problems(right, want), row).toEqual([]);
      const wrong = (name: string, edited: Pick<Proved, "status" | "out" | "report" | "called" | "counts">, expected = want) => expect(problems(edited, expected), `${row}: ${name}`).not.toEqual([]);
      const swap = (names: ReadonlyArray<string>) => ({ ...right, report: { ...right.report, journeys: names.map((n) => ({ name: n, verdict: "pass", steps: [] })) } });
      if (want.fellBackOn === null) {
        wrong("runs everything", swap(all));
        const another = all.find((n) => !want.ran.includes(n))!;
        wrong("one journey more", swap([...want.ran, another]));
        if (want.ran.length > 0) wrong("one journey fewer", swap(want.ran.slice(1)));
        if (want.ran.length > 0) wrong("the right count, the wrong ones", swap([...want.ran.slice(1), another]));
        if (want.ran.length > 0) wrong("runs nothing", swap([]));
        wrong("a repeated journey", swap([...want.ran, want.ran[0] ?? another]));
        wrong("a skipped journey not named", { ...right, out: right.out.replace(/^journey .* skipped.*\n/m, "") });
        wrong("a journey named skipped that ran", { ...right, out: `${right.out}\njourney ${want.ran[0] ?? all[0]} skipped: nothing it calls changed` });
        wrong("the record says it fell back", { ...right, report: { ...right.report, changed: { ...right.report.changed, fellBack: { reason: "cannot place x", files: ["x"] } } } });
        wrong("the world ran an operation only a skipped journey calls", { ...right, called: new Set([...right.called, "session.sign-in"]) });
        if (want.ran.length > 0) wrong("the world was never asked to run what the starting worlds make", { ...right, called: new Set() });
        wrong("the headline counts wrong", { ...right, out: right.out.replace(/proving \d+ of/, "proving 99 of") });
      } else {
        wrong("the world was never asked to run what the starting worlds make", { ...right, called: new Set() });
        wrong("it did not say it fell back", { ...right, report: { ...right.report, changed: { ...right.report.changed, fellBack: null } } });
        wrong("it ran only some", swap(all.slice(1)));
        wrong("no reason", { ...right, report: { ...right.report, changed: { ...right.report.changed, fellBack: { reason: "", files: [...want.fellBackOn] } } } });
        wrong("the file is not named", { ...right, report: { ...right.report, changed: { ...right.report.changed, fellBack: { reason: right.report.changed.fellBack!.reason, files: ["some/other/file.ts"] } } } });
        wrong("it skipped some as well", { ...right, out: `${right.out}\njourney ${all[0]} skipped: nothing it calls changed` });
      }
      if (want.ran.length > 0) {
        const first = right.report.journeys[0]!;
        const withFirst = (journey: typeof first) => ({ ...right, report: { ...right.report, journeys: [journey, ...right.report.journeys.slice(1)] } });
        wrong("a journey reported with no steps", withFirst({ ...first, steps: [] }));
        wrong("a step's verdict wrong where its journey's is right", withFirst({ ...first, steps: first.steps.map((st, i) => (i === 0 ? { ...st, verdict: st.verdict === "pass" ? "fail" : "pass" } : st)) }));
        wrong("a journey reported with another's steps", withFirst({ ...first, steps: [{ name: "a step", verdict: first.verdict }] }));
        wrong("a journey that fails where it should pass, or passes where it should fail", withFirst({ ...first, verdict: first.verdict === "pass" ? "fail" : "pass" }));
      }
      if (want.ran.length > 0 && (want.passes || want.fails?.length === 0)) wrong("journeys reported that the collector never heard run (the spans of their steps are missing)", { ...right, counts: new Map() });
      if (want.ran.length > 0 && (want.passes || want.fails?.length === 0)) {
        const setupOnly = new Map(want.ran.flatMap((name) => [...worldCallsOf(map, name)]).map((op) => [op, 1] as const));
        wrong("a collector that holds only the starting worlds' setup calls", { ...right, counts: setupOnly, called: new Set(setupOnly.keys()) });
      }
      for (const op of want.judges ?? []) wrong(`${op}'s evals not judged again`, { ...right, out: right.out.split("\n").filter((l) => !l.startsWith(`${op} `)).join("\n") });
      for (const line of want.evalFails ?? []) wrong(`no line for "${line}"`, { ...right, out: right.out.replace(line, "x") });
      wrong("a wrong exit status", { ...right, status: want.passes ? 1 : 0 });
      wrong("passed says otherwise", { ...right, report: { ...right.report, passed: !want.passes } });
      wrong("the journeys ran but the report is not there", { ...right, report: undefined });
    }
  });

  it("a record made in one folder holds in a copy of it: `ortho impact` says stale none", () => {
    const root = seeded();
    const impact = run(root, "impact");
    expect(impact.status, impact.out).toBe(0);
    expect(impact.out).toMatch(/^stale none$/m);
  });

  it("each planted change is a real one: today's `ortho impact` sees the handler, the declarations and the journey; it cannot see the config or a new helper", () => {
    const stale = (plant: (root: string) => void) => {
      const root = seeded();
      plant(root);
      return run(root, "impact").out.match(/^stale (.*)$/m)?.[1];
    };
    expect(stale(plantHandler)).toBe("allowance.spend");
    expect(stale(plantGrant)).toBe("allowance.grant");
    expect(stale(plantRead)).toBe("allowance.get");
    expect(stale(plantOperation)).toBe("allowance.revoke");
    expect(stale(plantJourney)).not.toBe("none");
    expect(stale((root) => append(root, CONFIG, "\n// planted\n"))).toBe("none");
    for (const file of [LOCK, TSCONFIG, ENV]) expect(stale((root) => append(root, file, "\n")), file).toBe("none");
    expect(stale((root) => writeFileSync(join(root, HELPER), "export const format = (n: bigint) => `${n}`;\n"))).toBe("none");
  });

  it("today's `--only` answers exactly the one journey it is given, as the instrument reads it (a rerun set can be read)", async () => {
    const root = seeded();
    const only = await prove(root, "--only", "health is up");
    expect(only.report?.journeys.map((j) => j.name)).toEqual(["health is up"]);
    nothingRunning(root);
  });
});

describe("29 ST1.23: ortho prove --changed proves what a change touches, names what it skipped, and falls back to everything when it cannot tell", () => {
  it("with no record of an earlier proof it proves all 11 journeys and says there is no record", async () => {
    const root = seeded(false);
    const proved = await prove(root, "--changed");
    judged(proved, expecting(all, { fellBackOn: [], reason: /no record of an earlier prove/ }));
    nothingRunning(root);
  });

  it("a change to spend.ts proves the 3 journeys that call spend and names the 8 it skipped", async () => {
    const root = seeded();
    plantHandler(root);
    const proved = await prove(root, "--changed");
    judged(proved, expecting(SPEND_JOURNEYS, { judges: ["allowance.spend"] }));
    expect(proved.report?.changed?.skipped).toHaveLength(8);
    nothingRunning(root);
  });

  it("a change to grant.ts proves the 6 journeys that call grant, the five that stand on `funded` included", async () => {
    const root = seeded();
    plantGrant(root);
    const proved = await prove(root, "--changed");
    judged(proved, expecting(calling(map, "allowance.grant"), { judges: ["allowance.grant"] }));
    expect(proved.report?.changed?.rerun).toHaveLength(6);
    nothingRunning(root);
  });

  it("a changed declaration of a read (get's budget, a read has no handler) proves the 2 journeys that read it", async () => {
    const root = seeded();
    plantRead(root);
    const proved = await prove(root, "--changed");
    judged(proved, expecting(["read an allowance", "spend twice with one request"], { judges: ["allowance.get"] }));
    nothingRunning(root);
  });

  it("a changed declaration of an operation (revoke's description) proves the 2 journeys that call revoke", async () => {
    const root = seeded();
    plantOperation(root);
    const proved = await prove(root, "--changed");
    judged(proved, expecting(["an outsider cannot revoke", "revoke then spend"], { judges: ["allowance.revoke"] }));
    nothingRunning(root);
  });

  it("a changed journey proves that journey and no other, though it calls operations other journeys call", async () => {
    const root = seeded();
    plantJourney(root);
    const proved = await prove(root, "--changed");
    judged(proved, expecting(["an outsider cannot revoke"]));
    nothingRunning(root);
  });

  it("a changed config (a file the map cannot place) proves all 11 and names ortho.config.ts", async () => {
    const root = seeded();
    append(root, CONFIG, "\n// planted: nothing in the model says which journeys this file touches\n");
    const proved = await prove(root, "--changed");
    judged(proved, expecting(all, { fellBackOn: [CONFIG] }));
    nothingRunning(root);
  });

  it("a new helper file under src/ (a file the map cannot place) proves all 11 and names it", async () => {
    const root = seeded();
    writeFileSync(join(root, HELPER), "export const format = (n: bigint) => `${n}`;\n");
    const proved = await prove(root, "--changed");
    judged(proved, expecting(all, { fellBackOn: [HELPER] }));
    nothingRunning(root);
  });

  it("a change to revoke.ts proves the 2 journeys that call revoke, whatever the words of the planted comment", async () => {
    const root = seeded();
    append(root, REVOKE_HANDLER, note());
    const proved = await prove(root, "--changed");
    judged(proved, expecting(calling(map, "allowance.revoke"), { judges: ["allowance.revoke"] }));
    nothingRunning(root);
  });

  it("a changed starting world (`funded`) proves the 5 journeys that stand on it, not the ones that stand on `founded` alone", async () => {
    const root = seeded();
    append(root, `${WORLD}/funded.ts`, note());
    const proved = await prove(root, "--changed");
    judged(proved, expecting(standingOn(map, "funded")));
    expect(proved.report?.changed?.rerun).toHaveLength(5);
    nothingRunning(root);
  });

  it("a changed starting world one other is made from (`founded`) proves every journey that stands on it, through `funded` and `invited`: 9", async () => {
    const root = seeded();
    append(root, `${WORLD}/founded.ts`, note());
    const proved = await prove(root, "--changed");
    judged(proved, expecting(standingOn(map, "founded")));
    expect(proved.report?.changed?.rerun).toHaveLength(9);
    nothingRunning(root);
  });

  it("an edit to a helper no handler imports (in the record, so it is a change, not a new file) proves all 11 and names it", async () => {
    const root = seeded();
    append(root, MONEY, note());
    judged(await prove(root, "--changed"), expecting(all, { fellBackOn: [MONEY] }));
    nothingRunning(root);
  });

  it("a deleted helper (in the record) proves all 11 and names it", async () => {
    const root = seeded();
    rmSync(join(root, MONEY));
    judged(await prove(root, "--changed"), expecting(all, { fellBackOn: [MONEY] }));
    nothingRunning(root);
  });

  it("a changed package.json (a file the map cannot place) proves all 11 and names it", async () => {
    const root = seeded();
    append(root, PACKAGE, "\n");
    judged(await prove(root, "--changed"), expecting(all, { fellBackOn: [PACKAGE] }));
    nothingRunning(root);
  });

  it("a change only an eval reads (the log that says why grant refused) reruns the 6 journeys, which pass, and judges grant's evals again: explainability fails and prove exits 1", async () => {
    const root = seeded();
    dropDecidingLog(root);
    const proved = await prove(root, "--changed");
    judged(proved, expecting(calling(map, "allowance.grant"), { passes: false, fails: [], judges: ["allowance.grant"], evalFails: ["allowance.grant explainability ✘"] }));
    nothingRunning(root);
  });

  for (const [file, kind] of [[LOCK, "the lockfile"], [TSCONFIG, "tsconfig.json"], [ENV, "an env file"]] as const) {
    it(`a changed ${kind} (${file}), a file the map cannot place, proves all 11 and names it`, async () => {
      const root = seeded();
      append(root, file, "\n");
      judged(await prove(root, "--changed"), expecting(all, { fellBackOn: [file] }));
      nothingRunning(root);
    });
  }

  it("two changes at once prove the union of what each touches, not the first one's", async () => {
    const root = seeded();
    plantHandler(root);
    plantRead(root);
    plantJourney(root);
    const proved = await prove(root, "--changed");
    judged(proved, expecting([...new Set([...SPEND_JOURNEYS, "read an allowance", "spend twice with one request", "an outsider cannot revoke"])]));
    nothingRunning(root);
  });

  it("a placeable change beside one it cannot place still proves everything, naming the one it cannot place", async () => {
    const root = seeded();
    plantHandler(root);
    append(root, CONFIG, "\n// planted\n");
    const proved = await prove(root, "--changed");
    judged(proved, expecting(all, { fellBackOn: [CONFIG] }));
    nothingRunning(root);
  });

  it("the record moves on: a second --changed straight after a rerun runs none of the 11 and exits 0", async () => {
    const root = seeded();
    plantHandler(root);
    judged(await prove(root, "--changed"), expecting(SPEND_JOURNEYS));
    const again = await prove(root, "--changed");
    judged(again, expecting([]));
    expect(again.report?.changed?.skipped).toHaveLength(11);
    nothingRunning(root);
  });

  it("a change that fails is never recorded as proven: the journeys that failed rerun until they pass, and then nothing reruns", async () => {
    const root = seeded();
    breakSpend(root);
    // `revoke then spend` calls spend but never reaches its handler (the machine refuses first), so the break fails two of the three.
    // A record keyed by hashes may rerun the failing two or all three on the next run: both are right; running none, or others, is not.
    const either = (proved: Proved, passes: boolean) => {
      const ways = [FAILING, SPEND_JOURNEYS].map((ran) => problems(proved, expecting(ran, { passes, fails: FAILING })));
      expect(ways.some((found) => found.length === 0), `${proved.out.slice(-300)}\n${JSON.stringify(ways)}`).toBe(true);
    };
    judged(await prove(root, "--changed"), expecting(SPEND_JOURNEYS, { passes: false, fails: FAILING }));
    either(await prove(root, "--changed"), false);
    writeFileSync(join(root, SPEND), readFileSync(join(acme, SPEND), "utf8"));
    either(await prove(root, "--changed"), true);
    judged(await prove(root, "--changed"), expecting([]));
    nothingRunning(root);
  });
});
