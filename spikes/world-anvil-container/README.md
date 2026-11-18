# Spike: a world-owned Anvil container

**Question.** Does pinned Wrangler 4.156.1 and workerd's native Durable Object Container API actually let a world own, serve RPC from, and destroy Prague Anvil 1.8.6 locally through Docker, without Cloudflare credentials?

**Answer.** Yes on this Mac, including real storage-alarm expiry and an intentionally failed Anvil startup. Local process ownership must include Wrangler's unlabelled egress-proxy containers as well as the labelled Anvil containers. Linux CI is pending; this receipt is not a cloud or Linux proof.

## What was tried

The branch starts at green main `6a4fe088027e1df1b21bae7350356c9d0909b823`. Everything in this spike is throwaway; packages never import it. No product, workflow, design, journey or eval files changed.

The minimal Worker uses `DurableObject` from `cloudflare:workers`, Effect, real SQLite-backed DO storage, `storage.setAlarm`, and direct `ctx.container` calls. There is no Container SDK, simulated DO, fake alarm, fake Docker daemon or fake EVM. An Effect semaphore serializes lifecycle changes. The terminal world state is retained so repeated `end` or `start` cannot resurrect it; repeated teardown retries destruction.

The Dockerfile uses the official Foundry image, pinned to the immutable registry identity:

```text
ghcr.io/foundry-rs/foundry:v1.8.6@sha256:4a16a86f41d30418fbdca47ce2868121bbb0aeaa0a34bde2dd1e2911c4be2464
```

The entrypoint invokes `anvil --silent --hardfork prague` and redirects its stdout and stderr to `/dev/null` at the process boundary, before Docker can collect them. No account-listing or signing RPC is permitted. The deliberately failing case invokes real Anvil with an invalid hardfork; it is not a replacement chain service. Docker logs were checked empty while Anvil was running.

The runner gives Wrangler a fresh XDG config directory, refuses to proceed if the legacy home Wrangler directory exists, removes Cloudflare authentication variables from its inherited environment, and runs only `wrangler dev --local`. It does not log in or deploy. The existing Docker context remains available. It records exact IDs through image owner labels, the unique `workerd-architect-spike-anvil-<pid>-` name prefix and real Docker create events. Teardown removes only that run's containers and derived image, preserving every pre-existing container and the shared official image cache.

### Pinned inputs

| Input | Exact version | Published |
|---|---|---|
| Effect | 4.1.1 | 2026-10-30 21:53:39 UTC |
| Wrangler | 4.156.1 | 2026-11-01 23:18:26 UTC |
| Workers types | 5.20261101.1 | 2026-11-01 01:06:38 UTC |
| Miniflare, resolved by Wrangler | 5.20261101.0-beta | 2026-11-01 23:13:59 UTC |
| workerd, resolved by Wrangler | 1.20261101.1 | 2026-11-01 01:07:41 UTC |
| Official Foundry / native Anvil | 1.8.6, commit `6bad0a66de7c83f7b33695044138f0f5fa4c5990` | 2026-10-21 |

All predate the run by at least fourteen days. [pins.json](evidence/pins.json) contains exact registry publication timestamps, package integrity values and primary metadata links. The run used native Node 26.13.1, Docker client 29.8.2 and Docker daemon 29.7.2 on Linux aarch64. Wrangler built the actual Anvil container for linux/amd64 on this arm64 Mac. Node 24 and a native Linux host remain CI checks.

## What was found

1. **Real ownership and RPC work.** A real world DO called `ctx.container.start({ image: ctx.container.images.base, enableInternet: false })`; `getTcpPort(8545).fetch` reached Anvil, and `eth_chainId` returned `0x7a69`. The final receipt identifies three actual Anvil containers and their three Wrangler proxy containers.
2. **Clock setup works in this version.** `anvil_setBlockTimestampInterval [0]` was accepted. After setting whole-second timestamp `1793577601`, mining, waiting 1.2 seconds of real time, and mining again, both blocks still had that timestamp. Anvil refused the fractional input `1793577601.5`. This establishes chain setup, not the future framework's stepped-clock or cross-process quiet implementation.
3. **Explicit end stops one world's Anvil.** While a second world was running, ending the first stopped its Anvil and the second still answered `eth_chainId`. A repeated end stayed terminal, and another start returned 409. The RPC path itself never starts a container.
4. **A real DO alarm expires the world.** The second world's `storage.setAlarm` fired, its state became `expired`, and its Anvil stopped. The runner did not call the alarm handler or substitute a test clock.
5. **The planted failure is cleaned.** The invalid-hardfork process failed inside the real container. `monitor()` observed completion/failure, the DO recorded `failed`, `destroy()` completed, the Docker-created container stopped, and a retry to start the same world returned 409.
6. **Docker observation races are real.** Docker can remove a stopped container between `ps` and `inspect`. An early observer incorrectly treated Docker's lowercase `no such object` as a harness failure. The runner now accepts only an explicit missing-container response as gone; daemon failures still fail the run. Create events retain the IDs even if the failed container disappears before inspection. [The failed observer receipt](evidence/docker-observer-race.json) is retained rather than counted as a pass.
7. **Image labels alone miss platform sidecars.** After observer run `architect-spike-anvil-68281`, two unlabelled proxy containers named for that exact run survived Wrangler's exit. They were identified by run prefix and removed by exact ID; [the manual cleanup receipt](evidence/sidecar-cleanup.json) records the observed IDs and removal command. Earlier daemon events were no longer retained when queried later. The final runner tracks and cleans the native Wrangler prefix too. Do not implement CLI teardown by filtering only the Anvil image label, or assume local process exit guarantees complete Docker cleanup.
8. **Cold image preparation needs its own budget.** The first 180-second startup budget expired while downloading the amd64 image and the pinned Cloudflare proxy image. [That attempt](evidence/cold-start-attempt.json) exited 1 and preserved all nine existing user containers. With images cached and a 600-second preparation bound, the real checks pass. This was a preparation timeout, not evidence that a native container call failed.

