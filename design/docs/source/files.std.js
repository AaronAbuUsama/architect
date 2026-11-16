/* ===== The standard library: framework files, shown as Architect itself ===== */
const STD = [
{ p: "architect/packages/std/src/wallets/signer.ts", k: "framework", n: "The signer primitive, and the kits that implement it. Each wraps a package that already exists; the contract checks every one of them the same way.", c:
`import { Blueprint } from "@architect/blueprint"

// The primitive: given typed data, return a signature and the address that made it.
export interface Signer {
  readonly address: Effect.Effect<Address>
  readonly signTypedData: (data: TypedData) => Effect.Effect<Signature, SignerRefused | SignerUnavailable>
}

// The kits. Each one is a dependency wrapped once, here, for everyone.
export const localKey = Blueprint.kit.signer({ package: "viem/accounts", from: "a key in an encrypted keystore" })
export const browserWallet = Blueprint.kit.signer({ package: "viem", from: "any EIP-1193 wallet in the browser" })
export const embedded = Blueprint.kit.signer({ package: "@openfort/openfort-js", from: "an embedded wallet held for the person" })   // later
export const smartAccount = Blueprint.kit.signer({ from: "an ERC-4337 smart account (kits later: Safe, with our own core)" })   // later
export const delegated = Blueprint.kit.signer({ package: "viem/experimental/eip7702", from: "a plain wallet delegated to smart-account code (EIP-7702)" })   // same address, batching and sponsored gas
export const testKeys = Blueprint.kit.signer({ from: "a fresh key per test person, per world" })

// Linking: a person proves an address is theirs. Better Auth's Sign-In with Ethereum plugin.
export const signInWithEthereum = Blueprint.kit.link({ package: "better-auth/plugins/siwe" })` },
{ p: "architect/packages/std/src/chain/viem.ts", k: "framework", n: "A dependency, declared once by the standard library: viem, a TypeScript library that isn't Effect. Projects use the chain kit and never wrap viem themselves.", c:
`import { Blueprint } from "@architect/blueprint"

export default Blueprint.dependency({
  package: "viem",
  version: "2.21.0",
  calls: {
    write: { errors: ["ChainUnavailable", "ChainRejected"], step: "chain" },
    waitForReceipt: { errors: ["ChainUnavailable", "ChainTimeout"], step: "wait" },
    read: { errors: ["ChainUnavailable"], step: "chain" },
  },
  errors: { exit: 60 },                        // ChainUnavailable 60, ChainRejected 61, ChainTimeout 62
})

// The one hand-written part: what each of viem's failures means.
export const errorOf = (e: unknown) =>
  e instanceof TimeoutError ? ChainTimeout() :
  e instanceof BaseError && e.walk((x) => x instanceof ContractFunctionRevertedError) ? ChainRejected({ reason: e.shortMessage }) :
  ChainUnavailable({ reason: String(e) })` },
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
