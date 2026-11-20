import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compare, fileKey, ok, outcomes, parseFolder, parseList, type Report } from "./ratchet.ts";

const root = "/work/e2e";
const test = (ancestorTitles: ReadonlyArray<string>, title: string, status: string) => ({ ancestorTitles, title, status });
const report = (...files: Array<{ name: string; status: string; assertionResults?: ReturnType<typeof test>[] }>): Report => ({
  testResults: files.map((file) => ({ assertionResults: [], ...file })),
});

const base = report(
  { name: "/work/e2e/m1/01-a.test.ts", status: "failed", assertionResults: [test(["mounting"], "mounts", "passed"), test(["mounting"], "wires", "failed")] },
  { name: "/work/e2e/m1/02-b.test.ts", status: "failed" },
);

describe("keys", () => {
  it("are file > describe > test, relative to the e2e folder, with a file-level failure keyed by the file", () => {
    expect([...outcomes(base, root)]).toEqual([
      ["m1/01-a.test.ts > mounting > mounts", "passed"],
      ["m1/01-a.test.ts > mounting > wires", "failed"],
      ["m1/02-b.test.ts", "failed"],
    ]);
  });
  it("do not depend on the machine's prefix or on separators", () => {
    expect(fileKey("C:\\ci\\e2e\\m1\\x.test.ts", "C:\\ci\\e2e")).toBe("m1/x.test.ts");
  });
  it("count a hook failure with no failing test as the file failing", () => {
    const hook = report({ name: "/work/e2e/m1/03.test.ts", status: "failed", assertionResults: [test([], "t", "skipped")] });
    expect(outcomes(hook, root).get("m1/03.test.ts")).toBe("failed");
  });
});

describe("hook and suite errors", () => {
  const listed = ["m1/16-v.test.ts > a > listed test"];
  const hooked = (suiteErrors: NonNullable<Report["suiteErrors"]>): Report => ({
    testResults: [{ name: "/work/e2e/m1/16-v.test.ts", status: "failed", assertionResults: [test(["a"], "listed test", "failed")] }],
    suiteErrors,
  });
  it("fails when an afterAll throws in a file that has a listed failing test", () => {
    const verdict = compare(hooked([{ name: "/work/e2e/m1/16-v.test.ts", path: ["a"] }]), listed, root);
    expect(ok(verdict)).toBe(false);
    expect(verdict.unexpected).toEqual(["m1/16-v.test.ts > a > [suite error]"]);
  });
  it("fails when a file-level hook throws in a file that has a listed failing test", () => {
    expect(compare(hooked([{ name: "/work/e2e/m1/16-v.test.ts", path: [] }]), listed, root).unexpected).toEqual(["m1/16-v.test.ts > [file error]"]);
  });
  it("passes when that exact suite error is itself listed", () => {
    const verdict = compare(hooked([{ name: "/work/e2e/m1/16-v.test.ts", path: ["a"] }]), [...listed, "m1/16-v.test.ts > a > [suite error]"], root);
    expect(ok(verdict)).toBe(true);
  });
  it("fails when a listed failing test's own afterEach also throws", () => {
    const verdict = compare(hooked([{ name: "/work/e2e/m1/16-v.test.ts", path: ["a", "listed test"], label: "[afterEach error]" }]), listed, root);
    expect(ok(verdict)).toBe(false);
    expect(verdict.unexpected).toEqual(["m1/16-v.test.ts > a > listed test > [afterEach error]"]);
  });
  it("fails when a listed failing test's beforeEach throws, and passes once that exact key is listed", () => {
    const planted = hooked([{ name: "/work/e2e/m1/16-v.test.ts", path: ["a", "listed test"], label: "[beforeEach error]" }]);
    expect(compare(planted, listed, root).unexpected).toEqual(["m1/16-v.test.ts > a > listed test > [beforeEach error]"]);
    expect(ok(compare(planted, [...listed, "m1/16-v.test.ts > a > listed test > [beforeEach error]"], root))).toBe(true);
  });
  it("fails on an unhandled error outside any file", () => {
    expect(ok(compare({ testResults: base.testResults, unhandled: ["boom"] }, ["m1/01-a.test.ts > mounting > wires", "m1/02-b.test.ts"], root))).toBe(false);
  });
  it("does not also key the file when a suite error already explains its failure", () => {
    const only: Report = { testResults: [{ name: "/work/e2e/m1/17.test.ts", status: "failed", assertionResults: [test(["e"], "t", "skipped")] }], suiteErrors: [{ name: "/work/e2e/m1/17.test.ts", path: ["e"] }] };
    expect(compare(only, [], root).unexpected).toEqual(["m1/17.test.ts > e > [suite error]"]);
  });
});

