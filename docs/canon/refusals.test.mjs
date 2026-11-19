import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { judgeRefusals, loadRefusals } from "./refusals.mjs";

// A fixture of the shape a generated errors.ts has (Plugged In's, on goal/stage-1).
const errorsTs = `export const refusals = {
  HandleTaken: { code: "HN-001", exit: 10, status: 422 },
  HandleNotClaimed: { code: "HN-900", exit: 11, status: 409 },
} as const;
`;

const withTree = (run) => {
  const repo = mkdtempSync(join(tmpdir(), "refusals-"));
  try {
    mkdirSync(join(repo, "examples/demo/generated/api/src"), { recursive: true });
    writeFileSync(join(repo, "examples/demo/generated/api/src/errors.ts"), errorsTs);
    run(repo);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
};

test("the tables are read from every examples/*/generated/**/errors.ts", () =>
  withTree((repo) => {
    const table = loadRefusals(repo);
    assert.deepEqual([...table.keys()], ["HandleTaken", "HandleNotClaimed"]);
    assert.equal(table.get("HandleNotClaimed")[0].exit, "11");
  }));

test("a quote that agrees passes; a wrong code or exit fails, naming the truth", () =>
  withTree((repo) => {
    const table = loadRefusals(repo);
    const ok = judgeRefusals("Errors HandleTaken HN-001 exit 10 · HandleNotClaimed: HN-900\nHandleTaken HN-001 ×31", table);
    assert.deepEqual(ok, { wrong: [], unverified: [] });
    const bad = judgeRefusals("fine\n(`HandleNotClaimed HN-900 exit 5`) and HandleNotClaimed HN-002 exit 11", table);
    assert.equal(bad.wrong.length, 2);
    assert.equal(bad.wrong[0].line, 2);
    assert.match(bad.wrong[0].truth, /HandleNotClaimed HN-900 exit 11/);
  }));

test("a name in no table is counted, never failed (the example may not be on this branch)", () => {
  const judged = judgeRefusals("LinkNotListed LN-900 exit 31", new Map());
  assert.deepEqual(judged, { wrong: [], unverified: ["LinkNotListed"] });
});

test("a tree with no examples has no tables", () => {
  const repo = mkdtempSync(join(tmpdir(), "refusals-"));
  try {
    assert.equal(loadRefusals(repo).size, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
