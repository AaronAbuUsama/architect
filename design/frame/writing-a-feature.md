# Writing a feature: wallets, step by step

Everything here is **proposed**. It walks through writing one feature, `wallets`, from an empty folder to an app that
mounts it, using the words in [`README.md`](README.md). The package scope `@blueprint` is a placeholder: the npm scope
is still open (`decisions/K1-kits.md`, Q2).

**What wallets is.** Keys a person holds on their own device, and a link between one of those keys and their account,
proved by signing the server's challenge (Sign-In with Ethereum). The server never holds a key. Linking is the part
`spikes/authenticated-siwe-link/` proved for real (26 checks, workerd and D1, a concurrent replay and a restart).

**Five rules this walkthrough follows** (`decisions/K1-kits.md` section 3.6, carried into the frame):

1. A feature's operations use only the feature's own roles and the roles of the features it needs.
2. Agents never link a wallet: linking binds a key to an account.
3. `wallet.link` is a client operation over two server operations, `challenge` and `complete`.
4. Wallets needs auth, not chain. Sign-In with Ethereum needs a chain id, not a chain client.
5. Behaviour that runs on a device is written per host (`node`, `browser`, `world`), not per environment.

## Step 1: make the package

```bash
blueprint new feature wallets
```

It writes a feature with one placeholder operation, one journey and an example app, all of which pass `blueprint
prove` before you change anything. That proves the mechanism before you write any wallet.

```text
wallets/
  package.json
  feature.ts                     the descriptor: what it needs, offers and lets you choose
  blueprint/
    things/                      the feature's own things, as in any app
    exports/                     what it offers handlers in the apps that mount it
    choices.ts                   what an app may pick when it mounts it
    journeys/                    written by a different agent from the builder
    starting-worlds/             fragments an app's worlds can include
  src/                           behaviour: per thing, and per host where it runs on a device
  example/                       a tiny app that mounts this feature, so it is proved on its own
  README.md                      what it gives, its choices, what each projection gets
```

```jsonc
// wallets/package.json: one entry per host, as the kit-package-exports spike found
{
  "name": "@blueprint/wallets",
  "type": "module",
  "exports": {
    ".": "./dist/feature.js",              // the descriptor: pure, no runtime code
    "./blueprint": "./dist/blueprint.js",  // the declarations: pure, what the SDK and API import
    "./worker": "./dist/worker.js",        // server behaviour, for the worker host
    "./node": "./dist/node.js",            // device behaviour, for the CLI and Node SDK
    "./browser": "./dist/browser.js"       // device behaviour, for the browser SDK
  },
  "peerDependencies": { "@blueprint/blueprint": "1.0.0", "@blueprint/auth": "1.0.0" }
}
```

The spike showed this shape holds. The API and SDK bundles took only `dist/blueprint.js`. The Worker took no Node
entry. A client entry that crossed into `/node` was caught by a closure guard (`spikes/kit-package-exports/README.md`,
findings 3 to 5). Generated code imports a feature's `/blueprint` entry, plus the runtime entry for the host it runs
on, and nothing else.

## Step 2: declare

### Values and the thing

```ts
// wallets/blueprint/values/chain.ts
import { Blueprint } from "@blueprint/blueprint";

export const Address = Blueprint.value.hex({ bytes: 20, checksum: true, description: "An Ethereum account address." });
export const ChainId = Blueprint.value.int({ min: 1, description: "An EIP-155 chain id." });
export const Signature = Blueprint.value.hex({ bytes: 65, description: "An EIP-191 personal signature." });
```

```ts
// wallets/blueprint/things/wallet/thing.ts
import { Blueprint } from "@blueprint/blueprint";
import { Person } from "@blueprint/auth/blueprint";
import { Address, ChainId } from "../../values/chain.ts";

export const Wallet = Blueprint.thing({
  description: "A key on someone's device, linked to their account. The server holds the address, never the key.",
  fields: { id: Blueprint.id("wal"), person: Person.fields.id, address: Address, chain: ChainId },
  unique: [["address", "chain"]], // one account per address on a chain (spike finding 5)
});
```

```ts
// wallets/blueprint/things/challenge/thing.ts
export const Challenge = Blueprint.thing({
  description: "The exact ERC-4361 message the server asked one session to sign.",
  fields: {
    id: Blueprint.id("chl"), person: Person.fields.id, session: Session.fields.id,
    address: Address, chain: ChainId, message: Blueprint.value.text(), expires: Blueprint.value.instant(),
  },
});
```

