# M0: calls made while building

Numbered, appended as M0 runs. Each says what was found, the evidence and what was done.

1. **The collector lost its folder and config under Docker Desktop** (17 November 2026). On `main` at `2ba8bd2`, with
   Docker Desktop 29.7.2 on this Mac, `prove:test` failed `telemetry.test.ts` "drops the person from a record" in every
   run of the file, and passed when run alone. Kept containers showed why: the collector exited at once with
   `open /etc/otelcol/config.yaml: no such file or directory`, then (after the config went inline)
   `open /out/logs.jsonl: no such file or directory`. `Collectors.start` removed and remade the folder under the same
   path, and wrote the config as a single-file bind mount; Docker Desktop's file sharing can keep serving the old
   folder and the old file. Linux CI never sees this. Fixed in `prove`'s telemetry module, behaviour unchanged: the
   folder is emptied rather than replaced, and the config is passed inline (`--config=yaml:…`), with `collector.yaml`
   still written beside it to read. Six runs of the file in a row then passed. This is the only non-rename change in M0's
   code, made so that "nothing broken" can be shown on this Mac.
2. **"`nx run-many -t check test`" read as the workspace's check** (M0.02). No project had a `check` target before
   M0.05 added `docs:check`; the root `check` script is `nx run-many -t lint,typecheck,test && nx sync:check`. M0.02's
   proof runs `check,lint,typecheck,test` and `sync:check`, so both readings are covered.
3. **Two more records** (M0-packages.md section 5): goal 1's prompt (`design/goals/01-…`) and `design/frame/questions.md`,
   the round K2 answered, which quotes the code as it was. The checks author added both to the name check's list.
4. **A generated migration's comment changed** (M0.03). `generated/server/migrations/0001_things.sql` in each example
   says which command rebuilds the local database; the generator now writes `forman dev` there. It is a comment in a
   generated file that stage one rebuilds on every run, not an applied migration's schema, so the rule that applied
   migrations are never edited is kept.
5. **The old design docs' history folder is `design/history/docs-layers-1-2/`** (renamed from the docs subagent's
   first choice), so no live link carries the old name and the docs' word check needs no exception.
6. **Names in wire formats changed with everything else** (M0.03): the server's bundle route (`/_forman/bundle`), the
   collector's and logbook's names (`forman-collector-*`, `forman-logbook`), span scopes and the logbook's OIDC
   audience. Nothing outside this repository reads them yet, and every environment, world and logbook is made fresh
   by the gates, so there is no old state to migrate.
7. **The docs are one page, Forman Docs, and it is their single source** (M0.05, Aaron's change, sent by the session
   that started M0). The earlier rewrite (Markdown pages in `design/docs/pages/` built into `site/`) was never on
   `main` and is dropped, not kept in history; the layers 1 and 2 docs stay in `design/history/docs-layers-1-2/`.
   `design/docs/index.html` is the published page's source with its wording kept, given a document skeleton so it opens
   from a checkout, and four edits that make it true once M0 is on `main`: the legend and the quickstart no longer say
   today's code runs under the old name, the commands chip says "Renamed in M0", and a mention of Codex's D4 calls the
   retired plugin word "the old plugin word". With no build step, `docs:build` is gone and `docs:check` is the link
   check alone: every link and anchor resolves, no script loads from elsewhere, no retired word or old name.
8. **"Agent kit" is not the retired word.** M0.05's "kit appears only in history" means kit as the word for a plugin.
   The agent kit is the agents projection's output (`frame/generators.md` section 3), and the docs keep the name. The
   docs check's word rule now skips "agent kit" and "agent-kit".
9. **The agent kit's package is `@formants/agent-kit`** (the loose end the docs left). The agents projection renders
   `generated/agents/`; `@formants/agents` is already the agents feature (M4), so the projection needs a name of its
   own, and the docs' own word for what it makes is the clearest. Added to `packages.md`; M3.12 builds it.
10. **`forman prove --empty` lands in M1, as M1.16** (the other loose end). Every checks slice from M1 on is done when
   "they fail on empty handlers", and today that is a manual run (`frame/story.md`, "Proposed"). The flag runs the
   journeys against scaffolded handlers and shows each step red, or "proved by the description" (S3, answer A). It
   needs only Gate M0, so it is parallel in M1, and Gate M1 now needs it.
11. **Review fixes** (🔍 review of `m0`). The name check spells the old names as test data, so the new lint rule is off
   for that one file (`.oxlintrc.json` override). Live frame docs still named `target-*` paths and the old bundle
   route; they now name `language-*` and `/_forman/bundle`. The checks author widened the name check to catch the old
   name after an underscore, the form that had hidden the bundle route.
