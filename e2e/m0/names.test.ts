// Gate M0's name check: after the rename, the old names (Architect: `@architect/`, the `architect` command,
// `ARCHITECT_*` variables, `.architect/` folders, `architect.config`, `architect-*` names) appear nowhere in the
// repository except the records, which say what happened in the words used then (design/decisions/M0-packages.md,
// section 5). It scans every git-tracked file (so ignored and untracked files never count), and file names too.
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../..");

/** Records: paths (a trailing "/" is a folder, anything else one file) that keep the old names. M0-packages.md section 5 (with goal 1's prompt, a record of layers 1 and 2, and the K2 answered questions added). */
export const records: ReadonlyArray<string> = [
  "design/history/",
  "design/decisions/",
  "design/decisions.md",
  "design/evidence/",
  "design/briefs/",
  "design/wayfinding/",
  "design/spikes/",
  "design/noir/",
  "design/state/",
  "design/build-plan.md",
  "design/goals/01-the-whole-framework-locally.md",
  "design/frame/questions.md",
  "spikes/",
];

// The only exceptions beyond the records, each with its reason:
//  - this file: it has to spell every old name to look for it, and to plant them in its own tests;
//  - the GitHub repository `AaronAbuUsama/architect` (outward-facing; renaming it is Aaron's call, section 5);
//  - the local checkout path `projects/architect`, e.g. `~/projects/architect` (section 5).
export const selfPath = "e2e/m0/names.test.ts";
const allowedForms: ReadonlyArray<RegExp> = [/AaronAbuUsama\/architect(?![\w-])/g, /projects\/architect(?![\w-])/g];

export const isRecord = (path: string): boolean => path === selfPath || records.some((r) => (r.endsWith("/") ? path.startsWith(r) : path === r));