The key itself is not a thing. It never reaches the server, so it is not state the server owns.

### Machines, events and errors

```ts
// wallets/blueprint/things/wallet/machine.ts
export const machine = Blueprint.machine(Wallet, {
  states: ["linked", "unlinked"],
  moves: {
    link: { from: [], to: "linked", emits: Events.WalletLinked },
    unlink: { from: ["linked"], to: "unlinked", emits: Events.WalletUnlinked },
  },
  notFrom: { exit: 40 }, // generates WalletNotLinked
});

// wallets/blueprint/things/challenge/machine.ts
export const machine = Blueprint.machine(Challenge, {
  states: ["issued", "used"],
  moves: {
    issue: { from: [], to: "issued", emits: Events.ChallengeIssued },
    use: { from: ["issued"], to: "used", emits: Events.ChallengeUsed }, // a second completion is ChallengeNotIssued
  },
  notFrom: { exit: 41 },
});
```

```ts
// wallets/blueprint/things/wallet/errors.ts
export class SignatureInvalid extends Blueprint.error("SignatureInvalid", { exit: 42, code: "WAL01" }) {}
export class AddressTaken extends Blueprint.error("AddressTaken", { exit: 43, code: "WAL02", fields: { chain: ChainId } }) {}
export class KeyLocked extends Blueprint.error("KeyLocked", { exit: 44, code: "WAL03" }) {}  // the device refused to sign
export class NoSuchKey extends Blueprint.error("NoSuchKey", { exit: 45, code: "WAL04" }) {}
// wallets/blueprint/things/challenge/errors.ts
export class ChallengeExpired extends Blueprint.error("ChallengeExpired", { exit: 46, code: "CHL01" }) {}
```

### Roles

```ts
// wallets/blueprint/things/wallet/roles.ts
import { Blueprint } from "@blueprint/blueprint";
import { signedIn } from "@blueprint/auth/blueprint";
import { Wallet } from "./thing.ts";

/** The person whose wallet it is. */
export const holder = Blueprint.role(Wallet, { rule: (wallet, principal) => wallet.person === principal.person });

/** Someone binding a key to their own account: a person, never an agent acting for them (rule 2). */
export const linker = signedIn.notVia("agent");
```

### Operations

There are eight. Three run on the device and touch only keys there. Four run on the server. One, `link`, runs on the
device and calls two of the server's.

| Operation | `runs` | `allowed` | What it does |
|---|---|---|---|
| `wallet.create` | client | `anyone` | make a key on this device, return its address |
| `wallet.import` | client | `anyone` | import a key onto this device |
| `wallet.keys` | client | `anyone` | list the addresses of keys on this device |
| `wallet.link` | client | `linker` | challenge, sign here, complete |
| `wallet.challenge` | server | `linker` | issue the exact message for this session to sign |
| `wallet.complete` | server | `linker` | verify, use the challenge, link the address |
| `wallet.unlink` | server | `holder.notVia("agent")` | unlink one of your wallets |
| `wallet.list` | server (read) | `signedIn` | your linked wallets, by any way in |

`anyone` is safe on the device operations because nothing leaves the device: the caller's own machine is the boundary.

```ts
// wallets/blueprint/things/wallet/verbs/link.ts: a client operation over two server operations
import { Blueprint } from "@blueprint/blueprint";
import { Wallet } from "../thing.ts";
import { linker } from "../roles.ts";
import { KeyLocked, NoSuchKey } from "../errors.ts";
import { Signer } from "../../../exports/signer.ts";
import { Address } from "../../../values/chain.ts";
import challenge from "./challenge.ts";
import complete from "./complete.ts";

export default Blueprint.operation(Wallet, {
  description: "Link a key on this device to your account, by signing the server's challenge.",
  runs: "client",
  payload: { address: Address },
  answer: { wallet: Wallet.fields.id },
  errors: [KeyLocked, NoSuchKey],               // plus whatever challenge and complete declare, carried through
  allowed: [linker],
  steps: {
    challenge: Blueprint.step.call(challenge),  // over the server's door, with the caller's own credential
    sign: Blueprint.step.use(Signer.sign),      // here, on the device
    complete: Blueprint.step.call(complete),
  },
  budget: { p95: "800 millis" },                // the signer's own wait (a person clicking) is a wait, not counted
});
```