describe("parseList", () => {
  it("drops comments and blank lines", () => {
    expect(parseList("# header\n\nm1/a.test.ts > t\n  m1/b.test.ts  \n")).toEqual(["m1/a.test.ts > t", "m1/b.test.ts"]);
  });
});

describe("parseFolder", () => {
  it("reads every file's entries, and names an entry filed under another check's name", () => {
    const files = [
      { name: "01-a.txt", text: "# why\nm1/01-a.test.ts > t\nm1/01-a.test.ts\n" },
      { name: "02-b.txt", text: "m1/02-b.test.ts > u\nm1/01-a.test.ts > misplaced\n" },
    ];
    const folder = parseFolder(files);
    expect(folder.keys).toEqual(["m1/01-a.test.ts > t", "m1/01-a.test.ts", "m1/02-b.test.ts > u", "m1/01-a.test.ts > misplaced"]);
    expect(folder.misfiled).toEqual(["02-b.txt: m1/01-a.test.ts > misplaced"]);
    expect(parseFolder([]).keys).toEqual([]);
  });
});

describe("compare", () => {
  const list = ["m1/01-a.test.ts > mounting > wires", "m1/02-b.test.ts"];
  it("passes when the failing set equals the list", () => {
    const verdict = compare(base, list, root);
    expect(ok(verdict)).toBe(true);
    expect(verdict).toMatchObject({ unexpected: [], nowPassing: [], missing: [], failing: 2 });
  });
  it("fails on a failing test that is not on the list, and names it", () => {
    const planted = report(
      { name: "/work/e2e/m1/01-a.test.ts", status: "failed", assertionResults: [test(["mounting"], "mounts", "failed"), test(["mounting"], "wires", "failed")] },
      { name: "/work/e2e/m1/02-b.test.ts", status: "failed" },
    );
    const verdict = compare(planted, list, root);
    expect(ok(verdict)).toBe(false);
    expect(verdict.unexpected).toEqual(["m1/01-a.test.ts > mounting > mounts"]);
  });
  it("fails on a file that stopped loading when it is not on the list", () => {
    const planted = report({ name: "/work/e2e/m1/04-c.test.ts", status: "failed" });
    expect(compare(planted, [], root).unexpected).toEqual(["m1/04-c.test.ts"]);
  });
  it("reports a listed test that passes now, without failing", () => {
    const fixed = report(
      { name: "/work/e2e/m1/01-a.test.ts", status: "passed", assertionResults: [test(["mounting"], "mounts", "passed"), test(["mounting"], "wires", "passed")] },
      { name: "/work/e2e/m1/02-b.test.ts", status: "failed" },
    );
    const verdict = compare(fixed, list, root);
    expect(ok(verdict)).toBe(true);
    expect(verdict.nowPassing).toEqual(["m1/01-a.test.ts > mounting > wires"]);
  });
  it("reports a listed entry that is gone from the report, without failing", () => {
    const gone = report({ name: "/work/e2e/m1/01-a.test.ts", status: "passed", assertionResults: [test(["mounting"], "mounts", "passed")] });
    const verdict = compare(gone, list, root);
    expect(ok(verdict)).toBe(true);
    expect(verdict.missing).toEqual(list);
  });
  it("treats a listed test that was skipped as not run, not as passing", () => {
    const skipped = report({ name: "/work/e2e/m1/01-a.test.ts", status: "passed", assertionResults: [test(["mounting"], "wires", "skipped")] });
    expect(compare(skipped, ["m1/01-a.test.ts > mounting > wires"], root).notRun).toEqual(["m1/01-a.test.ts > mounting > wires"]);
  });
});

describe("check.ts with a missing expected-failing folder (git drops an emptied one)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ratchet-"));
  const run = (status: string) => {
    const reportPath = join(dir, `${status}.json`);
    writeFileSync(reportPath, JSON.stringify({ testResults: [{ name: join(dir, "m1/01-a.test.ts"), status, assertionResults: [{ ancestorTitles: [], title: "t", status }] }] }));
    return spawnSync("node", [join(import.meta.dirname, "check.ts"), reportPath, join(dir, "absent")], { encoding: "utf8" });
  };
  it("exits 0 when every test passes", () => { expect(run("passed").status).toBe(0); });
  it("still exits 1 when a test fails and nothing is listed", () => { expect(run("failed").status).toBe(1); });
});
