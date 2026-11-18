// Steps several Gate 2 checks take the same way: build a revision, promote it, add the list read.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";
import type { Stack } from "./services.ts";
import { type Said, install, run, sha256 } from "./support.ts";

/** `ortho build`: `built <revision> sha256:<hash>`, the bundle kept at `.ortho/artefacts/<revision>/main.js` (D3 #6, #14). */
export const build = (root: string, stack: Stack, rev: string) => {
  const built = run(root, stack.env, "build");
  expect(built.status, built.out.slice(-3000)).toBe(0);
  const match = /^built (\S+) sha256:([0-9a-f]{64})$/m.exec(built.stdout);
  expect(match, built.out).not.toBeNull();
  expect(match![1]).toBe(rev);
  const kept = join(root, ".ortho/artefacts", rev, "main.js");
  expect(existsSync(kept), kept).toBe(true);
  expect(sha256(kept)).toBe(match![2]);
  return { rev, hash: match![2]! };
};

/** `ortho prove --env test`: the passing `main`-ref verdicts a revision needs before it can reach staging (D3). */
export const proveInTest = (root: string, stack: Stack) => {
  const proved = run(root, stack.env, "prove", "--env", "test");
  expect(proved.status, proved.out.slice(-3000)).toBe(0);
  return proved;
};

export const promote = (root: string, stack: Stack, to: "staging" | "production"): Said => run(root, stack.env, "promote", "--to", to);

/** A first release: test proves the revision, staging takes it, production takes what staging proved. */
export const release = (root: string, stack: Stack, rev: string) => {
  stack.up("test");
  stack.up("staging");
  stack.up("production");
  proveInTest(root, stack);
  const staging = promote(root, stack, "staging");
  expect(staging.status, staging.out.slice(-3000)).toBe(0);
  const production = promote(root, stack, "production");
  expect(production.status, production.out.slice(-3000)).toBe(0);
  return { staging, production, rev };
};

/** The docs' step 10: `ortho add read allowance.list`, then the user writes list.ts; the journey for it; generate. */
export const addList = (root: string, stack: Stack) => {
  const added = run(root, stack.env, "add", "read", "allowance.list");
  expect(added.status, added.out).toBe(0);
  install(root, "list-read/list.ts", "blueprint/things/allowance/verbs/list.ts");
  install(root, "list-read/an-owner-lists-allowances.ts", "journeys/an-owner-lists-allowances.ts");
  const generated = run(root, stack.env, "generate");
  expect(generated.status, generated.out.slice(-3000)).toBe(0);
  expect(existsSync(join(root, "generated/cli/src/allowance/list.ts")), "the generated CLI gains allowance list").toBe(true);
};
