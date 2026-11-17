// L2.10b: what the snapshot says about each operation in each environment, over a logbook in memory. The same rules
// against the real logbook and real signed verdicts are logbook.test.ts.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { fakeLogbook } from "#modules/reader/testing.js";
import { acmeModel, blueprintOf, withBudget } from "#modules/wire/testing.js";
import type { ModelWire } from "#modules/wire/types.js";
import { Snapshot } from "./service.ts";
import type { PortalProof, PortalSnapshot } from "./types.ts";

const model = acmeModel();
const ops = Object.keys(model.operations);
const blueprint = blueprintOf(model);

/** A logbook with a revision `r1` proven in test, staging and production, as `release` does. */
const proven = (revision = "r1", m: ModelWire = model, environments = ["test", "staging", "production"]) => {
  const book = fakeLogbook();
  book.keep(revision, m);
  for (const environment of environments) for (const operation of Object.keys(m.operations)) book.post({ revision, environment, operation, verdict: "pass" });
  return book;
};

const take = (book: ReturnType<typeof fakeLogbook> | null, bundle: string | null = "r1") =>
  Effect.runPromise(Snapshot.take({ blueprint, reader: book, bundleRevision: bundle }));
const proof = (s: PortalSnapshot, operation: string, environment: string): PortalProof => {
  const found = s.proofs.find((p) => p.operation === operation && p.environment === environment);
  expect(found, `${operation} in ${environment}`).toBeDefined();
  return found!;
};
const states = (s: PortalSnapshot, operation: string) => Object.fromEntries(s.environments.map((e) => [e, proof(s, operation, e).state]));

