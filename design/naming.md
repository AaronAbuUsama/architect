# Names: what is called what, where, and how

The framework is **Orthograph** ([`decisions/K6-orthograph.md`](decisions/K6-orthograph.md)). This page is the one
place that says how each name is spelled, where it lives, and the rule that forms it. The canon
(`docs/canon/`) owns what concepts *mean*; this page owns how identifiers are *spelled*. When a new kind of name
appears, it gets a row here before it gets used.

**Status: specified, not swept.** The code on `main` still says Forman, `forman` and `@formants`. The sweep is one
slice, run after the open design pull requests land (K6, "Order"). The counts below were taken on `main` at `40ff66f`
on 18 November 2026, outside `spikes/`.

## In short, for the ear

There are three spellings of one name, and each has its place. **Orthograph** is the name you say and read: in docs,
titles and the portal. **ortho** is everything you type or a machine reads: the command, environment variables, the
hidden folder, the config file, URLs, telemetry and lint rules. **@orthograph** is only the npm scope. What you write
is still the blueprint, and a project's own names stay its own.

## The rules

1. **Prose says Orthograph.** Headings, sentences, the portal, the docs site, error messages read by people.
2. **Typed and machine names say `ortho`.** Anything a person types or a program matches on uses the short form, in
   the casing its context needs: `ortho` (commands, files, folders, URL paths, telemetry), `ORTHO_` (environment
   variables), `ortho-` (containers, Workers, audiences), `ortho/` (lint rules, symbol keys).
3. **Only npm uses `@orthograph`.** The scope is the registry identity: `@orthograph/<what it is>`. The front door is the
   plain package `orthograph`. The M0 rules for package names stand: plugins are named for what they are, without
   their kind (`@orthograph/auth`), and languages and hosts keep their kind as a prefix (`@orthograph/language-effect`,
   `@orthograph/host-cloudflare`).
4. **What you write is the blueprint, and never takes the product's name.** The `blueprint/` folder, the `Blueprint.*`
   API, and the words in the canon (thing, machine, operation, projection, world…) don't change when the product does.
5. **A project's names are its own.** `@acme/*`, the `acme` command and `acme`'s Workers come from the project's name,
   never from Orthograph's.
6. **History keeps its words.** Dated records (`design/decisions/`, `design/history/`, `design/evidence/`) say what was
   true when they were written. They gain a "superseded by" pointer, never a rewrite.
7. **One source per name.** Code reads the short form and the scope from one exported constant in `orthograph`, not
   from string literals scattered across packages, so the next rename is one line plus generated files.

## The map

### People see it

| Today | Becomes | Where it lives | Reach on `main` |
|---|---|---|---|
| Forman (prose) | **Orthograph** | READMEs, `design/`, the portal, CLI help text, `docs/canon/forman.mdx` (to `orthograph.mdx`) | "Forman" 137 times in 44 files |
| the command `forman` | **`ortho`** | the `bin` of `@formants/cli`; commands quoted in docs, help and tests (`forman dev`, `forman prove --env`, `forman env up`, `forman check`, …) | 291 times in 125 files |
| compiler binary `forman-model` | **`ortho-model`** | `packages/compiler/package.json` | 1 |

### npm and Nx

| Today | Becomes | Where it lives | Reach |
|---|---|---|---|
| `@formants/forman` | **`orthograph`** | `packages/forman`, to `packages/orthograph`; imported by every project and by all generated code | — |
| `@formants/<name>` | **`@orthograph/<name>`** | `cli`, `compiler`, `generators`, `host-cloudflare`, `language-effect`, `language-solidity`, `lint`, `logbook`, `portal`, `preset`, `prove`; later `auth`, `organizations`, `work`, `agents`, `stripe`, `resend`, `wallets` | `@formants/` 934 times in 537 files |
| `@formants/source`, `@formants/e2e` (private) | `@orthograph/source`, `@orthograph/e2e` | root and `e2e/` `package.json` | 2 |
| Nx project `forman`, tag `scope:forman`, target `forman:build` | project `orthograph`, tag `scope:orthograph`, `orthograph:build` | `packages/forman/project.json`, the module-boundary rules, two tests | 4 |
| path `packages/forman` | `packages/orthograph` | tsconfig paths, docs, tests | 32 times in 18 files |

### A project's files

