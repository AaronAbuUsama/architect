import { defineAction, defineActionErrors, fail } from "@agent-native/core/action";
import { Effect } from "effect";
import { options } from "../src/generated/proposal-vote.ts";
import { host } from "../app/actions/_host.ts";
import { SoldOut, worker } from "../src/stand-in.ts";

/** A write that reached the Worker (a real outbound POST) and then failed in the way the name says. */
const afterWorkerWrite = (thrower: () => unknown | Promise<unknown>) => async () => {
  worker.mode = "ok";
  await fetch(`${worker.baseUrl}/ping`, { method: "POST", body: "{}" });
  return thrower();
};
class DuckError extends Error {
  statusCode = 422; errorCode = "SoldOut"; details = { remaining: 0 };
  constructor() { super("Sold out: 0 places left"); }
}
const errors = defineActionErrors("SoldOut");

export const probeThrowers: Record<string, () => unknown> = {
  "a-plain-error": afterWorkerWrite(() => { throw new Error("boom: postgres://user:hunter2@db/prod"); }),
  "b-fiber-failure": afterWorkerWrite(() => Effect.runPromise(Effect.fail(new SoldOut({ code: "PR-001", remaining: 0 })))),
  "c-duck-422": afterWorkerWrite(() => { throw new DuckError(); }),
  "d1-fail": afterWorkerWrite(() => fail("Sold out", { errorCode: "SoldOut", statusCode: 422, details: { remaining: 0 } })),
  "d2-noWrite": afterWorkerWrite(() => errors.noWrite("Sold out", "SoldOut", { statusCode: 422, details: { remaining: 0 } })),
  "g-noWrite-before-any-write": () => errors.noWrite("Sold out", "SoldOut", { statusCode: 422 }),
  "h-plain-before-any-write": () => { throw new Error("boom before any write"); },
};

/** Every probe twice: retrySafe false and true. All writes, no approval (so the run is reached). */
export const buildProbes = () => {
  const out: Record<string, any> = {};
  for (const [label, run] of Object.entries(probeThrowers)) {
    for (const retrySafe of [false, true]) {
      out[`${label}-rs${retrySafe ? 1 : 0}`] = defineAction({ description: label, readOnly: false, retrySafe, run: run as any });
    }
  }
  // The generated module's own path: SDK -> Worker (real fetch) -> refusal/defect -> runForAction.
  for (const retrySafe of [false, true]) {
    out[`e-generated-refusal-rs${retrySafe ? 1 : 0}`] = defineAction({ ...options(host), needsApproval: false, retrySafe });
  }
  return out;
};
