// HAN-11 (design/ledger.md): a send that is included but never reaches its depth, or is never included, is a typed failure
// the caller can handle, not a defect. Red today: `follow` ends both as `Effect.die` (flow.ts), because `SendRefused` only
// declares `SimulationReverted` and `KeyLocked`.
//
// Decided here, for the builder (a builder never edits this file):
//  - `SendNotIncluded` (exit 64): the transaction was replaced or dropped, or its inclusion was voided by a reorg and it was
//    not in a block when the follow ended; or the follow's budget ran out (a `timeout` fault from `track`) with nothing
//    included. No fields.
//  - `SendNotConfirmed` (exit 65): the transaction is in a block (an inclusion standing) but fewer than `depth` blocks count
//    when the follow ended: the stream ended short of the depth, or its budget ran out (a `timeout` fault from `track`)
//    after an `Included`. Fields `blocks` (how many count) and `depth` (how many were asked), both `Blueprint.uint(64)`
//    (so bigint at runtime, like `nonce`). `follow` therefore has to keep what it saw when `track` fails with a timeout.
//    Exits 64 and 65 follow KeyLocked 61, NoSuchKey 62, SimulationReverted 63 and stay unique among the things (K16).
//  - Both are declared in `blueprint/things/wallet/errors.ts`, listed in `errors` of `verbs/send.ts`, and joined into
//    `SendRefused` (types.ts), so each surface sees them: the SDK's error channel (the tag), the CLI (`[code] Name { ... }`
//    and the exit, from K16's one refusals table, which is generated from that declaration) and the operation's span
//    (`refusal`, `refusal.code`, written by the handler wrapper for any declared error) in place of `defect`.
//  - A fault of `track` after a submission other than `timeout` (transport, configuration, nonce, ...) stays a defect, as it
//    is today: the chain could not be read, so nobody knows whether the send is in a block, and neither declared failure would
//    be true. Only a `timeout` is the follow's budget saying "not by now", and only that is a not-confirmed send.
//  - Left a defect on purpose, and kept by the controls below: `depthOf`'s missing depth (flow.ts:30: a configuration fault
//    of the deployment, nothing a caller can handle or retry; check 18 and submit.test.ts hold it) and `refused` of a
//    transport or timeout fault from prepare, simulate, sign or submit (the chain could not be used at all and nothing was
//    sent, so there is nothing for a caller to handle). Only a fault of `track` after a submission is a send that did not
//    confirm.
import { readFileSync } from "node:fs";
import { Cause, Effect, Exit, Stream } from "effect";
import { TimersLive } from "@orthograph/language-effect/device";
import type { Timers } from "@orthograph/language-effect";
import { ChainFault, type ChainPort, type TxState } from "@orthograph/chain-evm/device";
import { describe, expect, it } from "vitest";
import { depthOf, follow, refused } from "./internal/flow.ts";
import type { Sent } from "./types.ts";

const receipt = { status: "success" } as never;
const hash = "0x0000000000000000000000000000000000000000000000000000000000000001" as const;
const submission = { hash, from: "0x0000000000000000000000000000000000000001", nonce: 0, fromBlock: 0n } as const;
const timeout = new ChainFault({ kind: "timeout", message: "The EVM tracking deadline elapsed before observing the requested outcome" });

/** A port whose `track` gives the states in order, then fails with `then` when given. */
const tracked = (states: ReadonlyArray<TxState>, then?: ChainFault) =>
  ({ track: () => (then === undefined ? Stream.fromIterable(states) : Stream.concat(Stream.fromIterable(states), Stream.fail(then))) }) as unknown as ChainPort;
const followed = (port: ChainPort, depth: number) => Effect.runPromiseExit(follow(port, submission, depth).pipe(Effect.provide(TimersLive)) as Effect.Effect<Sent, unknown>);

