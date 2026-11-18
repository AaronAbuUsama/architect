# Spike: authenticated SIWE linking

**Question.** Can a real existing Better Auth bearer session link a genuinely signed SIWE wallet in workerd/D1 while preserving its person/session and rejecting replay atomically across concurrent completions and runtime restart?

**Answer.** Yes, for EOAs: an additive authenticated linking service can use the existing public AuthD1 and Principals interfaces. The real runtime passed all 26 checks, including one winner from two concurrent valid completions, preserved person/session after full runtime restart, persistent replay refusal, and successful completion of a pre-restart unused challenge.

## What was tried

- A separate local Worker through Wrangler/workerd with real persisted D1. No platform mocks, hand-written cryptography, cloud service, Anvil or provider account.
- The existing framework's public `AuthD1.make`, `AuthD1.handle`, `AuthD1.layer`, and `Principals` interfaces. The prototype does not import AuthD1 internals or change framework packages.
- Real email/password sign-up and sign-in first. The linking edge resolves the actual Better Auth session through its public get-session route and independently checks that Principals resolves the same person.
- An exact server-created ERC-4361 message containing authority/port, scheme, URI, chain, address, nonce, request ID, issued-at and expiration. D1 stores the message and its requesting person/session. Completion requires exact message equality and the same authenticated person/session, not supplied person/email fields.
- viem generates EOA keys and signs messages in Node client memory. Only the address, SIWE message and signature cross HTTP; the server holds public links and challenges, never a person key. Neither credentials nor tokens are printed or retained in captures. Temporary D1 necessarily contains Better Auth's own session state during the test and is removed at the end.
- A transactional D1 batch: a conditional update assigns a fresh per-completion claim; the association insert selects only the challenge with that claim; a unique `(address, chain)` key prevents reassignment. Completion rechecks expiration at consume time after signature verification.
- Every request is counted through the framework's Busy service. The service reads time through Effect Clock; process readiness waits, child-process control, environment access and output are confined to named `main.ts` entry files.

The built-in Better Auth SIWE plugin was deliberately not used as a linking endpoint. Version 1.7.15 looks up or creates the wallet's user and creates a session for that user; it does not read the existing session to attach a new wallet. See the [versioned implementation](https://raw.githubusercontent.com/better-auth/better-auth/v1.7.15/packages/better-auth/src/plugins/siwe/index.ts).

## What was found

1. The public surfaces are sufficient. `src/modules/links/service.ts` resolves the actual existing person and session without a private Better Auth adapter import, a new person, or a replacement token.
2. Missing/garbage bearer, another person, and another session belonging to the same person cannot issue or complete unauthorized links. Genuinely signed altered domain, URI, chain, address, nonce, expiry and not-before fields fail because completion accepts only the exact challenge the server issued.
3. Another EOA's signature fails. An expired server challenge fails. All invalid attempts leave associations empty.
4. Two concurrent HTTP completions carrying the same valid signature return exactly one 200 and one 401. D1's conditional claim selects one winner; there is no process-local replay cache or lock.
5. An already associated `(address, chain)` cannot be assigned to another person. The competing person receives 409 and has no association. This is the spike's narrow uniqueness policy, not a decision about cross-chain identity for the production kit.
6. Stopping the entire owned Wrangler/workerd process group, starting a fresh group on the same persisted D1, and presenting the original bearer preserves person, session, email and linked address. Consumed challenges still fail. An unused challenge issued before shutdown completes after restart.
7. Cleanup stops every owned child, removes the temporary persisted database, and verifies the HTTP and inspector ports can be bound again. No service remains running.
8. The initial typecheck script named `tsc`, but the pinned TypeScript 6 compatibility package exposes `tsc6`. Correcting that command and narrowing the generic D1 result through Schema produced a clean typecheck; no runtime guard was relaxed.

## Measurements

The committed [validation capture](evidence/validation.txt) records actual commands, output, exit codes, UTC timestamps and durations. [Structured proof](evidence/proof.json) records the 26 passing assertions, installed versions and cleanup result.

