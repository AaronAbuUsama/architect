// What the on-chain checks share: the budgets journeys' expectation, the snag log's reader, and the comparison of a regenerated
// `generated/` with the checked-in one. Each reader is a pure function over text or a folder, so a check can plant a wrong input
// against it (the controls in each test file).
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { copyOf, ortho, repo } from "../layer1/support.ts";

export { repo };
export { leftRunning, plain, proveOnce } from "../stage1/support.ts";
export const budgets = join(repo, "examples/budgets");
export const snagLog = join(repo, "design/goals/04-snags.md");

/**
 * The seven journeys of `examples/budgets` (its `journeys/README.md`, "Journeys"), by their declared names, with the steps each has.
 * `declared()` reads the journeys folder, so a journey added or removed without this list fails the check rather than slipping past it.
 */
export const JOURNEYS: Readonly<Record<string, number>> = {
  "a Safe grants a member an allowance": 2,
  "only the Safe grants": 3,
  "a member spends within an allowance": 3,
  "a wrong signer is refused before anything is sent": 5,
  "revoke then spend": 4,
  "a spend submitted twice lands once": 4,
  "a spend over the limit is refused": 5,
};
export const STEPS = Object.values(JOURNEYS).reduce((a, b) => a + b, 0);

/** The journey files of the example: one per journey, the README aside. */
export const declared = () => readdirSync(join(budgets, "journeys")).filter((f) => f.endsWith(".ts"));

/** What is wrong with a journey verdict list: empty when exactly the budgets journeys ran, each with all its steps green. */
export const journeyProblems = (seen: ReadonlyArray<{ readonly name: string; readonly green: number; readonly total: number }>): ReadonlyArray<string> => {
  const names = seen.map((j) => j.name);
  return [
    ...Object.keys(JOURNEYS).filter((n) => !names.includes(n)).map((n) => `journey "${n}" did not run`),
    ...names.filter((n) => !(n in JOURNEYS)).map((n) => `unexpected journey "${n}"`),
    ...names.filter((n, i) => names.indexOf(n) !== i).map((n) => `journey "${n}" ran twice`),
    ...seen.filter((j) => j.name in JOURNEYS && j.total !== JOURNEYS[j.name]).map((j) => `journey "${j.name}" ran ${j.total} steps, expected ${JOURNEYS[j.name]}`),
    ...seen.filter((j) => j.green !== j.total).map((j) => `journey "${j.name}" is red: ${j.green}/${j.total} steps green`),
  ];
};

// ---- the snag log ----

/** The first snag numbers that must stay in the log: the ten the journey author logged. An entry deleted does not count as fixed. */
export const FIRST_SNAGS = 10;

/** `Owner: <who>` up to the sentence's end (a full stop followed by a space or the end), so `later.md` stays whole. */
const OWNER = /\bOwner:\s*(.*?)(?:\.(?:\s|$)|$)/;
const words = (text: string) => text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/**
 * What is wrong with the snag log, one line per problem, each naming its snag. Reads only each entry's `- Status:` line:
 * `fixed` must name the change (a pull request `#123` or a commit hash); `parked` must name an owner (`Owner: <who>`) and give a
 * reason (at least four words besides the owner); `open` and `building` are named as open. Entries S-01 to S-10 must all be there.
 */
export const snagProblems = (log: string): ReadonlyArray<string> => {
  const parts = log.split(/^## (?=S-\d+ )/m).slice(1);
  const entries = parts.map((p) => ({ id: p.match(/^(S-\d+)/)![1]!, title: (p.split("\n")[0] ?? "").replace(/^S-\d+\s*·?\s*/, ""), body: p }));
  const problems: string[] = [];
  const ids = entries.map((e) => e.id);
  for (let n = 1; n <= FIRST_SNAGS; n++) if (!ids.includes(`S-${String(n).padStart(2, "0")}`)) problems.push(`S-${String(n).padStart(2, "0")} is missing from the log (an entry is never deleted)`);
  for (const id of ids.filter((id, i) => ids.indexOf(id) !== i)) problems.push(`${id} appears twice`);
  for (const e of entries) {
    const lines = e.body.split("\n").filter((l) => l.startsWith("- Status:"));
    const label = `${e.id} (${e.title})`;
    if (lines.length === 0) { problems.push(`${label} has no \`- Status:\` line`); continue; }
    if (lines.length > 1) { problems.push(`${label} has ${lines.length} \`- Status:\` lines`); continue; }
    const text = lines[0]!.replace(/^- Status:\s*/, "");
    const word = (text.match(/^([A-Za-z]+)/)?.[1] ?? "").toLowerCase();
    const rest = text.slice(word.length);
    if (word === "open" || word === "building") problems.push(`${label} is ${word}`);
    else if (word === "fixed") {
      if (!/#\d+|\b[0-9a-f]{7,40}\b/.test(rest)) problems.push(`${label} is fixed but names no change (a pull request #n or a commit)`);
    } else if (word === "parked") {
      const owner = rest.match(OWNER);
      if (!owner || words(owner[1]!) === 0) problems.push(`${label} is parked without an owner (\`Owner: <who>\`)`);
      const reason = rest.replace(/^\s*\([^)]*\)/, "").replace(OWNER, "").replace(/^[\s:,.;-]+/, "");
      if (words(reason) < 4) problems.push(`${label} is parked without a reason (four words at least, besides the owner)`);
    } else problems.push(`${label} has Status \`${text.slice(0, 40)}\`: not open, building, fixed or parked`);
  }
  return problems;
};

export const readSnagLog = () => existsSync(snagLog) ? readFileSync(snagLog, "utf8") : "";

// ---- generated files ----

const files = (root: string, dir = ""): ReadonlyArray<string> =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((d) => d.isDirectory() ? files(root, join(dir, d.name)) : [join(dir, d.name)]);

/** What differs between two folders, byte for byte: a file missing on either side, or one whose bytes differ. Empty when they are the same. */
export const treeProblems = (expected: string, actual: string): ReadonlyArray<string> => {
  const want = existsSync(expected) ? files(expected).sort() : [];
  const got = existsSync(actual) ? files(actual).sort() : [];
  return [
    ...(want.length === 0 ? [`${expected} holds no file, so there is nothing to compare`] : []),
    ...want.filter((f) => !got.includes(f)).map((f) => `${f} is checked in but not regenerated`),
    ...got.filter((f) => !want.includes(f)).map((f) => `${f} is regenerated but not checked in`),
    ...want.filter((f) => got.includes(f) && !readFileSync(join(expected, f)).equals(readFileSync(join(actual, f)))).map((f) => `${f} differs`),
  ];
};

/**
 * Regenerates an example's `generated/` in a copy of it outside the repository (the copy's own `generated/` removed first, so nothing
 * is kept from it) with the real `ortho generate`, and says what differs from the checked-in folder.
 */
export const regenerateProblems = (example: string): ReadonlyArray<string> => {
  const copy = copyOf(example);
  try {
    rmSync(join(copy.root, "generated"), { recursive: true, force: true });
    const ran = ortho(copy.root, "generate");
    if (ran.status !== 0) return [`ortho generate exited ${ran.status}: ${(ran.stdout + ran.stderr).slice(-1500)}`];
    return treeProblems(join(example, "generated"), join(copy.root, "generated"));
  } finally { copy.remove(); }
};