```ts
// wallets/blueprint/things/wallet/verbs/complete.ts
export default Blueprint.operation(Wallet, {
  description: "Verify a signed challenge and link its address to the caller's account.",
  payload: { challenge: Challenge.fields.id, signature: Signature },
  answer: { wallet: Wallet.fields.id },
  move: machine.moves.link,
  errors: [SignatureInvalid, AddressTaken, ChallengeExpired],
  allowed: [linker],
  steps: { verify: Blueprint.step.compute(), claim: Blueprint.step.database(), link: Blueprint.step.database() },
  idempotent: "request",
});
```

`challenge`, `unlink`, `list`, `create`, `import` and `keys` have the same shape. A compiler check keeps rule 1 true:
`allowed` may name only `wallets`' own roles and the roles of what it needs (`auth`'s `signedIn`, `anyone`).

## Step 3: what it needs, offers and lets you choose

### Needs

```ts
// wallets/feature.ts: the descriptor, the package's root export
import { Blueprint } from "@blueprint/blueprint";
import auth from "@blueprint/auth";
import eip1193 from "@blueprint/eip1193";
import * as Choices from "./blueprint/choices.ts";
import * as Exports from "./blueprint/exports/index.ts";

export default Blueprint.feature({
  description: "Keys on a person's own device, linked to their account by Sign-In with Ethereum.",
  needs: [
    auth,                                                       // sessions, signedIn, the person
    Blueprint.need(eip1193, { when: Choices.browserSigner.injected }), // only if an app picks the injected browser signer
  ],
  choices: Choices,
  exports: Exports,
});
```

The browser's wallet extension (MetaMask and the like, spoken to through EIP-1193) is an outside system, so it is an
adapter. Wallets needs it but never contains it. The app mounts `eip1193` once, and anything else in the app that talks
to the extension shares that mount.

### Choices

```ts
// wallets/blueprint/choices.ts
import { Blueprint } from "@blueprint/blueprint";
import { ChainId } from "./values/chain.ts";

/** How a key is kept on a Node device (the CLI, a Node SDK). */
export const nodeSigner = Blueprint.choice({ keystore: "an encrypted keystore file in the user's config folder" });

/** How the browser signs. */
export const browserSigner = Blueprint.choice({ injected: "the extension the person already uses, through EIP-1193" });

/** Which chains a link is for: set per environment, since local is Anvil's 31337 and production is mainnet. */
export const chains = Blueprint.choice.list(ChainId, { min: 1 });
```

**The Node signer is an encrypted keystore file (Web3 Secret Storage v3), not the OS keychain.** The file format is
ours, so the same code runs on macOS, Linux and CI with no keychain daemon. The passphrase is typed by the person at a
prompt and is never a Blueprint secret: the description never holds anything a person keeps in their head. The keychain
could arrive later as a second choice backed by a `keychain` adapter, since the keychain is an outside system.

**Passkeys are not offered.** A passkey signs with P-256, so it needs a smart account checked with ERC-1271. The spike
proved only plain keys (EOAs). Each choice is something the feature has proved, so there are no others until they are
proved.

### Exports

```ts
// wallets/blueprint/exports/signer.ts: used inside the feature by link, and offered to the app's own client code
import { Blueprint } from "@blueprint/blueprint";
import { Address, Signature } from "../values/chain.ts";
import { KeyLocked, NoSuchKey } from "../things/wallet/errors.ts";
import { browserSigner, nodeSigner } from "../choices.ts";

export const Signer = Blueprint.export({
  description: "Sign a message with a key on this device.",
  runs: "client",
  methods: {
    sign: { payload: { address: Address, message: Blueprint.value.text() }, answer: { signature: Signature }, errors: [KeyLocked, NoSuchKey] },
  },
  hosts: { node: nodeSigner, browser: browserSigner, world: Blueprint.host.world }, // implementations found by path
});
```

```ts
// wallets/blueprint/exports/verify.ts: for the app's server handlers
export const Verify = Blueprint.export({
  description: "Check a message was signed by one of this person's linked wallets.",
  runs: "server",
  methods: { linked: { payload: { person: Person.fields.id, message: Blueprint.value.text(), signature: Signature }, answer: { address: Address } } },
  errors: [SignatureInvalid, WalletNotLinked],
});
```

An app's handler that needs "this person approved it with their wallet" declares `Blueprint.step.use(Verify.linked)`
and gets a span and the two declared errors for free.

### Secrets: none