- Final runtime proof: **26 passed, 0 failed**, exit 0, **4,311 ms**.
- Full runtime stop/start and readiness: **1,509 ms**, using the same temporary persisted D1.
- TypeScript: `pnpm typecheck`, exit 0.
- No root dependency, lockfile, product, journey, generic evaluator, workflow or design files changed.

Captures identify the green parent commit `6a4fe088027e1df1b21bae7350356c9d0909b823`, since source and proof are delivered in one commit. The structured receipt also hashes the concatenated executed `src/main.ts`, `src/modules/links/service.ts` and `scripts/main.ts` bytes, so it identifies the tested uncommitted spike source rather than claiming the parent commit contained it.

## Pins and reproduction

```sh
cd spikes/authenticated-siwe-link
pnpm install --frozen-lockfile --ignore-scripts
pnpm typecheck
pnpm prove
```

The root workspace dependencies must already be installed, because the two Architect packages are linked from this checkout. This standalone spike has its own manifest, workspace and lockfile; it does not modify root dependency resolution. The harness reserves HTTP 19140 and inspector 19141 and refuses a taken port before starting anything.

- **viem 2.57.15**: [npm registry](https://registry.npmjs.org/viem), published **2026-11-03T01:08:58.990Z**; fourteen full days elapsed before this run on **2026-11-17T07:31:41.595Z**. The November 2 conservative date cutoff therefore yields to the repository's actual two-week rule for this exact version. [Versioned signing/account implementation](https://raw.githubusercontent.com/wevm/viem/viem@2.57.15/src/accounts/privateKeyToAccount.ts).
- **Better Auth 1.7.15**, already pinned by the framework: [npm registry](https://registry.npmjs.org/better-auth), published **2026-11-01T09:14:09.595Z**.
- **Wrangler 4.156.1**, **Effect 4.1.1**, **Cloudflare Worker types 5.20261101.1**, **TypeScript 6.0.2**, **Node types 24.19.2**: existing repository pins, repeated exactly in the spike where needed. Standalone installation enforces `minimumReleaseAge: 20160`, including transitives.
- Actual Node runtime: **v26.13.1**. The final receipt reads installed package versions, rather than assuming manifest versions.

## The decision it supports

D4 and L3.03 can use an additive WalletLinks Effect service while preserving the current Auth tags, Principal shape, and email/password/API-key/device/OAuth identity behavior. A request adapter must supply the actual session identity as well as the person for session-bound challenges. Durable challenges and public associations belong on the host; EOA signing belongs in the caller.

The prototype's `handle` is a throwaway request adapter, not the proposed final public kit API. A production service can keep the same operations as `challenge`, `complete` and `list`. The existing session-show declaration must explicitly add wallet output; resolving Principal alone does not change its answer schema.

## Open risks

- **EOAs only.** No claim of ERC-1271, ERC-6492 or EIP-7702 contract-wallet verification. Offline EOA recovery cannot establish those behaviors; they require real chain-specific verification and separate proof.
- Only configured chain 31337 and one local origin were used. The product must choose allowed chain/origin policy, multi-origin deployment behavior and wallet identity uniqueness explicitly.
- The test restarts workerd, not the machine; there is no crash injected between individual transactional D1 batch statements. Real D1 supplies the batch transaction, and concurrent/restart behavior passed locally. Hosted Cloudflare remains a later cloud-pass proof.
- Existing starter journeys and the complete earlier gates were not rerun in this bounded spike. They remain unchanged; the future kit implementation still needs their unchanged execution.
- No keystore, wallet CLI, auth-kit migration, generated API change, production retry policy, challenge quota, challenge pruning, or full typed error contract is implemented here.
- This run used Node 26 on macOS. Node 24/Linux CI portability is not established by a local source/typecheck proof.

All code under this directory is throwaway and must never be imported by framework packages.
