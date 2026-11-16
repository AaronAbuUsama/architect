# promote

`architect promote --to staging|production` (D3 #14, #90 to #96). `Promote.to({ root, env, target, say })` moves the exact
bundle `architect build` kept for the revision (the git commit) to an environment, and never rebuilds it.

- **Refusals come first,** and nothing is started for one: a dirty working tree, a revision with no built bundle or one whose
  file no longer matches its recorded hash, and a revision without the verdicts. Staging needs a passing `test` verdict for
  every operation, production a passing verdict in the environment it `promotesFrom` (staging) for every operation, each
  the newest one posted from `main` (`Verdicts.latest`): a pull request's verdict never opens a gate. A refusal is
  `PromoteRefused`, with the lines to print (`refused: <rev> has no green verdicts in <env>`, then `missing: <ops>`).
- **Then the target environment runs that bundle:** started, or restarted onto it with its state kept (`Environments.up`
  with the revision), and `GET /_architect/bundle` must answer the same revision and sha256.
- **Staging** is proved where it runs (`Prove.against`): the journeys and the nine evals, their people signing up for real
  through Better Auth because a real environment has no `/_world/cast`, judged from staging's own collector; a verdict per
  operation is posted with `environment: "staging"`, failing ones too.
- **Production** records the release in the logbook through `Releases.record`, with the version `Releases.next` gives, unless
  the revision is already the last release.
- What the local pass can't reach prints `skipped <destination> (cloud pass)`.

Test: `promote.test.ts`, the L2.05 done-when checks on a copy of acme under git, through the command, with the real logbook,
issuer and environments on ports 9030 to 9049.