| Today | Becomes | Where it lives | Reach |
|---|---|---|---|
| `forman.config.ts` | **`ortho.config.ts`** | the one loose file in every project; read by the compiler and CLI | 15 files |
| `.forman/` (`environments`, `prove`, `artefacts`, `tap`, `tasks`, `ratchets`, `publish`, `evidence`, `secrets`, `dev`, `check`, `agent`) | **`.ortho/`**, same subfolders | each project's local state; `.gitignore` | 115 times in 65 files |
| `.github/workflows/forman.yml` | `.github/workflows/ortho.yml` | the project's CI workflow, which the logbook trusts by name | 8 times in 5 files |
| `blueprint/`, `src/`, `generated/` | unchanged | rule 4 | — |
| the header `// Generated from the blueprint. Do not edit.` | unchanged | 408 generated and scaffolded files; it names the blueprint, not the product | — |

### Machines see it

| Today | Becomes | Where it lives | Reach |
|---|---|---|---|
| `FORMAN_*` variables (`ENVIRONMENT`, `LOGBOOK_URL`, `LOGBOOK_TOKEN`, `REVISION`, `REGISTRY`, `WORLDS`, `VERSION`, `BUNDLE_SHA`, `OIDC_ISSUER`, `OIDC_CLIENT`, `OIDC_REPOSITORY`, `OIDC_WORKFLOW`, `OIDC_REF`, `TAP_REPO`, `FORMULA`, `LIFETIME`, `LIVE_AXIOM`, `HOME`, `CACHE`) | **`ORTHO_*`**, same suffixes | CLI, prove, logbook, the generated server, e2e | 239 times in 60 files |
| URL path `/_forman/bundle` | **`/_ortho/bundle`** | the reserved route every generated Worker answers | 24 times in 20 files |
| OIDC audience `forman-logbook`, issuer `forman`, workflow `forman` | `ortho-logbook`, `ortho`, `ortho` | logbook tokens, ship, portal, e2e | 31 times in 21 files |
| containers and temp names `forman-collector-…`, `forman-staging-proof-…` | `ortho-collector-…`, `ortho-staging-proof-…` | prove's environments and tests | 15 times in 9 files |
| telemetry scope `forman.prove` | `ortho.prove` | prove's journey spans | 1 |
| symbol keys `forman/ref-path`, `forman/error-name` | `ortho/ref-path`, `ortho/error-name` | the front door's journeys and errors | 2 |
| lint plugin `forman`, its rule `forman/no-old-names`, and the boundary tag `scope:forman` | plugin `ortho`, `ortho/no-old-names`, `scope:orthograph` | `.oxlintrc.json`, `packages/lint` | 6 lines |
| Worker name `forman-logbook` | `ortho-logbook` | `packages/logbook/wrangler.jsonc` | 1 |

### Outside the repository (Aaron's)

| Today | Becomes | Who |
|---|---|---|
| no npm org | `@orthograph` | Aaron creates it; the sweep can land before, but nothing publishes until it exists |
| GitHub repository `AaronAbuUsama/architect` | Aaron's call: keep it, or rename it to `orthograph` | renaming is outward-facing; GitHub redirects the old URL |
| GitHub org | `orthograph` is taken; `orthograph-dev` was free | only if Aaron wants one |
| local folder `~/projects/architect` | unchanged until the repository moves | — |

### Left as they are

- Every dated record, under rule 6. "Architect" still appears 395 times in 58 files, almost all of them history.
  Those words stay. Lint ignores `design/**` (`.oxlintrc.json`), and the old-names rule only reads string literals in
  code, so prose anywhere is covered by the sweep's `git grep` check, not by lint.
- `blueprint/`, `Blueprint.*`, the canon's words, and every project's own names (rules 4 and 5).
- `spikes/`, which is never built and never swept.

## How the sweep runs

One slice, in the order of the tables, each category ending green:

1. Add `forman`, `Forman`, `@formants`, `FORMAN_`, `.forman/`, `_forman/` and `forman.config` to the old-names rule
   (`packages/lint/src/modules/rules/internal/old-names.ts`) with this page's replacements as the advice. Lint now
   fails everywhere the old names live, so it is the sweep's to-do list.
2. Add the one constant from rule 7, and point the code at it.
3. Rename by table: npm and Nx, a project's files, the names machines see, then the prose people see.
4. Regenerate the examples (`generated/` is never edited by hand) and run every gate.

**Done when:** lint passes with the extended rule; `git grep -i -E "formants|forman"` outside history, `spikes/` and
the lint rule itself returns nothing; every e2e gate passes locally and in CI.