Wallets declares no secret. The challenge is stored with the session (the spike's design), so the server never signs
anything and needs no key of its own. Nonces are random and live in D1. Sessions belong to `auth`, which declares
`AUTH_SECRET` itself. A feature declares only the secrets it reads, in its own `blueprint/secrets.ts`
([`secrets.md`](secrets.md)). Wallets has no such file.

## Step 4: until there are no blanks, then scaffold

```bash
blueprint check --ready
```

```text
✘ blueprint/things/wallet/verbs/unlink.ts:9   a blank: Blueprint.todo("who may unlink: the holder only, or an org admin too?")
✘ blueprint/exports/signer.ts                 hosts.browser: no implementation at src/exports/signer/browser-injected.ts
2 to go. Nothing is scaffolded until a declaration has none.
```

Each blank is a question (it shows in the portal's plan). Once it is answered:

```bash
blueprint check --ready     # exit 0
blueprint generate          # scaffolds each handler once, with its brief; never overwrites one
```

```text
src/
  wallet/challenge.ts  wallet/complete.ts  wallet/unlink.ts      worker host
  wallet/create.ts  wallet/import.ts  wallet/keys.ts             client: shared logic over Keystore
  wallet/link.ts                                                 client: the three steps in order
  exports/signer/node-keystore.ts  browser-injected.ts  world.ts one per host and choice
  exports/verify.ts
```

Three of them filled:

```ts
// wallets/src/wallet/complete.ts. Scaffolded from blueprint/things/wallet/verbs/complete.ts. Yours from now on.
import { Effect } from "effect";
import { verifyMessage } from "viem";
import type { Handler } from "../../generated/api/src/wallet/complete.handler.ts";
import { Records } from "@blueprint/target-effect";
import { Challenge } from "../../blueprint/things/challenge/thing.ts";
import { Wallet } from "../../blueprint/things/wallet/thing.ts";
import { SignatureInvalid, AddressTaken } from "../../blueprint/things/wallet/errors.ts";
import { ChallengeExpired } from "../../blueprint/things/challenge/errors.ts";

const complete: Handler = ({ challenge, signature }, { steps, move, principal, now }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.claim(records.claim(Challenge, challenge, { person: principal.person, session: principal.session }));
    if (found.expires <= now) return yield* new ChallengeExpired();
    const ok = yield* steps.verify(Effect.promise(() => verifyMessage({ address: found.address, message: found.message, signature })));
    if (!ok) return yield* new SignatureInvalid();
    const linked = yield* steps.link(records.insertUnique(Wallet, { person: principal.person, address: found.address, chain: found.chain }));
    if (linked.taken) return yield* new AddressTaken({ chain: found.chain });
    yield* move("linked");
    return { wallet: linked.id };
  });

export default complete;
```

`records.claim` is the spike's conditional update: one completion wins and a concurrent second gets nothing. The
challenge's `use` move is made by the claim in the same batch.

```ts
// wallets/src/wallet/link.ts. Scaffolded from blueprint/things/wallet/verbs/link.ts. Yours from now on.
const link: Handler = ({ address }, { steps }) =>
  Effect.gen(function* () {
    const issued = yield* steps.challenge({ address });
    const { signature } = yield* steps.sign({ address, message: issued.message });
    return yield* steps.complete({ challenge: issued.challenge, signature });
  });
```

The handler is three lines because the steps carry the work. Each `steps.*` is a span. The two `call` steps go to
the server with the caller's own credential, so the server checks `linker` again. A client operation cannot widen what
the server allows.

```ts
// wallets/src/exports/signer/world.ts: test keys, for prove's worlds
import { Effect } from "effect";
import { privateKeyToAccount } from "viem/accounts";
import { CastKeys } from "@blueprint/prove/world";

/** Each cast member has a key made from the world's seed and their name: the same in every run of that world. */
export default Signer.implement(({ address, message }) =>
  Effect.gen(function* () {
    const key = yield* CastKeys.forAddress(address);
    return { signature: yield* Effect.promise(() => privateKeyToAccount(key).signMessage({ message })) };
  }));
```

## Step 5: journeys, written by a different agent

The ✍️ author reads the declarations and writes the journeys before the 🔨 builder starts. The journeys fail on the
empty scaffolds (`blueprint prove --unbuilt` exits 0 only if every failure is an unwritten handler). The builder's
brief forbids `blueprint/journeys/`.

```ts
// wallets/blueprint/journeys/create-and-link.ts
export default Blueprint.journey("make a key and link it", {
  cast: { olga: signedIn },
  starts: worlds.signedIn,
  steps: (s) => [
    s.step("olga makes a key on her device", s.olga.run(create, {}), expect((a) => a.address).toMatch(/^0x/)),
    s.step("and links it", s.olga.run(link, { address: s.last.address }),
      emits(WalletLinked, { address: s.last.address }), spans({ present: ["wallet.link.challenge", "wallet.link.sign", "wallet.link.complete"] })),
    s.step("it is listed", s.olga.run(list, {}), expect((a) => a.wallets).toHaveLength(1)),
  ],
});
```

```ts
// wallets/blueprint/journeys/an-agent-cannot-link.ts
export default Blueprint.journey("an agent cannot link a wallet", {
  cast: { olga: signedIn },
  starts: worlds.linked,
  steps: (s) => [
    s.step("olga's agent asks for a challenge", s.olga.via("agent").run(challenge, { address: s.world.address }), refuses(NotAllowed), noEvents()),
    s.step("olga's agent has no such tools", s.olga.via("agent").tools(), lacks(challenge, complete, link, unlink)),
    s.step("but it can list her wallets", s.olga.via("agent").run(list, {}), expect((a) => a.wallets).toHaveLength(1)),
  ],
});
```

A third journey, `an-address-links-once`, covers the spike's replay and `AddressTaken`. A fourth, `unlink-then-link`,
covers unlinking and linking again.

**One journey, every projection.** A journey names operations, never a surface. `blueprint prove` replays it through
each projection that can reach each step ([`projections.md`](projections.md)):

| Step | http | sdk (node) | sdk (browser) | cli | mcp |
|---|---|---|---|---|---|
| `create`, `link` (client) | · | ✔ local code, world signer | ✔ in the feature's CI only | ✔ the built binary | · |
| `challenge` (agent refused) | ✔ refusal | ✔ refusal | | ✔ refusal | ✔ absent from the catalogue |
| `list` | ✔ | ✔ | | ✔ | ✔ |

**The starting-world fragment.** A feature can't know an app's worlds, so it brings fragments the app's worlds include:

```ts
// wallets/blueprint/starting-worlds/linked.ts
export default Blueprint.world.fragment("every cast person has one linked wallet", {
  after: auth.worlds.signedIn,
  run: (w) => w.cast.map((person) => [person.run(create, {}), person.run(link, { address: w.last.address })]),
});
```

## Step 6: the example app proves the feature on its own

```text
wallets/example/blueprint/
  features/auth.ts           Blueprint.use(auth, …)
  features/wallets.ts        Blueprint.use(wallets, (w) => [w.signer.node.keystore, w.signer.browser.injected])
  adapters/eip1193.ts        Blueprint.use(eip1193, {})
  projections/server.ts  sdk.ts  cli.ts  mcp.ts  browser.ts
  environments/local.ts      wallets.choose(chains, [31337])
```

```bash
cd example && blueprint prove --env local
```

```text
journeys   wallets 4 · auth 5
through    http ✔  sdk(node) ✔  cli ✔  mcp ✔  browser ✔
wallet.complete   9 evals ✔
wallet.link       9 evals ✔   (sdk, cli, browser)
eip1193           conformance ✔   stand-in: Anvil 1.4.0's JSON-RPC as the provider
```

**The browser.** The `browser` projection replays the client steps in a real headless Chromium (Playwright). The
`eip1193` adapter's stand-in is a real provider, Anvil's JSON-RPC with its unlocked test accounts, so a real
`personal_sign` happens. It is not a fake. This runs in the feature's own CI, not in every app that mounts it.
Whether that gives enough confidence about real extensions is an open risk.

## Step 7: release

```bash
blueprint version      # compares this model with the last published one
```

```text
@blueprint/wallets 1.0.0 → 1.1.0   minor: added wallet.rename
                                   no payload changed, no refusal code changed
```

The rules are the same as an app's: a new operation is minor, a changed payload or refusal code is major, a budget
change is a patch. CI publishes only a revision whose example is green. The package carries its compiled model
(`dist/model.json`) and the digest of its verdict, so an app knows what it is mounting before it runs anything.

## Step 8: mounting it in acme

```bash
blueprint add feature @blueprint/wallets
```

```text
@blueprint/wallets 1.1.0 needs
  feature  auth      mounted at blueprint/features/auth.ts ✔
  adapter  eip1193   for the browser signer: mount it? [Y/n] y
wrote  blueprint/features/wallets.ts
wrote  blueprint/adapters/eip1193.ts
pinned @blueprint/wallets 1.1.0, @blueprint/eip1193 1.0.2 (both published over two weeks ago)
```

```ts
// acme/blueprint/features/wallets.ts. The mount's name is this file's name: wallets.
import { Blueprint } from "@blueprint/blueprint";
import wallets from "@blueprint/wallets";

export default Blueprint.use(wallets, (w) => [
  w.signer.node.keystore,                 // choose, from what wallets has proved
  w.signer.browser.injected,
  w.omit(w.operations.import),            // acme won't take imported keys
]);
```

```ts
// acme/blueprint/environments/production.ts (the lines this adds)
import wallets from "../features/wallets.ts";
// …
  choices: [wallets.choose(wallets.choices.chains, [1, 8453])],
```

### What acme gains

| | server | sdk | cli | mcp | docs, portal |
|---|---|---|---|---|---|
| `wallet.create`, `keys` | · | ✔ local code | ✔ `acme wallet create` | · | ✔ marked "from wallets 1.1.0" |
| `wallet.link` | · | ✔ local code and two calls | ✔ `acme wallet link` | · | ✔ |
| `wallet.challenge`, `complete`, `unlink` | ✔ routes | ✔ | ✔ | · (not agent) | ✔ |
| `wallet.list` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `wallet.import` | · omitted | · | · | · | listed as omitted |
| `Verify.linked`, `Signer.sign` | exports for acme's handlers and client code | | | | ✔ |

The model gains the `wallet` and `challenge` things, each marked `from: wallets@1.1.0`. The server's D1 gains their
tables. `generated/` gains the routes, SDK calls and CLI commands. `src/` gains nothing: the feature's behaviour stays
in its package.

### What acme's own journeys can now use

```ts
// acme/blueprint/journeys/approve-a-large-spend.ts
export default Blueprint.journey("a large spend needs the owner's wallet", {
  cast: { owen: owner, olga: grantee },
  starts: [worlds.funded, wallets.worlds.linked],   // acme's world, with the feature's fragment
  steps: (s) => [ /* owen signs the approval with his linked wallet; acme's handler checks it with Verify.linked */ ],
});
```

Every `wallets` journey also runs in acme's worlds on every `blueprint prove`, under acme's own projections, so
mounting can't quietly break the feature.

### Upgrading

```bash
blueprint upgrade wallets
```

```text
@blueprint/wallets 1.1.0 → 2.0.0
  major  wallet.complete: payload adds `chain`   (your SDK's callers must pass it)
  acme   1.4.0 → 2.0.0   (a payload in acme's surface changed)
  stale  12 verdicts: wallet.*, and acme's approve-a-large-spend (it uses Verify.linked)
re-run blueprint prove to clear them
```

An upgrade is a change to the description like any other. It marks exactly what uses the feature as stale and sends
it round again.

## Today and proposed

| Piece | Today, on `layer/3` | Here |
|---|---|---|
| A feature's package and descriptor | none; `packages/std` is an empty shell | `feature.ts`, the export map from the spike |
| Mounting | none | `blueprint add feature`, one file per mount |
| `runs: "client"` | the compiler refuses it (`operations/types.ts:49`, D3 #86) | client operations, behaviour per host |
| `step.call`, `step.use` | `Blueprint.step.database()` and kin only | both |
| `via`, `.notVia("agent")` | `Principal` is `anonymous | person` | as in K1 section 1 |
| Linking over SIWE | proved in `spikes/authenticated-siwe-link` | the same design, as `challenge` and `complete` |
| Journeys through projections | raw HTTP (`world.ts:85`) | replayed through each projection |
| World fragments | starting worlds only | `Blueprint.world.fragment` |

## Open risks

1. **A browser proof against a stand-in isn't proof against MetaMask.** Anvil as the EIP-1193 provider proves our side
   of the protocol, not each extension's quirks.
2. **Plain keys only.** ERC-1271, ERC-6492 and EIP-7702 verification are unproved (the spike's first open risk). So are
   passkeys, which wait on them.
3. **Chain and origin policy.** The spike used one chain (31337) and one origin. The `chains` choice settles which
   chains, but deploying behind several origins is not decided.
4. **Keystore portability.** Encrypted keystores on Linux CI and Node 24 are untested. The spike ran on macOS with
   Node 26.
5. **Fragments composing.** Two features' fragments that both seed the same cast must order cleanly (`after:`). Only
   one fragment exists here.
6. **The compiler check for rule 1** (feature operations use only their own roles and their needs' roles) is not
   written.
