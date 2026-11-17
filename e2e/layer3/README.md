# Stage 4 authored acceptance: kits and the chain

Goal 01 still ends only when all five gates pass locally and in CI on main. Stage 3 passed at main
`6a4fe088027e1df1b21bae7350356c9d0909b823`; it is a starting point, not Stage 4 proof. D4 freezes the immediate kit and
dependency public contract. This is the separate author lane; production builders never edit these checks or fixtures.

## Whole-stage matrix

| Step | Required real acceptance | Authored proof boundary / next file |
|---|---|---|
| L3.01 | One installed fixture kit selected with one command and one valid choices file. Typed SDK, configured HTTP and fresh-worker MCP answers, no project handler blank. Names/provenance/choices/code/tag collisions, selected import closures, raw Promise and typed Effect dependency wrappers, exactly one runtime mapper blank across two atomic files, normalized impact/staleness and effective source integrity. Earlier kits-free interfaces and nine evals remain. | Immediate files 00–04 and the L3.01 fixture set. Current unsupported CLI/layout failures are readiness RED, **not** an empty-handler execution proof. |
| L3.02 | Real encrypted local keystore; wallet create/import/list, public address shown; world-scoped test wallets for every test person. No plaintext key in files, logs or server bindings. | Before its builder: `05-wallets-auth.test.ts`; decide the public Signer/keystore command surface first. |
| L3.03 | Unchanged starter journeys pass after the auth adapter becomes a kit. Authenticated SIWE links the wallet to the same existing person/session; replay, wrong address/principal, expiration and concurrent consume refuse; durable replay remains refused after restart. Session show lists the linked address. | The same 05 file, authored after additive link/challenge declarations are decided. A new wallet session is not a link proof. |
| L3.04 | Actual Anvil and fixture ERC20: deployment, transfer and receipt span; revert decodes to the declared typed error; project code does not wrap viem. | `06-chain-worlds.test.ts`, after the chain service and typed error/receipt interface is decided. |
| L3.05 | A real owned Anvil bench answers eth_chainId; independent worlds isolate state; explicit end, expiry and failed startup remove only their own chain/container/proxy resources. The world's clock uses whole seconds/interval zero. | The same 06 file, after the world/bench public interface and Linux Container execution boundary are fixed. A source receipt or a Mac-only spike is not CI runtime proof. |
| L3.06 | 100 concurrent real submissions finish with nonces 0–99 exactly once and no gaps; a deliberately dropped transaction is replaced at the same nonce with a higher fee and its receipt is retained. Real Durable Object ownership serializes it. | `07-relay-and-simulation.test.ts`, after sender/receipt/replacement operations and bounds are declared. |
| L3.07 | Simulating a reverting call returns its typed error and sends nothing: compare real pending/confirmed nonce and state before/after. Exercise the selected node API and real fork fallback if required. | The same 07 file. No fake RPC or presumed simulate API shape. |
| L3.08 | Actual forced Anvil reorg produces a correction; the follower view agrees with chain state; restart from persisted checkpoint does not double count. Chunk/window/alarm behavior comes from the declared follower interface. | `08-follower.test.ts`, after checkpoint/correction declarations and the pinned Anvil reorg parameters are decided. |
| L3.09 | Prague 7702 delegation performs a real sponsored call with the person's client-side signing material and proper delegated code/receipt. | `09-delegation.test.ts`. Defer only on recorded blocking runtime evidence and an explicit conductor decision, as the build plan permits; never hide it behind an availability skip. |
| L3.10 | Whole acme journey: wallet create/link, 100 relayed nonces and reorg correction; all applicable operations retain nine evals and planted guards. No handwritten viem import/closure in acme; full gate runs alone and cleans every owned process/container/port. | `10-whole-acme.test.ts` plus every earlier file, local and Linux CI on main. File presence alone is not a successful gate. |

The later files are not authored by guessing private APIs. Before each corresponding builder starts, this author lane
adds its executable checks from the decided declarations and watches them fail. The stage-completeness check keeps
`e2e:layer3` red while those checks are absent; it is an inventory boundary, not a substitute for their real assertions.
No full Stage 4 gate has succeeded. There are no skip-green placeholders.

## Immediate fixture ownership

`fixtures/layer3/echo` contains the existing successful spike body from `c9be9c83`, unchanged except type-only wiring.
This author supplied descriptor/namespace/factory adapters and independent empty-handler/defect variants, not another
successful business implementation. The package is actually type-emitted, compiled, packed and extracted; no registry
or platform is faked. Promise fixtures call the authored real HTTP hold/release endpoint; Effect fixtures exercise
failure, defect, interruption and required Context through the specified public generated service.

Positive and negative runtime checks cannot get past unsupported `add kit`/`add dependency` today. Their readiness RED
must not be described as running the empty-handler/defect/missing-mask fixtures. The source-independent kits-free and
fixture-origin controls can execute now and are labeled separately. All new World/HTTP work is scoped to 19160–19179;
no earlier gate's sweeping teardown is imported. Keys, credentials and cloud resources are outside this package.
