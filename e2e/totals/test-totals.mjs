// Run by `nx run e2e:test` (node --test). Not a vitest file: the tool's fixture tests are red on purpose.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { END, START, facts, markersIn, parseList, render, replaceBlock } from "./totals.mjs";

const here = dirname(fileURLToPath(import.meta.url));
// A copy of the fixture under this folder (so `vitest` and the fixture's imports resolve), thrown away afterwards.
const work = mkdtempSync(join(here, ".work-"));
cpSync(join(here, "fixture"), work, { recursive: true });
after(() => rmSync(work, { recursive: true, force: true }));

const tool = (...args) => spawnSync(process.execPath, [join(here, "totals.mjs"), "--root", work, ...args], { encoding: "utf8" });
const readme = (suite) => readFileSync(join(work, suite, "README.md"), "utf8");

test("--check fails on a block that was never written, and names the fix", () => {
  const out = tool("--check");
  assert.equal(out.status, 1);
  assert.match(out.stderr, /demo\/README\.md: the totals are out of date\. Run: pnpm nx run e2e:totals/);
  assert.match(out.stderr, /plain\/README\.md/);
  assert.match(readme("demo"), /old numbers that the tool replaces/, "--check writes nothing");
});

test("the tool counts tests per file and expected reds from the list, and keeps the prose around the block", () => {
  assert.equal(tool().status, 0);
  const demo = readme("demo");
  assert.match(demo, /^Some prose that is kept by hand\.$/m);
  assert.match(demo, /^More prose, also kept by hand\.$/m);
  assert.match(demo, /6 tests in all; 3 pass; 3 expected to fail, listed in `expected-failing\.txt`\. 1 listed line matches no test/);
  assert.match(demo, /\| `alpha\.test\.ts` \| 3 \| 2 \|/);
  assert.match(demo, /\| `beta\.test\.ts` \| 2 \| 1 \|/);
  assert.match(demo, /\| `gamma\.test\.ts` \| 1 \| 0 \|/);
  assert.match(readme("plain"), /2 tests in all; all pass\./);
  assert.doesNotMatch(readme("plain"), /Expected to fail/);
});

test("a second run changes nothing, and --check then passes", () => {
  const before = readme("demo");
  assert.equal(tool().status, 0);
  assert.equal(readme("demo"), before);
  assert.equal(tool("--check").status, 0);
});

test("a block edited by hand, or a test added, makes --check fail again", () => {
  writeFileSync(join(work, "demo/README.md"), readme("demo").replace("6 tests in all", "7 tests in all"));
  assert.equal(tool("--check").status, 1);
  assert.equal(tool().status, 0);
  writeFileSync(join(work, "plain/two.test.ts"), 'import { it } from "vitest";\nit("three", () => {});\n');
  const out = tool("--check");
  assert.equal(out.status, 1);
  assert.match(out.stderr, /plain\/README\.md/);
  assert.doesNotMatch(out.stderr, /demo\/README\.md/);
});

test("render and replaceBlock, without vitest", () => {
  const tests = [{ file: "s/a.test.ts", name: "x" }, { file: "s/a.test.ts", name: "y > z" }, { file: "s/b.test.ts", name: "w" }];
  const keys = parseList("# note\n\ns/a.test.ts > y > z\ns/a.test.ts > [file error]\n");
  const f = facts("s", tests, keys);
  assert.deepEqual(f.rows, [{ file: "a.test.ts", tests: 2, red: 1 }, { file: "b.test.ts", tests: 1, red: 0 }]);
  assert.equal(f.stale, 0, "a hook or file error key is not a test, so it is not stale");
  assert.match(render(f), /3 tests in all; 2 pass; 1 expected to fail/);
  assert.equal(replaceBlock(`a\n${START}\nold\n${END}\nb`, "NEW"), "a\nNEW\nb");
  assert.throws(() => replaceBlock(`${END}\n${START}`, "x"));
  assert.throws(() => replaceBlock("no markers", "x"));
});

test("a marker named in prose is not a marker: only one on a line of its own counts", () => {
  const readme = `Put \`${START}\` and \`${END}\` in your README.\n\n${START}\nold\n${END}\n`;
  assert.equal(markersIn(readme, START).length, 1);
  assert.equal(replaceBlock(readme, `${START}\nnew\n${END}`), `Put \`${START}\` and \`${END}\` in your README.\n\n${START}\nnew\n${END}\n`);
  assert.equal(markersIn(`only \`${START}\` in prose`, START).length, 0);
});
