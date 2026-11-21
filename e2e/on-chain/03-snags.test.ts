// Goal 4's done check, fourth line (`design/goals/04-on-chain.md`, "The done check": every snag in `04-snags.md` is fixed, or parked with an
// owner and a reason). Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. In `design/goals/04-snags.md`, every `## S-nn` entry has exactly one `- Status:` line, and it is
// - `fixed`, naming the change (a pull request `#n` or a commit hash); or
// - `parked`, naming an owner (`Owner: <who>`) and giving a reason of at least four words.
// `open` and `building` fail, each named with its snag. S-01 to S-11 must all still be in the log: an entry deleted is not a fixed one.
// The failure lists every problem, so a lead sees what is left at a glance.
//
// THE CONTROLS plant each wrong reading against `snagProblems`: a fixed snag with no change, a parked one with no owner or no reason, an empty
// owner, a status line missing or doubled, an unknown word, an entry deleted, a duplicate, and an open snag whose body says "fixed" elsewhere.
import { describe, expect, it } from "vitest";
import { FIRST_SNAGS, readSnagLog, snagProblems } from "./support.ts";

const entry = (n: number, status: string | undefined) => `## S-${String(n).padStart(2, "0")} · "a snag"\n- Hit: someone.\n- Fix: framework, fixed in the end.\n${status === undefined ? "" : `- Status: ${status}\n`}\n`;
const log = (statuses: ReadonlyArray<string | undefined>) => `# Goal 4: the snag log\n\nStatus is one of open.\n\n${statuses.map((s, i) => entry(i + 1, s)).join("")}`;
const all = (status: string | undefined) => Array.from({ length: FIRST_SNAGS }, () => status);
const FIXED = "fixed (#321)";
const PARKED = "parked (the lead, 21 November 2026): nothing builds it this goal. Owner: later.md (chain follower). Revisit at M6.20.";

describe("controls: snagProblems judges each wrong reading", () => {
  it("accepts a log of fixed and parked snags", () => {
    expect(snagProblems(log(all(FIXED)))).toEqual([]);
    expect(snagProblems(log(all(PARKED)))).toEqual([]);
    expect(snagProblems(log([...all(FIXED).slice(1), "fixed (commit 1a2b3c4d)"]))).toEqual([]);
  });
  it("names an open and a building snag", () => {
    expect(snagProblems(log(["open", ...all(FIXED).slice(1)]))).toEqual(['S-01 ("a snag") is open']);
    expect(snagProblems(log(["Open", ...all(FIXED).slice(1)]))).toHaveLength(1);
    expect(snagProblems(log(["building (#400)", ...all(FIXED).slice(1)]))).toEqual(['S-01 ("a snag") is building']);
  });
  it("refuses a fixed snag that names no change", () => {
    expect(snagProblems(log(["fixed", ...all(FIXED).slice(1)]))).toHaveLength(1);
    expect(snagProblems(log(["fixed (done in slice 3)", ...all(FIXED).slice(1)]))).toHaveLength(1);
  });
  it("refuses a parked snag with no owner, an empty owner, or no reason", () => {
    expect(snagProblems(log(["parked (the lead): nothing builds it this goal.", ...all(PARKED).slice(1)]))).toHaveLength(1);
    expect(snagProblems(log(["parked (the lead): nothing builds it this goal. Owner:", ...all(PARKED).slice(1)]))).toHaveLength(1);
    expect(snagProblems(log(["parked. Owner: later.md", ...all(PARKED).slice(1)]))).toHaveLength(1);
    expect(snagProblems(log(["parked (the lead): too small. Owner: later.md", ...all(PARKED).slice(1)]))).toHaveLength(1);
    expect(snagProblems(log(["parked", ...all(PARKED).slice(1)]))).toHaveLength(2);
  });
  it("refuses a status line missing, doubled, or in an unknown word", () => {
    expect(snagProblems(log([undefined, ...all(FIXED).slice(1)]))).toEqual(['S-01 ("a snag") has no `- Status:` line']);
    expect(snagProblems(log(all(FIXED)).replace("- Status: fixed (#321)\n", "- Status: fixed (#321)\n- Status: fixed (#322)\n"))).toHaveLength(1);
    expect(snagProblems(log(["done (#321)", ...all(FIXED).slice(1)]))).toHaveLength(1);
    expect(snagProblems(log(["", ...all(FIXED).slice(1)]))).toHaveLength(1);
  });
  it("refuses a log with an entry deleted or repeated, or with none", () => {
    expect(snagProblems(log(all(FIXED).slice(1)))).toEqual(["S-11 is missing from the log (an entry is never deleted)"]);
    expect(snagProblems(log(all(FIXED)).replace("## S-02", "## S-01"))).not.toEqual([]);
    expect(snagProblems("")).toHaveLength(FIRST_SNAGS);
  });
  it("reads only the Status line: `fixed` or `parked` elsewhere in an entry changes nothing", () => {
    expect(snagProblems(log(["open", ...all(FIXED).slice(1)]))).toHaveLength(1); // entry() writes "fixed in the end" in Fix
  });
});

describe("the snag log of Goal 4", () => {
  it("every snag in design/goals/04-snags.md is fixed, or parked with an owner and a reason", () => {
    const text = readSnagLog();
    expect(text, "design/goals/04-snags.md is missing").not.toBe("");
    const problems = snagProblems(text);
    expect(problems, `${problems.length} snag(s) still stand in the way:\n${problems.join("\n")}`).toEqual([]);
  });
});