describe("the snapshot", () => {
  it("has a proof for every current operation in every declared environment, and says which blueprint it is for", async () => {
    const s = await take(proven());
    expect(s).toMatchObject({ schemaVersion: 1, blueprintDigest: blueprint.digest, consistency: "checked", bundleRevision: "r1" });
    expect(s.environments).toEqual(["test", "staging", "production"]);
    expect(s.proofs.length).toBe(ops.length * 3);
    expect(s.observedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
  });

  it("shows a recorded pass, with the exact row it rests on, and never says a journey ran in production", async () => {
    const p = proof(await take(proven()), "allowance.spend", "staging");
    expect(p).toMatchObject({ state: "recorded-pass", execution: "unknown", changedDependencies: [], candidateNotRerun: false });
    expect(p.evidence).toMatchObject({ state: "available", value: { revision: "r1", environment: "staging", operation: "allowance.spend", verdict: "pass", ref: "refs/heads/main" } });
    expect(p.evals).toEqual({ state: "unavailable", reason: "the logbook stores aggregate verdicts only" });
  });

  it("makes an unproven operation unproven, not green, and not unavailable", async () => {
    const s = await take(proven("r1", model, ["test"]));
    expect(states(s, "allowance.spend")).toEqual({ test: "recorded-pass", staging: "unproven", production: "unproven" });
  });

  it("a budget edit makes spend stale in the environments that proved it, and only spend", async () => {
    const book = proven();
    const looser = withBudget(model, "allowance.spend", 120);
    book.keep("r2", looser);
    for (const operation of ops) book.post({ revision: "r2", environment: "test", operation, verdict: "pass" });
    const s = await Effect.runPromise(Snapshot.take({ blueprint, reader: book, bundleRevision: "r1" }));
    expect(s.candidate).toEqual({ revision: "r2", source: "logbook" });
    expect(states(s, "allowance.spend")).toEqual({ test: "recorded-pass", staging: "stale", production: "stale" });
    expect(proof(s, "allowance.spend", "staging").changedDependencies).toEqual([
      { key: "operation:allowance.spend", was: model.operations["allowance.spend"]!.hash, now: looser.operations["allowance.spend"]!.hash },
    ]);
    for (const other of ops.filter((o) => o !== "allowance.spend")) {
      expect(states(s, other), other).toEqual({ test: "recorded-pass", staging: "recorded-pass", production: "recorded-pass" });
    }
    // The contract of every other operation is unchanged, but the candidate was not run against them in staging.
    expect(proof(s, "allowance.grant", "staging").candidateNotRerun).toBe(true);
    expect(proof(s, "allowance.grant", "test").candidateNotRerun).toBe(false);
  });

  it("the latest failure wins over an older pass", async () => {
    const book = proven();
    book.post({ revision: "r1", environment: "staging", operation: "allowance.spend", verdict: "fail" });
    const s = await take(book);
    expect(states(s, "allowance.spend")).toEqual({ test: "recorded-pass", staging: "failed", production: "recorded-pass" });
    expect(proof(s, "allowance.spend", "staging").evidence).toMatchObject({ value: { verdict: "fail" } });
    // And a later pass replaces the failure.
    book.post({ revision: "r1", environment: "staging", operation: "allowance.spend", verdict: "pass" });
    expect(states(await take(book), "allowance.spend").staging).toBe("recorded-pass");
  });

  it("asks only for the main ref, so a pull request's verdict never fills the matrix", async () => {
    const book = proven("r1", model, ["test"]);
    book.post({ revision: "r1", environment: "staging", operation: "allowance.spend", verdict: "pass", ref: "refs/pull/7/merge" });
    const s = await take(book);
    expect(book.asked.every((ref) => ref === "refs/heads/main")).toBe(true);
    expect(states(s, "allowance.spend").staging).toBe("unproven");
  });

  it("a logbook that is down shows nothing green: every proof is unavailable, with the reason", async () => {
    const book = proven();
    book.down = true;
    const s = await take(book);
    expect(s.consistency).toBe("unavailable");
    expect(s.proofs.every((p) => p.state === "unavailable")).toBe(true);
    expect(s.proofs[0]!.evidence).toMatchObject({ state: "unavailable", reason: expect.stringContaining("did not answer") });
    expect(s.release).toMatchObject({ state: "unavailable" });
  });

  it("no logbook configured is the same: unavailable, not unproven", async () => {
    const s = await take(null);
    expect(s.proofs.every((p) => p.state === "unavailable")).toBe(true);
    expect(s.proofs[0]!.evidence).toMatchObject({ state: "unavailable", reason: expect.stringContaining("no logbook") });
  });

  it("a verdict whose revision has no model is unavailable, not a pass", async () => {
    const book = proven();
    book.post({ revision: "ghost", environment: "staging", operation: "allowance.spend", verdict: "pass" });
    const s = await take(book);
    expect(states(s, "allowance.spend")).toEqual({ test: "recorded-pass", staging: "unavailable", production: "recorded-pass" });
    expect(proof(s, "allowance.spend", "staging").reason).toContain("ghost");
  });

  it("a model of a shape it does not know is unavailable too", async () => {
    const book = proven();
    book.keep("odd", { operations: 3 });
    book.post({ revision: "odd", environment: "staging", operation: "allowance.spend", verdict: "pass" });
    expect(proof(await take(book), "allowance.spend", "staging").state).toBe("unavailable");
  });

  it("an operation the proved model did not have is unavailable, not a pass", async () => {
    const book = proven();
    const { ["allowance.get"]: _gone, ...fewer } = model.operations;
    book.keep("fewer", { ...model, operations: fewer });
    book.post({ revision: "fewer", environment: "staging", operation: "allowance.get", verdict: "pass" });
    expect(proof(await take(book), "allowance.get", "staging").state).toBe("unavailable");
  });

  it("the head's model missing falls back to this bundle's model, and says so", async () => {
    const book = fakeLogbook();
    book.post({ revision: "nomodel", environment: "test", operation: "allowance.spend", verdict: "pass" });
    const s = await take(book, "r1");
    expect(s.candidate).toEqual({ revision: "r1", source: "bundle" });
    expect(proof(s, "allowance.spend", "test").state).toBe("unavailable");
  });

  it("a ledger that moved while it was read is read again, and only then trusted", async () => {
    const book = proven();
    book.onRead = (n) => { if (n === 1) book.post({ revision: "r1", environment: "staging", operation: "allowance.spend", verdict: "fail" }); };
    const s = await take(book);
    expect(s.consistency).toBe("checked");
    expect(states(s, "allowance.spend").staging).toBe("failed");
  });

  it("a ledger that never holds still shows nothing green", async () => {
    const book = proven();
    book.onRead = () => void book.post({ revision: "r1", environment: "test", operation: "allowance.get", verdict: "pass" });
    const s = await take(book);
    expect(s.consistency).toBe("unavailable");
    expect(s.proofs.every((p) => p.state === "unavailable")).toBe(true);
  });
});
