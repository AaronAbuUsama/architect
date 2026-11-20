# M7.01: the cloud pass for staging

Decided 20 November 2026 by the Goal 3 lead, under "Who decides" in `AGENTS.md`, for staging alone (K10 section 8;
`design/milestones.md`, M7.01). Production, npm and the rest of M7 still wait on the stage 4 gate. M7.01's row
needs Gate M2; Goal 3 puts staging inside stage 1 and orders M7.01 first, so it is taken now (G10).

## Aaron's yes

- K10, round 2, Q7 = A ("All recommended."): a new account for Orthograph staging alone, on Workers Paid ($5 a
  month), with a token scoped to that account, which he creates himself (`K10-factory.md`, section 8 and its
  answers).
- Goal 3, 19 November 2026: "This should also include a staging deployment", on `workers.dev` with no domain. He set
  the `CLOUDFLARE_ACCOUNT_ID` repository variable and the `CLOUDFLARE_API_TOKEN` repository secret that day.

No other cloud credential is made. If staging needs one, the work stops and asks Aaron.

## The account and the token

- **Account:** the one `CLOUDFLARE_ACCOUNT_ID` names, assumed to be K10's `orthograph-staging` account. The value is
  never read, so this rests on Aaron setting it for Goal 3's staging.
- **Token:** `CLOUDFLARE_API_TOKEN`, scoped by Aaron to that account. K10 asks for Workers Scripts, D1, Durable
  Objects, R2 and Containers, all edit.
- **Where they are used:** only inside GitHub Actions, as `secrets.CLOUDFLARE_API_TOKEN` and
  `vars.CLOUDFLARE_ACCOUNT_ID`. No agent reads, prints, copies or writes either value. No local run uses them, and no
  file or log holds them.
- **Checking the scope:** the token's scope is not read from the token. It is shown by what a run can and cannot do:
  the first staging pass records each call the account refused, if any. So this decision records the scope K10 asks
  for, not the scope the token has; `spikes/staging-pass` records what it was allowed to do.

## Which secret store `Cloudflare.secrets` means

**Per-Worker secrets, not the account-level Secrets Store.** A runtime secret, such as Better Auth's signing secret,
is set on the Worker it belongs to, and it goes when the Worker is destroyed. The account-level Secrets Store keeps
values apart from any Worker, so `ortho env destroy` would have to find and delete them as well. That makes it easy
to leave something behind.

A staging run makes its runtime secrets fresh in the job, from random bytes. It never prints them and never stores
them anywhere but on the Worker, so destroying the Worker leaves nothing. This answers the open question in
`design/frame/secrets.md`.

## Cost under the cap

Known: the account is on Workers Paid, $5 a month (K10), already Aaron's. Estimated, not measured: a run's own use.

| What | Cost | Known or estimated |
|---|---|---|
| Workers Paid, the account's plan | $5 a month | known (K10) |
| One staging run: a few thousand requests, a few D1 databases and Durable Object namespaces, minutes long | about $0, inside the plan's included requests, D1 rows and Durable Object use ([Cloudflare's Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)) | estimated |
| R2, if a run makes a bucket | about $0 for a run's size, inside R2's free tier | estimated |
| Containers | not used: Plugged In needs no container in staging. Containers bills by memory, CPU and disk used, so any later use is costed before it runs | known |

The cap is $10 a day across everything. Staging runs only by hand or from Goal 3's lead, at most ten a day, and each
one destroys what it made. The job fails when anything of Plugged In is left in the account. A run's spend is seen
afterwards on the account's billing page, which only Aaron can open; the first staging pass asks him to look once.

## How a run goes

1. One GitHub Actions workflow, started by hand, does up, the story, the evidence and destroy in one job.
2. Destroy runs even when the story fails.
3. After destroy, the job lists the account's Workers, D1 databases, Durable Object namespaces and R2 buckets, and
   fails if any of this run's remain.
4. It touches only names with this run's prefix, never anything else in the account.
5. The old `codex/links-staging` branch has no teardown and is never run.

**First pass, early:** `spikes/staging-pass`, Plugged In as it stands, deployed with the plainest tools. It finds
the cloud snags before M7.03 and M7.04 are built.

**Final pass, at the end:** `ortho env up staging` and `ortho env destroy staging` (M7.03, M7.04), for the
evidence.

## Supersedes

- design/frame/secrets.md: "which one `Cloudflare.secrets` means is a" → "`Cloudflare.secrets` means each Worker's own secrets, not the account-level Secrets Store"