## Measurements

Final run: `2026-11-17T07:49:22.267Z` to `07:49:41.802Z`, exit 0, 17 checks passed.

| Check | Observed |
|---|---:|
| Wrangler / Worker ready, images cached | 2,816 ms |
| Anvil RPC ready after DO start | 819 ms |
| 1,500 ms storage alarm became observably expired | 1,575 ms |
| Actual Anvil containers created | 3 |
| Actual Wrangler proxy containers created | 3 |
| Owned containers remaining | 0 |
| Pre-existing user containers preserved | 9 of 9 |

[mac-run.txt](evidence/mac-run.txt) is the actual captured runner output. [mac-receipt.json](evidence/mac-receipt.json) records the invocation, UTC times, exit code, pins, exact Docker IDs, image identity, individual checks, config isolation and before/after IDs. These are local observations, not performance targets.

## Run it

After the repository's frozen pnpm installation, with Docker running and the pinned image present:

```sh
pnpm exec tsc -p spikes/world-anvil-container/tsconfig.json
node spikes/world-anvil-container/src/main.mjs
```

Only ports 19120–19129 are allowed; `SPIKE_PORT` selects one, with 19120 as the default. Runtime state and Wrangler's own log stay in ignored `.run/`. The spike needs no native Anvil installation on Linux: its exact official image supplies the real node; a native binary's version is recorded when available.

For a real Linux runner, after the same frozen dependency install:

```sh
bash spikes/world-anvil-container/check-linux.sh
```

This pulls the same digest, invokes the same real checks and produces `evidence/linux-receipt.json`. No Linux receipt is committed because no Linux CI run has occurred. The conductor owns workflow integration.

## The decision it supports

L3.05 can use native DO-owned Containers under `wrangler dev` on Docker without a Cloudflare account. No Container SDK or hand-written Cloudflare API substitute is necessary. Preserve one lifecycle owner, terminal-state refusal, awaited native destruction and a CLI cleanup inventory that includes Wrangler's sidecars. Local child-process Anvil remains a separate adapter to implement and prove; this spike establishes the real Container path only.

## Open risks

- Linux CI, Node 24, deployed Cloudflare, crash recovery and cloud billing have not been tested here. Nothing was deployed and no cloud resources or credentials were created.
- This does not implement the production bench declaration, generated wiring, relayer, follower, wallet handling, receipt spans, counted work across processes or stepped-clock driver.
- The native container policy is beta. Wrangler's proxy image is pinned by the installed Miniflare runtime to `cloudflare/proxy-everything:3cb1195@sha256:0ef6716c52430096900b150d84a3302057d6cd2319dae7987128c85d0733e3c8`.
- Each local Anvil has a proxy sidecar. Production CLI resource accounting must track the full owned set, including an interrupted or failed run, and must never prune unrelated Docker resources.
- The runner intentionally refuses a machine with an existing legacy Wrangler home directory rather than inspect or reuse possible credentials. The observed Mac had none; fresh XDG directories contain no supplied credentials.

Primary sources: [native Container API](https://developers.cloudflare.com/containers/api/durable-object-container/), [local Docker development](https://developers.cloudflare.com/containers/guides/local-dev/), [scheduling policy](https://developers.cloudflare.com/changelog/post/2026-09-30-durable-object-scheduling-policy/), [Foundry 1.8.6 release](https://github.com/foundry-rs/foundry/releases/tag/v1.8.6), [Foundry Dockerfile](https://github.com/foundry-rs/foundry/blob/v1.8.6/Dockerfile).