/** The patterns, most specific first: a piece of text is reported once, under the first rule that claims it. */
export const rules: ReadonlyArray<{ readonly name: string; readonly pattern: RegExp }> = [
  { name: "@architect/ package", pattern: /@architect\//g },
  { name: "ARCHITECT_ variable", pattern: /\bARCHITECT_[A-Z0-9_]*/g },
  { name: ".architect folder", pattern: /(?<!\w)\.architect(?![\w-])/g },
  { name: "architect.config file", pattern: /\barchitect\.config\b/gi },
  { name: "architect- name (container, folder, command)", pattern: /\barchitect-[\w-]*/gi },
  { name: "Architect product name", pattern: /\b(?:Architect|ARCHITECT)\b/g },
  { name: "architect command or leftover name", pattern: /\barchitect\b/g },
];

export interface Hit {
  readonly rule: string;
  readonly text: string;
  readonly column: number;
}

/** Every old name in one line of text (or one path). The allowed exact forms are blanked out first. */
export const findHits = (line: string): ReadonlyArray<Hit> => {
  const blanked = allowedForms.reduce((text, form) => text.replace(form, (m) => " ".repeat(m.length)), line);
  const claimed: Array<readonly [number, number]> = [];
  const hits: Hit[] = [];
  for (const { name, pattern } of rules) {
    for (const match of blanked.matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      if (claimed.some(([s, e]) => start < e && end > s)) continue;
      claimed.push([start, end]);
      hits.push({ rule: name, text: match[0], column: start + 1 });
    }
  }
  return hits.sort((a, b) => a.column - b.column);
};

const trackedFiles = (): ReadonlyArray<string> =>
  execFileSync("git", ["ls-files", "-z"], { cwd: repo, maxBuffer: 1 << 28 })
    .toString("utf8")
    .split("\0")
    .filter((p) => p !== "");

const isText = (bytes: Buffer): boolean => !bytes.subarray(0, 8000).includes(0);

/** One "path:line:column  [rule]  text" entry per hit; a path with an old name in it is reported as "path (file name)". */
export const scan = (): ReadonlyArray<string> => {
  const found: string[] = [];
  for (const path of trackedFiles()) {
    if (isRecord(path)) continue;
    for (const hit of findHits(path)) found.push(`${path} (file name)  [${hit.rule}]  ${hit.text}`);
    const full = join(repo, path);
    const stat = lstatSync(full, { throwIfNoEntry: false });
    if (stat === undefined || !stat.isFile()) continue;
    const bytes = readFileSync(full);
    if (!isText(bytes)) continue;
    bytes
      .toString("utf8")
      .split("\n")
      .forEach((line, index) => {
        for (const hit of findHits(line)) found.push(`${path}:${index + 1}:${hit.column}  [${hit.rule}]  ${hit.text}`);
      });
  }
  return found;
};

const rulesHit = (text: string) => findHits(text).map((h) => h.rule);

describe("the matcher catches a planted old name", () => {
  it("@architect/ in an import", () => {
    expect(rulesHit('import { Blueprint } from "@architect/blueprint"')).toEqual(["@architect/ package"]);
  });
  it("an ARCHITECT_ variable", () => {
    expect(findHits("export ARCHITECT_LOGBOOK_URL=http://localhost").map((h) => h.text)).toEqual(["ARCHITECT_LOGBOOK_URL"]);
    expect(rulesHit("process.env.ARCHITECT_HOME")).toEqual(["ARCHITECT_ variable"]);
  });
  it("a .architect folder, as a path or a join segment", () => {
    expect(rulesHit("rm -rf .architect/runs")).toEqual([".architect folder"]);
    expect(rulesHit('join(root, ".architect", "worlds")')).toEqual([".architect folder"]);
    expect(rulesHit("ignore: .architect")).toEqual([".architect folder"]);
  });
  it("the architect command", () => {
    expect(rulesHit("$ architect check")).toEqual(["architect command or leftover name"]);
    expect(rulesHit("run `architect`")).toEqual(["architect command or leftover name"]);
  });
  it("architect.config and architect- prefixes", () => {
    expect(rulesHit('import config from "./architect.config.ts"')).toEqual(["architect.config file"]);
    expect(rulesHit("architect-model --help")).toEqual(["architect- name (container, folder, command)"]);
    expect(rulesHit('mkdtempSync(join(tmpdir(), "architect-gate1-"))')).toEqual(["architect- name (container, folder, command)"]);
  });
  it("Architect as a product name", () => {
    expect(rulesHit("Architect is a framework")).toEqual(["Architect product name"]);
    expect(rulesHit("# Architect")).toEqual(["Architect product name"]);
  });
  it("a file name with an old name in it", () => {
    expect(rulesHit("examples/acme/architect.config.ts")).toEqual(["architect.config file"]);
  });
  it("reports each piece once, with its column", () => {
    expect(findHits('x "@architect/a" y architect z')).toEqual([
      { rule: "@architect/ package", text: "@architect/", column: 4 },
      { rule: "architect command or leftover name", text: "architect", column: 20 },
    ]);
  });
});

describe("the matcher leaves the allowed forms and ordinary words alone", () => {
  it("the GitHub slug, in any URL", () => {
    expect(findHits("https://github.com/AaronAbuUsama/architect")).toEqual([]);
    expect(findHits("git@github.com:AaronAbuUsama/architect.git")).toEqual([]);
    expect(findHits("https://github.com/AaronAbuUsama/architect/pull/31")).toEqual([]);
  });
  it("the local checkout path", () => {
    expect(findHits("cd ~/projects/architect")).toEqual([]);
    expect(findHits("/Users/someone/projects/architect/.claude/worktrees/m0")).toEqual([]);
  });
  it("but not a longer name that merely starts with an allowed form", () => {
    expect(rulesHit("~/projects/architect-old")).toEqual(["architect- name (container, folder, command)"]);
    expect(rulesHit("AaronAbuUsama/architect-two")).toEqual(["architect- name (container, folder, command)"]);
  });
  it("architecture, architectural and the like", () => {
    expect(findHits("Architecture, architectural, architects, architecturally, ARCHITECTURE")).toEqual([]);
  });
  it("the new names", () => {
    expect(findHits('import { Blueprint } from "@formants/forman"; FORMAN_HOME; .forman/; forman.config.ts; forman-model')).toEqual([]);
  });
});

describe("the records", () => {
  it("are skipped by folder, by exact file, and nothing else", () => {
    expect(isRecord("design/history/handoff.md")).toBe(true);
    expect(isRecord("design/decisions/M0-packages.md")).toBe(true);
    expect(isRecord("design/decisions.md")).toBe(true);
    expect(isRecord("design/build-plan.md")).toBe(true);
    expect(isRecord("spikes/some-spike/README.md")).toBe(true);
    expect(isRecord("design/goals/01-the-whole-framework-locally.md")).toBe(true);
    expect(isRecord("design/goals/02-anything-else.md")).toBe(false);
    expect(isRecord("design/frame/questions.md")).toBe(true);
    expect(isRecord("design/frame/other.md")).toBe(false);
    expect(isRecord("design/milestones.md")).toBe(false);
    expect(isRecord("design/packages.md")).toBe(false);
    expect(isRecord("design/decisions-new.md")).toBe(false);
    expect(isRecord("examples/spikes/x.ts")).toBe(false);
    expect(isRecord("README.md")).toBe(false);
  });
});

describe("the repository (every git-tracked file outside the records)", () => {
  it("has no old name left", () => {
    const found = scan();
    const shown = 500;
    const list = found.slice(0, shown).join("\n  ");
    const more = found.length > shown ? `\n  ... and ${found.length - shown} more` : "";
    expect(found, `${found.length} old name(s) outside the records:\n  ${list}${more}\n`).toEqual([]);
  });
});
