// Check 23 (HAN-11): a send whose transaction is never included is a typed failure on a real Anvil, not a defect. The unit
// side (every shape of stream `track` can give, and the declaration of the two errors) is
// `packages/wallets/src/modules/submit/unconfirmed.test.ts`, which also records the names and fields this check expects:
// `SendNotIncluded` (exit 64) and `SendNotConfirmed` (exit 65; `blocks`, `depth`).
//
// The scenario is a real replacement, with no clock and no mock of the chain: Anvil's automine is off, the wallet sends, its
// transaction is in the mempool, this file drops it (`anvil_dropTransaction`) and sends another transaction from the same
// account at the same nonce (a different value, so it is not the same call), then mines one block. The nonce is consumed
// and the wallet's transaction can never be included. Today the wallet ends that as a defect (`Effect.die`, flow.ts); it
// must end it as `SendNotIncluded`, which a caller catches by tag.
//
// The included-but-shallow case is not run here: on a real chain it takes the tracker's whole budget (`receiptTimeoutMs`,
// 120 s, not a setting the wallet exposes), so it is held by the unit check's stream shapes and `track`'s own tests.
//
// The surfaces: the SDK's error channel is read here (the failure's `_tag`, in the failure channel and not a defect). The CLI's
// exit code and its `[code] Name { ... }` line, and the span's `refusal`/`refusal.code` in place of `defect`, are generated
// for every declared error from the declaration (K16's one refusals table, the handler wrapper): check 22 holds that for
// declared errors in general, so this check holds the declaration reaches the operation (`verbs/send.ts`).
// Anvil is a process of this test's scope (`Anvil.start`); a missing `anvil` fails the check closed.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Cause, Effect, Exit, Redacted } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { repo } from "./support.ts";

const load = async <A>(path: string): Promise<A> => (await import(/* @vite-ignore */ join(repo, path))) as A;
type Run<A = unknown> = Effect.Effect<A, any, never>;
interface Funded { readonly address: string; readonly privateKey: Redacted.Redacted<string> }
interface RunningChain { readonly rpcUrl: string; readonly chainId: number; readonly pid: number; readonly accounts: ReadonlyArray<Funded> }
const { Anvil } = await load<{ Anvil: { start: (options: { chainId: number; accounts: number }) => Run<RunningChain> } }>("packages/chain-evm/src/main.ts");
const { DeviceWorld, TimersLive } = await load<{ DeviceWorld: any; TimersLive: any }>("packages/language-effect/src/device.ts");
const { Account } = await load<{ Account: { format: (account: { chainId: number; address: string }) => string } }>("packages/wallets/src/modules/account/service.ts");
const { Operations } = await load<{ Operations: { on: (signer: unknown) => { send: (p: { signer: string; label: string; to: string; value: bigint }) => Run; import: (p: { signer: string; label: string; source: string }) => Run } } }>("packages/wallets/src/modules/operations/service.ts");
const { WorldHost } = await load<{ WorldHost: { signer: unknown } }>("packages/wallets/src/modules/world/service.ts");

const folders: Array<string> = [];
const pids: Array<number> = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
  for (const pid of pids.splice(0)) expect((() => { try { process.kill(pid, 0); return true; } catch { return false; } })(), `anvil ${pid} is still running after its scope closed`).toBe(false);
});

const rpc = async (url: string, method: string, params: ReadonlyArray<unknown> = []) => {
  const answer = (await (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) })).json()) as { result?: unknown; error?: { message: string } };
  if (answer.error !== undefined) throw new Error(`${method}: ${answer.error.message}`);
  return answer.result;
};
const sleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

