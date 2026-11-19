// Sketches only: views for things the model doesn't carry yet. Each spec is hand-written here and says what it waits
// on; when the slice lands, the same view reads the model instead and this file goes.
import type { GraphSpec } from "../graph/types.ts";

/**
 * A workflow (M3.01 decides `Blueprint.workflow`: activities, `await` on an event, durable clocks). Shape taken from
 * stage 3's signature collection (ST3.02): propose, wait for owners' signatures or a clock, then execute or expire.
 */
export const workflowSketch = (): GraphSpec => ({
  id: "sketch-workflow", direction: "RIGHT",
  nodes: [
    { id: "w:start", kind: "start", label: "spend.propose" },
    { id: "w:propose", kind: "activity", label: "record the proposal", sub: "activity · keyed by run id" },
    { id: "w:await", kind: "wait", label: "await SignatureAdded", sub: "until the threshold is met" },
    { id: "w:clock", kind: "wait", label: "clock · 48 h", sub: "durable: survives eviction" },
    { id: "w:execute", kind: "activity", label: "execute on chain", sub: "activity · chain-evm" },
    { id: "w:expire", kind: "activity", label: "expire the proposal", sub: "activity · emits SpendExpired" },
  ],
  edges: [
    { id: "w1", kind: "flow", from: "w:start", to: "w:propose" },
    { id: "w2", kind: "flow", from: "w:propose", to: "w:await" },
    { id: "w3", kind: "flow", from: "w:propose", to: "w:clock", label: "starts" },
    { id: "w4", kind: "flow", from: "w:await", to: "w:execute", label: "threshold met" },
    { id: "w5", kind: "flow", from: "w:clock", to: "w:expire", label: "fires first" },
  ],
});

/**
 * The chain view (K17: the target decides where an operation runs). Stage 2's payment, placed on its targets: the
 * device signs (`runs: "client"`, M1.27), the server relays, the chain settles, and the follower's event comes back.
 */
export const chainSketch = (): GraphSpec => ({
  id: "sketch-chain", direction: "RIGHT",
  nodes: [
    { id: "g:device", kind: "group", label: "device · browser", sub: "runs: client" },
    { id: "g:server", kind: "group", label: "server · worker", sub: "runs: server" },
    { id: "g:chain", kind: "group", label: "chain · evm (Anvil locally)", sub: "store on chain" },
    { id: "c:prepare", kind: "op", label: "payment.prepare", sub: "resolves @aaron to an address", parent: "g:server" },
    { id: "c:sign", kind: "op", label: "payment.sign", sub: "key stays on the device", parent: "g:device" },
    { id: "c:submit", kind: "op", label: "payment.submit", sub: "relayer", parent: "g:server" },
    { id: "c:transfer", kind: "op", label: "erc20.transfer", sub: "someone else's contract", parent: "g:chain" },
    { id: "c:confirmed", kind: "event", label: "PaymentConfirmed", parent: "g:server" },
  ],
  edges: [
    { id: "c1", kind: "flow", from: "c:prepare", to: "c:sign" },
    { id: "c2", kind: "flow", from: "c:sign", to: "c:submit" },
    { id: "c3", kind: "flow", from: "c:submit", to: "c:transfer", label: "simulated, submitted" },
    { id: "c4", kind: "flow", from: "c:transfer", to: "c:confirmed", label: "follower · confirmed" },
  ],
});
