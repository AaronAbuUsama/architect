import assert from "node:assert/strict";
import { test } from "node:test";
import { locate, regionsOf, repair, sliceLines } from "./quotes.mjs";

const source = [
  'import { Effect } from "effect";', // 1
  "", // 2
  "/** Adds two. */", // 3
  "export const add = (a: number, b: number) => {", // 4
  "  const sum = a + b;", // 5
  "  return sum;", // 6
  "};", // 7
  "", // 8
  "export interface Box {", // 9
  "  readonly size: number;", // 10
  "}", // 11
  "", // 12
  "export default Effect.succeed(1);", // 13
].join("\n");

const lines = (text) => text.split("\n").map((l) => l.trim());

test("a whole declaration is found, with or without its comment", () => {
  assert.deepEqual(regionsOf(source, "add"), [{ from: 3, to: 7, head: 4 }]);
  assert.deepEqual(locate(source, "add", lines(sliceLines(source, 3, 7))), { at: 3, to: 7 });
  assert.deepEqual(locate(source, "add", lines(sliceLines(source, 4, 7))), { at: 4, to: 7 });
});

test("a part of a declaration is found as a run of its lines, whatever its indent", () => {
  assert.deepEqual(locate(source, "add", ["const sum = a + b;", "return sum;"]), { at: 5, to: 6 });
});

test("a name-only declaration: default, imports, a range, the whole file", () => {
  assert.equal(regionsOf(source, "default")[0].from, 13);
  assert.equal(regionsOf(source, "imports")[0].to, 1);
  assert.deepEqual(regionsOf(source, "add,Box"), [{ from: 3, to: 11, head: 4 }]);
  assert.deepEqual(regionsOf(source, "file"), [{ from: 1, to: 13, head: 1 }]);
});

test("a drifted quote does not match, and a name that is not there says so", () => {
  const stale = ["const sum = a + b + 1;", "return sum;"];
  assert.equal(locate(source, "add", stale).at, undefined);
  assert.match(locate(source, "add", ["const sum = 1;"]).reason, /not in add/);
  assert.match(locate(source, "nope", ["x"]).reason, /no top-level declaration named nope/);
  // a line that exists in the file, but in another declaration, is not a quote of this one
  assert.equal(locate(source, "add", ["readonly size: number;"]).at, undefined);
});

test("--fix: a drifted whole quote is rewritten whole, from the source", () => {
  const stale = ["export const add = (a: number) => {", "const sum = a;", "return sum;", "};"];
  const fixed = repair(source, "add", stale);
  assert.deepEqual(fixed, { from: 4, to: 7 });
  assert.equal(sliceLines(source, fixed.from, fixed.to), "export const add = (a: number, b: number) => {\n  const sum = a + b;\n  return sum;\n};");
});

test("--fix: a drifted partial quote is re-located by best match; a quote that resembles nothing is reported", () => {
  assert.deepEqual(repair(source, "add", ["const sum = a * b;", "return sum;"]), { from: 5, to: 6 });
  assert.equal(repair(source, "add", ["something else entirely", "and more"]), undefined);
  assert.equal(repair(source, "nope", ["return sum;"]), undefined);
});

test("--fix: the rewritten quote then passes the check", () => {
  const fixed = repair(source, "Box", ["export interface Box {", "readonly size: string;", "}"]);
  assert.ok(fixed);
  assert.ok(locate(source, "Box", lines(sliceLines(source, fixed.from, fixed.to))).at !== undefined);
});

test("a part that occurs twice in its declaration is refused: it could be either place", () => {
  const twice = ["export const pair = () => {", "  const a = 1;", "  return a;", "  const b = 1;", "  return b;", "};"].join("\n");
  assert.match(locate(twice, "pair", ["const a = 1;"]).reason, /occurs 2 times/);
  assert.deepEqual(locate(twice, "pair", ["const a = 1;", "return a;"]), { at: 2, to: 3 });
});