describe("23 a send that is never included is a typed failure (HAN-11)", () => {
  it("declares SendNotIncluded and SendNotConfirmed on the send operation", () => {
    const send = readFileSync(join(repo, "packages/wallets/blueprint/things/wallet/verbs/send.ts"), "utf8");
    expect(send, "verbs/send.ts does not list SendNotIncluded in errors").toContain("SendNotIncluded");
    expect(send, "verbs/send.ts does not list SendNotConfirmed in errors").toContain("SendNotConfirmed");
  });

  it("a transaction replaced at its nonce fails the send as SendNotIncluded, in the failure channel, not as a defect", { timeout: 120_000 }, async () => {
    const ran = spawnSync("anvil", ["--version"], { encoding: "utf8", timeout: 30_000 });
    expect(ran.status, "anvil (Foundry) is not on the path: this check starts it as a process and fails closed without it").toBe(0);
    const exit = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const chain = yield* Anvil.start({ chainId: 31_337, accounts: 2 });
      pids.push(chain.pid);
      yield* Effect.promise(() => rpc(chain.rpcUrl, "evm_setAutomine", [false]));
      const directory = mkdtempSync(join(tmpdir(), "ortho-han11-"));
      folders.push(directory);
      const kept = new Map<string, unknown>();
      const world = {
        chain: { rpcUrl: chain.rpcUrl, chainId: chain.chainId, keys: { world: chain.accounts[0]!.privateKey } }, directory,
        remember: <A>(key: string, make: () => A) => { if (!kept.has(key)) kept.set(key, make()); return kept.get(key) as A; },
      };
      const controller = new AbortController();
      yield* Effect.addFinalizer(() => Effect.sync(() => controller.abort()));
      const ops = Operations.on(WorldHost.signer);
      const inWorld = <A, E>(effect: Effect.Effect<A, E, any>) => effect.pipe(Effect.provideService(DeviceWorld, world), Effect.provide(TimersLive)) as Effect.Effect<A, E, never>;
      yield* inWorld(ops.import({ signer: "world", label: "funded", source: Redacted.value(chain.accounts[0]!.privateKey) }));
      const payee = Account.format({ chainId: chain.chainId, address: chain.accounts[1]!.address });
      const sending = Effect.runPromiseExit(inWorld(ops.send({ signer: "world", label: "funded", to: payee, value: 1_000n })), { signal: controller.signal });
      // Wait, by the surface and not the clock, for the wallet's transaction to be in the mempool; then replace it.
      const hash = yield* Effect.promise(async () => {
        const end = Date.now() + 15_000;
        while (Date.now() < end) {
          const content = (await rpc(chain.rpcUrl, "txpool_content")) as { pending: Record<string, Record<string, { hash: string }>> };
          const found = Object.values(content.pending).flatMap((byNonce) => Object.values(byNonce))[0]?.hash;
          if (found !== undefined) return found;
          await sleep(25);
        }
        return undefined;
      });
      expect(hash, "the send's transaction never reached the mempool").toBeDefined();
      yield* Effect.promise(async () => {
        await rpc(chain.rpcUrl, "anvil_dropTransaction", [hash]);
        await rpc(chain.rpcUrl, "anvil_impersonateAccount", [chain.accounts[0]!.address]);
        await rpc(chain.rpcUrl, "eth_sendTransaction", [{ from: chain.accounts[0]!.address, to: chain.accounts[1]!.address, value: "0x7", nonce: "0x0", gas: "0x5208" }]);
        await rpc(chain.rpcUrl, "evm_mine");
      });
      return yield* Effect.promise(() => sending);
    })).pipe(Effect.provide(TimersLive)) as Effect.Effect<Exit.Exit<unknown, unknown>>);
    expect(Exit.isFailure(exit), "the send was answered although its transaction was replaced").toBe(true);
    if (!Exit.isFailure(exit)) return;
    expect(Cause.hasDies(exit.cause), `the send ended as a defect, not a declared failure: ${Cause.pretty(exit.cause).split("\n")[0]}`).toBe(false);
    expect(Cause.squash(exit.cause)).toMatchObject({ _tag: "SendNotIncluded" });
  });
});
