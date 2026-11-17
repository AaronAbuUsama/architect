# D3: one proof-to-publication integrity correction

Conductor decision, 17 November 2026. This is an early reset after two actionable reviewed heads, using the
break-review-loops skill. Base considered: main at `798ff34`. Current integration head: `28614d2`, with runtime code
at `8f50320`. The private Git review ledger is `review-loop/architect-goal01-stage3.json`.

## History and causes

The first review, `e43aa22`, found two product failures. Dirty builds could overwrite a revision's artifact and
inherit its earlier proofs. Concurrent world creation could admit eight owners, allowing marks-based cleanup to
cross ownership. D3 #160–164 binds signed proofs to immutable clean bundles; #170–172 puts admission, snapshots and
teardown behind D1's atomic guards. Their combined integration checks pass. The date-formatting finding was withdrawn
because it formats Effect-supplied time. Evidence-parser repairs and ordinary CI reruns are separate delivery work.

The second review, `8f50320`, found a surviving cause: checking identity at entry while later consumers read mutable
execution, source or publication state. A real staging restart and a source edit both still returned success in the
new fail-first tests. The first fix bound labels to an artifact, but did not bind every later reader to the captured
inputs. This is one repeated release-integrity cluster; the D1 isolation cluster is closed.

## Three read-only passes

The history pass compared those two heads. The architecture pass traced Build, signed verdict writers, promotion,
Publish.run, package/declaration staging and SEA. The independent reviewer's adversarial plan pass found two more
siblings at the same boundary: version staging directories can be overwritten by another invocation, and an existing
npm version is accepted without checking its bytes. No third correction head was introduced during the reset.

## Revised fix loci and order

1. Environments owns shared identity verification. Test and staging proofs pin revision, bundle hash and the existing
   running-process identity. Checking the original live PID also detects normal A-to-B-to-A restarts. Staging checks
   identity and clean/current source after proof, before model storage, publication and verdicts.
2. Promotion captures the full Git revision for staging, production and production retry. Publish owns a private
   snapshot of that revision, retaining project basename, ancestor configuration and installed-dependency resolution.
   Compiler, package, declaration and SEA inputs come from it. Outputs stay under the original project.
3. Publish gives each invocation ownership of its output staging. A second invocation cannot replace files that npm,
   SEA or a formula is about to consume. Durable binaries and returned staged paths survive source-snapshot cleanup.
4. Existing npm versions are reusable only when npm's pack integrity matches the staged captured output. Different
   or unknown bytes refuse; matching bytes retain idempotent reuse. Immutable registry versions are never overwritten.
5. Run the focused regressions, required package/type/generation checks, the author's check, the full gate and CI;
   request one independent review on the final candidate. Refresh main before landing.

The smallest guards use real services: staging restart/source-edit rejection; captured-source publication after a
working-tree edit; existing different same-version package refusal; and preservation of matching-output reuse.
Existing world, migration, package and gate checks remain the acceptance set. No universal proof harness is added.

Installed dependencies remain the toolchain boundary used by the existing build. Normal lifecycle PID identity is
the existing environment assumption. npm can fail partway through a multi-package publication; such a failure must
remain observable and must not be reported as successful. Source capture and owned outputs prevent that service
limitation from silently substituting another revision. No owner choice remains unresolved; implementation may resume.