/** The declared failure the exit carries, or what it was instead (a defect's first line, or a success). */
const failureOf = (exit: Exit.Exit<Sent, unknown>): { readonly _tag?: string } | string => {
  if (Exit.isSuccess(exit)) return `succeeded: ${exit.value.level}`;
  if (Cause.hasDies(exit.cause)) return `defect: ${Cause.pretty(exit.cause).split("\n")[0]}`;
  return Cause.squash(exit.cause) as { _tag?: string };
};
const here = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("HAN-11: a send that never reaches its depth is a typed failure, not a defect", () => {
  it("declares SendNotIncluded (exit 64) and SendNotConfirmed (exit 65, blocks and depth) and lists them on send and in SendRefused", () => {
    const errors = here("../../../blueprint/things/wallet/errors.ts");
    expect(errors, "errors.ts declares no SendNotIncluded").toMatch(/class SendNotIncluded extends Blueprint\.error\(\{\s*\}, \{ exit: 64 \}\)/);
    expect(errors, "errors.ts declares no SendNotConfirmed with blocks and depth, each Blueprint.uint(64)").toMatch(/class SendNotConfirmed extends Blueprint\.error\(\{[^}]*blocks:\s*Blueprint\.uint\(64\)[^}]*depth:\s*Blueprint\.uint\(64\)[^}]*\}, \{ exit: 65 \}\)/s);
    expect(here("../../../blueprint/things/wallet/verbs/send.ts"), "send.ts does not list them in errors").toMatch(/errors:\s*\[[^\]]*SendNotIncluded[^\]]*SendNotConfirmed|errors:\s*\[[^\]]*SendNotConfirmed[^\]]*SendNotIncluded/);
    expect(here("./types.ts"), "SendRefused does not include them").toMatch(/SendRefused\s*=[^;]*SendNotIncluded[^;]*SendNotConfirmed|SendRefused\s*=[^;]*SendNotConfirmed[^;]*SendNotIncluded/);
  });

  it("included, and the stream ends short of the depth: SendNotConfirmed with blocks and depth", async () => {
    const failure = failureOf(await followed(tracked([{ _tag: "Included", receipt }, { _tag: "Deepened", blocks: 1, receipt }]), 3));
    expect(failure, "the send must fail with a declared SendNotConfirmed").toMatchObject({ _tag: "SendNotConfirmed", blocks: 1n, depth: 3n });
  });

  it("included, then the follow's budget ran out (a timeout fault) short of the depth: SendNotConfirmed, not 'the chain could not be used'", async () => {
    const failure = failureOf(await followed(tracked([{ _tag: "Included", receipt }, { _tag: "Deepened", blocks: 2, receipt }], timeout), 3));
    expect(failure).toMatchObject({ _tag: "SendNotConfirmed", blocks: 2n, depth: 3n });
  });

  it("the budget ran out with nothing included: SendNotIncluded", async () => {
    expect(failureOf(await followed(tracked([], timeout), 3))).toMatchObject({ _tag: "SendNotIncluded" });
  });

  it("replaced or dropped: SendNotIncluded", async () => {
    expect(failureOf(await followed(tracked([{ _tag: "Dropped", hash, reason: "nonce-consumed" }]), 1))).toMatchObject({ _tag: "SendNotIncluded" });
  });

  it("included, then the inclusion voided by a reorg and nothing else included: SendNotIncluded", async () => {
    const failure = failureOf(await followed(tracked([{ _tag: "Included", receipt }, { _tag: "Dropped", hash, reason: "nonce-consumed" }]), 2));
    expect(failure).toMatchObject({ _tag: "SendNotIncluded" });
  });

  it("the caller handles each by its tag and carries on; neither is a defect", async () => {
    const handle = (states: ReadonlyArray<TxState>, then?: ChainFault) =>
      Effect.runPromise(
        (follow(tracked(states, then), submission, 3) as Effect.Effect<Sent, { readonly _tag: string }, Timers>).pipe(
          Effect.catchTag("SendNotConfirmed", () => Effect.succeed("not confirmed")),
          Effect.catchTag("SendNotIncluded", () => Effect.succeed("not included")),
        ).pipe(Effect.provide(TimersLive)),
      );
    expect(await handle([{ _tag: "Included", receipt }])).toBe("not confirmed");
    expect(await handle([{ _tag: "Dropped", hash, reason: "nonce-consumed" }])).toBe("not included");
  });

  it("control (passes today): a re-inclusion after a reorg still confirms: Included, Dropped, Included, Deepened to the depth", async () => {
    const exit = await followed(tracked([
      { _tag: "Included", receipt }, { _tag: "Dropped", hash, reason: "nonce-consumed" },
      { _tag: "Included", receipt }, { _tag: "Deepened", blocks: 3, receipt },
    ]), 3);
    expect(Exit.isSuccess(exit) && exit.value.level).toBe("confirmed");
  });

  it("control (passes today): a transport fault from track after a submission stays a defect, not a not-confirmed send", async () => {
    const exit = await followed(tracked([{ _tag: "Included", receipt }], new ChainFault({ kind: "transport", message: "EVM RPC request failed" })), 3);
    expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
  });

  it("control (passes today): a transport or timeout fault before a submission exists stays a defect, and so does a missing depth", async () => {
    const exit = await Effect.runPromiseExit(refused(timeout));
    expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
    const none = await Effect.runPromiseExit(depthOf({ chainId: 1, rpcUrl: "http://127.0.0.1:1", depth: undefined }));
    expect(Exit.isFailure(none) && Cause.hasDies(none.cause)).toBe(true);
  });
});
