/* ===== The standard library: framework files, shown as Architect itself ===== */
const STD = [
{ p: "architect/packages/std/src/modules/wallets/types.ts", k: "framework", n: "The signer primitive. Its declaration and Worker-safe interfaces are separate from the Node keystore entry. D4 defines the kit boundary; the wallet implementation is L3.02.", c:
`// A person signs in the CLI/prove process; the server gets no person's key.
export interface Signer {
  readonly address: Effect.Effect<Address>
  readonly signMessage: (message: string) => Effect.Effect<Signature, SignerRefused | SignerUnavailable>
  readonly signTypedData: (data: TypedData) => Effect.Effect<Signature, SignerRefused | SignerUnavailable>
}

// Blueprint.kit(Wallets, choices) selects the finished package.
// Its declaration entry imports neither its Worker nor its Node runtime.
// The Node entry owns encrypted local keystores and fresh world test signers.
// Delegation and transaction signing follow the wallet/chain service contract.

// Wallet linking preserves the existing Better Auth person and session.
// Better Auth's SIWE sign-in plugin alone does not do that: it signs into
// the wallet user's account. WalletLinks instead verifies an exact session-bound
// SIWE challenge, consumes it atomically in D1, and stores only a public link.` },
{ p: "architect/packages/std/src/modules/chain/internal/viem.ts", k: "framework", n: "The chain kit owns viem's explicit typed Effect boundary. A project uses that kit rather than importing viem. These are the D4/L3.04 adapter contracts, not a completed implementation.", c:
`import { Blueprint } from "@architect/blueprint"
import { writeEffect } from "./rpc.ts"
import { ChainUnavailable, ChainRejected } from "../types.ts"

export const write = Blueprint.dependency({
  package: "viem",
  version: "2.57.15",               // Published 3 November; eligible on 17 November.
  mode: "effect",
  call: writeEffect,
  errors: [ChainUnavailable, ChainRejected],
  step: "chain",
  failure: (failure) => failure,
})

// The adapter owns actual cancellation, transport retries and bounded polling.
// Every wait uses Timers. No autonomous viem watcher or hidden retry loop.
// Keep substantial MIT adaptation notices from the pinned PRB reference.` },
{ p: "architect/packages/std/src/chain/relayer.ts", k: "framework", n: "The relayer: submits a signed payload and pays its gas. Without the person's signature it can do nothing.", c:
`// The relayer's key is a gas wallet. The contract never trusts it: every write checks a person's signature.
export const relay = Effect.fn("chain.relay")(function* (contract, fn, args) {
  const chain = yield* Chain
  const hash = yield* chain.write({ account: chain.relayer, address: contract.address, abi: contract.abi, functionName: fn, args })
  return { hash, receipt: chain.waitForReceipt(hash) }
})` },
{ p: "architect/packages/std/src/chain/follower.ts", k: "framework", n: "The chain follower: one Durable Object per contract. It catches whatever didn't come through our own receipts. The ideas are from effective-indexer (MIT), rebuilt in our shape.", c:
`// Each thing writes its own receipts through to its organisation's index. The follower catches the rest:
// anything that reached the contract some other way. One Durable Object per contract address.
export class Follower extends DurableObject {
  // Woken by its alarm, never a loop. In a stepped world the world's Timers fires it.
  async alarm() { return run(this, follow) }
}

const follow = Effect.fn("chain.follow")(function* () {
  const state = yield* FollowerState                        // the object's own SQLite: checkpoint and recent hashes
  const chain = yield* Chain
  const head = yield* chain.blockNumber
  const safe = head - CONFIRMATIONS                         // never read the newest blocks as final
  const recent = yield* state.recentHashes                  // a short ring of block hashes already read
  const fork = yield* chain.firstMismatch(recent)           // a reorganisation replaced some of them
  if (fork) yield* correct(fork)                            // tell each thing which events no longer happened
  for (const range of chunks(yield* state.checkpoint, safe, { size: 2_000, shrinkOnError: true })) {
    const logs = yield* chain.getLogs({ address: CONTRACT, events: DECLARED_EVENTS, ...range })
    for (const log of logs) yield* deliver(decode(log))     // decoded with the generated schemas, sent to its thing
    yield* state.advance(range.to, logs)                    // checkpoint and hashes, in one write
  }
  yield* Timers.at(Clock.now.plus(POLL), "follower", "follow")   // set its next alarm
})` },
{ p: "architect/packages/std/src/chain/simulate.ts", k: "framework", n: "Simulation as a primitive: run a write without sending it, and get its typed refusal first. The relayer simulates before it spends gas.", c:
`export class Simulator extends Context.Service<Simulator, {
  readonly simulate: (call: SignedCall) => Effect.Effect<Simulated, ContractRefusal | ChainUnavailable>
}>()("@architect/std/chain/Simulator") {}

// Free, through the node: eth_simulateV1 where the node supports it, eth_call otherwise.
export const node = Layer.effect(Simulator, /* ... */)
// Free, exact, with traces: a forked local Anvil, run as a bench.
export const fork = Layer.effect(Simulator, /* ... */)
// Opt-in, paid: Tenderly, for its dashboards.
export const tenderly = Layer.effect(Simulator, /* ... */)

// A refusal comes back decoded, exactly as the contract would send it: AllowanceExceeded with what's left.` },
{ p: "architect/packages/std/README.md", k: "framework", n: "", c:
`# @architect/std

The standard library: kits for things every project reaches for, each wrapping packages that already exist.

auth      Better Auth: sessions, organisations, API keys, device login, OAuth for MCP, Sign-In with Ethereum
          (layer one has it built in; layer three makes it this kit)
wallets   the signer primitive: local key, browser wallet, test keys, EIP-7702 delegation;
          embedded wallets and smart accounts later
chain     viem wrapped once, the only real dependency; contract services, transaction tracking, typed chain errors
          and typed-data signing adapted from @prb/effect-evm; the relayer; simulation (the node's eth_call and
          eth_simulateV1, a forked Anvil, Tenderly opt-in); the chain follower; local Anvil benches
erc20     a token's interface, balances and transfers (later)
safe      Safe smart accounts (later): Safe's own ABI events and our own small core (address prediction,
          transaction hashing, execution encoding, multisend); Safe's Protocol Kit only in conformance tests;
          Safe's LGPL contracts used as published` },
];
