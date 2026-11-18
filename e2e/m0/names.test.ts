// Gate M0's name check: after each rename, the old names appear nowhere in the repository except the records, which say
// what happened in the words used then (design/decisions/M0-packages.md section 5; design/naming.md rule 6). M0 retired
// Architect (`@architect/`, the `architect` command, `ARCHITECT_*`, `.architect/`, `architect.config`, `architect-*`);
// the K6 sweep retired Forman (`@formants/*`, the `forman` command, `FORMAN_*`, `.forman/`, `/_forman/`,
// `forman.config`, `forman-*`). It scans every git-tracked file (so ignored and untracked files never count), and file
// names too.
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
  // Added by the K6 sweep: M0's own goal, the name search and the ledger (each a dated record of what the files said),
  // and the naming map, which has to spell every old name to map it.
  "design/goals/02-m0-land-and-rename.md",
  "design/naming-search.md",
  "design/naming.md",
  "design/ledger.md",
  "spikes/",
];

// The only exceptions beyond the records, each with its reason:
//  - this file: it has to spell every old name to look for it, and to plant them in its own tests;
//  - the GitHub repository `AaronAbuUsama/architect` (outward-facing; renaming it is Aaron's call, section 5);
//  - the local checkout path `projects/architect`, e.g. `~/projects/architect` (section 5);
//  - the lint rule against the old names, which spells them in pieces but must name them to map them;
//  - the file name of the dated record `design/decisions/K2-forman-frame.md`, wherever a living file links to it.
export const selfPath = "e2e/m0/names.test.ts";
const lintRule = "packages/lint/src/modules/rules/internal/old-names.ts";
const allowedForms: ReadonlyArray<RegExp> = [/AaronAbuUsama\/architect(?![\w-])/g, /projects\/architect(?![\w-])/g, /K2-forman-frame\.md/g];

export const isRecord = (path: string): boolean => path === selfPath || path === lintRule || records.some((r) => (r.endsWith("/") ? path.startsWith(r) : path === r));

/** The patterns, most specific first: a piece of text is reported once, under the first rule that claims it. */
export const rules: ReadonlyArray<{ readonly name: string; readonly pattern: RegExp }> = [
  { name: "@architect/ package", pattern: /@architect\//g },
  { name: "ARCHITECT_ variable", pattern: /\bARCHITECT_[A-Z0-9_]*/g },
  { name: ".architect folder", pattern: /(?<!\w)\.architect(?![\w-])/g },
  { name: "architect.config file", pattern: /\barchitect\.config\b/gi },
  { name: "architect- name (container, folder, command)", pattern: /\barchitect-[\w-]*/gi },
  { name: "Architect product name", pattern: /\b(?:Architect|ARCHITECT)\b/g },
  { name: "architect command or leftover name", pattern: /\barchitect\b/g },
  // Glued after "_" or a digit, where \b sees no word edge: `/_architect/bundle`, `v2architect`, `MY_ARCHITECT_HOME`, any case.
  { name: "architect glued after _ or a digit", pattern: /(?<=[_\d])architect(?![A-Za-z])/gi },
  { name: "@formants package", pattern: /@formants\b\/?/g },
  { name: "FORMAN_ variable", pattern: /(?<![A-Z])FORMAN_[A-Z0-9_]*/g },
  { name: ".forman folder", pattern: /(?<!\w)\.forman(?![\w-])/g },
  { name: "forman.config file", pattern: /(?<![a-z])forman\.config\b/gi },
  { name: "forman- name (container, Worker, audience)", pattern: /(?<![a-z])forman-[\w-]*/gi },
  { name: "Forman product name", pattern: /Forman|(?<![A-Z])FORMAN/g },
  // Lowercase anywhere a word doesn't continue into it: the command, `/_forman/`, `formanPackages`; never performance.
  { name: "forman command or leftover name", pattern: /(?<![a-z])forman/g },
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
  it("the old name glued after an underscore or a digit, in any case", () => {
    expect(rulesHit("/_architect/bundle")).toEqual(["architect glued after _ or a digit"]);
    expect(rulesHit("MY_ARCHITECT_HOME")).toEqual(["architect glued after _ or a digit"]);
    expect(rulesHit("v2architect")).toEqual(["architect glued after _ or a digit"]);
    expect(findHits("/_architect/bundle").map((h) => [h.text, h.column])).toEqual([["architect", 3]]);
  });
  it("reports each piece once, with its column", () => {
    expect(findHits('x "@architect/a" y architect z')).toEqual([
      { rule: "@architect/ package", text: "@architect/", column: 4 },
      { rule: "architect command or leftover name", text: "architect", column: 20 },
    ]);
  });
});

describe("the matcher catches the names K6 retired", () => {
  it("@formants, in an import or as the scope", () => {
    expect(rulesHit('import { Blueprint } from "@formants/forman"')).toEqual(["@formants package", "forman command or leftover name"]);
    expect(rulesHit("the npm org @formants")).toEqual(["@formants package"]);
  });
  it("FORMAN_ variables, .forman folders, /_forman/ and forman.config", () => {
    expect(rulesHit("process.env.FORMAN_LOGBOOK_URL")).toEqual(["FORMAN_ variable"]);
    expect(rulesHit('join(root, ".forman", "tap")')).toEqual([".forman folder"]);
    expect(rulesHit("/_forman/bundle")).toEqual(["forman command or leftover name"]);
    expect(rulesHit("examples/acme/forman.config.ts")).toEqual(["forman.config file"]);
  });
  it("the forman command, forman- names, the product name and camelCase", () => {
    expect(rulesHit("$ forman prove --env local")).toEqual(["forman command or leftover name"]);
    expect(rulesHit('aud: ["forman-logbook"]')).toEqual(["forman- name (container, Worker, audience)"]);
    expect(rulesHit("Forman is a framework")).toEqual(["Forman product name"]);
    expect(rulesHit("const formanPackages = publishForman()")).toEqual(["forman command or leftover name", "Forman product name"]);
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
  it("architecture glued after an underscore or a digit", () => {
    expect(findHits("/_architecture/bundle, my_architects, v2architectural, _Architecture")).toEqual([]);
  });
  it("the new names", () => {
    expect(findHits('import { Blueprint } from "orthograph"; @orthograph/cli; ORTHO_HOME; .ortho/; ortho.config.ts; ortho-model; Orthograph')).toEqual([]);
  });
  it("performance, conformance and the record K2-forman-frame.md", () => {
    expect(findHits("performance.now(), Conformance, PERFORMANCE, design/decisions/K2-forman-frame.md")).toEqual([]);
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
    expect(isRecord("design/naming.md")).toBe(true);
    expect(isRecord("packages/lint/src/modules/rules/internal/old-names.ts")).toBe(true);
    expect(isRecord("packages/lint/src/modules/rules/rules.test.ts")).toBe(false);
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
