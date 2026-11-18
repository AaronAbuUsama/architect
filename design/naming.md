# Naming: a new name for Forman

Written 18 November 2026, after Aaron said: "I don't like Formant.js either, to be honest with you … can we create a new
thread to think about what this new name should be and come up with some options and we'll search npm as well."

**Decided (Aaron, 18 November 2026): Orthograph**, command `ortho`, npm scope `@orthograph`, blueprint kept. The
call and the names that follow from it are in [`decisions/K4-orthograph.md`](decisions/K4-orthograph.md).

Nothing is renamed here. This file holds the candidates, what was actually seen when each was checked, and a
shortlist for Aaron to pick from. Signing in, creating the npm org, the GitHub org or a domain is Aaron's to do.

## In short, for the ear

Almost every real English word, and almost every short made-up word, is already taken as an npm scope, mostly by
people who registered it and never published anything. So the shortlist is made of rarer words that are free
everywhere that matters.

My recommendation is **Fanfold**. A fanfold is one long sheet that folds out into many pages, which is what Forman
does: you write one blueprint and the app, the docs, the observability and the agent kit fold out of it. It is free
as an npm scope and as a plain npm package, nobody in software uses it, and it can't be misheard. The cost is seven
letters to type.

If a shorter command matters more, take **Ortho**, from orthographic projection: one object drawn as a plan, a front
view and a side view. Its npm scope is free, but the plain `ortho` package and the obvious GitHub names are taken.

Every option keeps the word **blueprint** for what you write. Each of them is a drafting or printing word, so
blueprint still fits.

## What the name has to carry

From `design/frame/README.md`, `design/milestones.md` and `AGENTS.md`:

- an agent writes one verbose, explicit description, the blueprint;
- the compiler turns it into a model;
- docs, the app, live observability and the agent kit are projections of the model and fall out of it for free;
- it runs on Effect and Cloudflare, with plugins of three kinds: features, adapters and projections;
- the command is typed all day, so it has to be short;
- Aaron listens rather than reads, so it has to survive being spoken and heard.

One name covers the product, the command, the npm scope and the packages under it: `@<name>/language-effect`,
`@<name>/host-cloudflare`, `@<name>/auth`, `@<name>/organizations`. The front door `@formants/forman` becomes either
the plain package `<name>` (where it is free) or `@<name>/core`.

## How each check was made

All checks were run on 18 November 2026 from this machine. Nothing was signed in to or registered.

| Check | How | What "free" means |
|---|---|---|
| npm scope | `GET https://registry.npmjs.org/-/org/<name>/package` | `{"error":"Scope not found"}`. This endpoint answers for users and orgs alike; `{}` means the scope exists with no public packages (still unavailable) |
| plain npm package | `GET https://registry.npmjs.org/<name>` | `{"error":"Not found"}` |
| `@<name>/core` | `GET https://registry.npmjs.org/@<name>%2fcore` | 404 (always true when the scope is free) |
| GitHub | `gh api users/<name>`, also `<name>-dev`, `<name>hq`, `<name>js` | 404 |
| command clash | `command -v <name>`, `brew info --formula/--cask <name>`, `brew search` | not found |
| products and tools | a web search per name | no developer tool or product of that name |
| domains | `dig +short NS <name>.dev` and `.sh` | no name servers. That only suggests the domain is unregistered; a registrar has the final word |

The npm registry rate-limited the run (Cloudflare error 1015) part way through; those names were re-run slowly and
only the re-run results are recorded.

## The candidates (about a hundred checked)

The brief asked for about 25. Because plain words were all taken, the sweep went wider. The npm scope result decided
most of them.

| Angle | Name | npm scope | Why it was cut, or kept |
|---|---|---|---|
| building | plinth | taken `{}` | also `@plinthjs` ships auth packages, and a "Plinth stack" web build tool exists |
| building | keel | taken (packages) | Keel is an existing backend platform |
| building | truss | taken `{}` | |
| building | lintel | taken (packages) | `@lintel/cli` exists |
| building | gable | taken `{}` | |
| building | atrium | taken (packages) | |
| building | joist | taken (packages) | Joist is a web components library |
| building | corbel | taken `{}` | |
| building | keelson | taken `{}` | |
| building | ashlar | not checked on npm | web: a .NET dev tool named Ashlar, with plugins called bricks |
| building | tekt | **free** | finalist |
| building | tekto, tecto | taken `{}` | |
| building | tektra, tektos | free | weaker spellings of tekt |
| building | trussa, plinthe, plinthos | free | read as misspellings |
| building | vitruv | free | web: Vitruvius, a KIT framework of one underlying model projected into views. Too close in idea |
| building | alberti, palladio | taken `{}` | |
| building | bauplan | free | web: Bauplan Labs, a funded serverless data platform. Clash |
| building | maquette | not checked on npm | web: a maintained TypeScript virtual DOM library |
| form | mould | taken, `@mould/core` exists | |
| form | lattice | taken, `@lattice/core` exists | |
| form | kiln | taken `{}` | also `@kilnjs/core` exists |
| form | facet | taken `{}` | web: at least six tools named Facet, one a TypeScript blockchain SDK |
| form | tessera, tessel | taken | |
| form | formwork | taken `{}` | |
| form | eidos, eido, forma, morphe | taken | |
| form | modulor | taken `{}` | web: `libmodulor`, a TypeScript library for platform-agnostic apps |
| form | modela | **free** | finalist |
| form | modello, modelo | taken | |
| projection | prism | taken `{}` | Prisma, PrismJS, a Homebrew cask |
| projection | refract | taken `{}` | |
| projection | refrax | free | plain `refrax` is an old JavaScript framework of the same name |
| projection | lumen, lumina, lantern | taken | |
| projection | orrery | taken, `@orrery/core` exists | |
| projection | gnomon, umbra, obscura | taken | |
| projection | ortho | **free** | finalist |
| projection | orthic, orthora, orthojs | free | weaker forms of ortho |
| projection | axon | taken (packages) | |
| projection | axono, isomet, elevan | free | hard to say, or heard as another word ("eleven") |
| projection | kaleido | taken `{}` | web: Plotly's Kaleido and the Kaleido blockchain platform |
| projection | irida | **free** | finalist |
| printing | litho | not checked on npm | web: Litho, Meta's Android UI framework |
| printing | diazo | not checked on npm | web: Diazo, Plone's theming engine |
| printing | cyan, cyano, cyanic | taken | |
| printing | cyanotype | free | nine letters, too long to type |
| printing | ozalid | **free** | finalist |
| printing | fanfold | **free** | finalist |
| printing | blueform | **free** | finalist |
| description | canon, writ, fiat, edict, telos, thesis, logia, verso | taken | |
| description | dictum | free | plain `dictum` taken (a static site tool); awkward aloud |
| description | decla, declo, specto, specform, stele, vellum | taken | |
| description | disegno | **free** | finalist |
| description | traza | taken `{}` | |
| description | trazo | **free** | finalist |
| description | onefold, unfold | taken (packages) | |
| invented | voro, tavo, ondo, kova, zolt, brevo, talo, nuvo, kinra | all taken | every four- or five-letter coinage tried was taken |
| today | forman | taken `{}` | the reason the current scope is `@formants` |
| today | formanjs, formanhq | free | finalist, as "keep the name, fix the scope" |

## The ten finalists, with what was seen

| Name | npm scope | plain npm package | GitHub | Command | Products and tools seen | Domains |
|---|---|---|---|---|---|---|
| **Ortho** | free | taken: `ortho` 0.2.3, the Orthogonal platform CLI (its binary is `orth`), 51 downloads last month | `ortho` user (2012, 0 repos), `ortho-dev` user (2026), `orthohq` org (7 repos) all taken; `orthojs`, `getortho` free | not on PATH, no Homebrew formula or cask | no framework called Ortho; Orthogonal's `@orth/cli` sits nearby; Ortho is a consumer brand outside software | `ortho.dev` parked at Afternic (for sale); `ortho.sh` registered |
| **Trazo** | free | free | `trazo` user (2015, 0 repos) taken; `trazo-dev`, `trazohq` free | none | nothing found | `trazo.dev` registered (Cloudflare); `trazo.sh` no NS |
| **Tekt** | free | free | `tekt` user (2010, 0 repos) taken; `tekt-dev`, `tekthq`, `tektjs` free | none; `brew search` only finds `tektoncd-cli` | Tekton, the Kubernetes CI/CD system; Tekk, a spec-driven platform for coding agents | `tekt.dev` registered; `tekt.sh` no NS |
| **Ozalid** | free | free | `ozalid` user (2014, 0 repos) taken; `ozalid-dev`, `ozalidhq`, `ozalidjs` free | none | no software; the OZALID trademark (diazo copying) shows as expired or cancelled in the US records found, last cancelled 2010 | `ozalid.dev`, `ozalid.sh` no NS |
| **Modela** | free | taken: `modela` 0.4.0, "Javascript model library", last changed 2022 | `modela` **free**; `modela-dev` org (2023) taken | none | Roland's MODELA milling machines (hardware) | `modela.dev` parked at Afternic; `modela.sh` no NS |
| **Irida** | free | free | `irida` user (2013, 0 repos) taken; `irida-dev`, `iridahq` free | none | IRIDA, a genomic epidemiology platform (irida.ca) | `irida.dev` registered; `irida.sh` no NS |
| **Fanfold** | free | free | `fanfold` org (created 2026, 0 repos) taken; `fanfold-dev`, `fanfoldhq` free | none | nothing in software | `fanfold.dev`, `fanfold.sh` no NS |
| **Blueform** | free | free | `blueform` user (2018, 0 repos) taken; `blueform-dev`, `blueformhq` free | none | nothing found of that name | `blueform.dev`, `blueform.sh` no NS |
| **Disegno** | free | taken: `disegno` 0.1.0, no description, published March 2026 | `disegno` user taken; `disegno-dev`, `disegnohq` free | none | nothing in software | `disegno.dev` registered; `disegno.sh` no NS |
| **Forman** (scope `@formanjs`) | `@forman` taken `{}`; `@formants` and `@formanjs` free | taken: `forman` 0.3.0, a web form submitter (2022) | `forman` user (10 repos) and `formanjs` user (2026) taken; `forman-dev`, `formanhq` free | none installed here, but heard aloud it is "foreman", the well-known Procfile runner and the Foreman infrastructure tool | as left | `forman.dev` registered; `forman.sh` no NS |

What each name means:

- **Ortho**: orthographic projection, one object drawn as plan, front and side views. Forman's idea in a word.
- **Trazo**: Spanish for the line of a drawing; `trazar un plano` is to draw up a plan. In English it echoes "trace",
  which is what the observability is.
- **Tekt**: from the Greek *tekton*, builder, the root of "architect".
- **Ozalid**: the print process that replaced the blueprint; every copy is made from one master drawing.
- **Modela**: "model", the thing the compiler makes.
- **Irida**: from iris, the rainbow; one light split into many colours.
- **Fanfold**: one sheet that folds out into many pages.
- **Blueform**: the blueprint and its form.
- **Disegno**: the Renaissance idea of design as the one drawing that painting, sculpture and building all come from.
- **Forman**: today's name, kept, with a scope that reads better than `@formants`.

## Scores

Each out of 5: short to type, says what it does, available (npm scope, plain package, GitHub, domain), unique (no
clashing tool or product), and sounds right spoken and heard.

| Name | Type | Says it | Available | Unique | Spoken | Total |
|---|---|---|---|---|---|---|
| **Fanfold** | 3 (7 letters) | 4 | 5 | 5 | 5 | **22** |
| **Ozalid** | 4 (6) | 3 | 5 | 5 | 4 | **21** |
| **Ortho** | 5 (5) | 5 | 3 | 3 | 4 | **20** |
| **Trazo** | 5 (5) | 3 | 4 | 5 | 3 (heard as "traso") | **20** |
| **Blueform** | 2 (8) | 4 | 5 | 4 | 5 | **20** |
| Modela | 4 (6) | 3 (the same word as "the model" inside it) | 3 | 3 | 4 | 17 |
| Irida | 5 (5) | 3 | 4 | 3 | 2 (eye-REE-da or ih-REE-da) | 17 |
| Disegno | 3 (7) | 4 | 3 | 4 | 2 (the silent g) | 16 |
| Tekt | 5 (4) | 3 | 4 | 2 | 1 (heard as "tech" or "text") | 15 |
| Forman | 4 (6) | 2 | 3 | 2 | 3 (heard as "foreman") | 14 |

## The shortlist

| # | Name | Command | Front door and packages | Blueprint | Available | Clashes seen |
|---|---|---|---|---|---|---|
| 1 | **Fanfold** (recommended) | `fanfold` | `fanfold` (plain package free), `@fanfold/auth`, `@fanfold/host-cloudflare` | kept | npm scope ✅ plain ✅ GitHub `fanfold-dev` ✅ (bare `fanfold` ❌, empty org) `.dev` and `.sh` no NS | none |
| 2 | **Ortho** | `ortho` | `@ortho/core` (plain `ortho` taken), `@ortho/auth`, `@ortho/host-cloudflare` | kept | npm scope ✅ plain ❌ GitHub `orthojs` ✅ (bare, `-dev`, `hq` ❌) `.dev` for sale | Orthogonal's CLI package `ortho` |
| 3 | **Ozalid** | `ozalid` | `ozalid`, `@ozalid/auth`, `@ozalid/host-cloudflare` | kept | npm scope ✅ plain ✅ GitHub `ozalid-dev` ✅ `.dev` and `.sh` no NS | an old, lapsed trademark |
| 4 | **Trazo** | `trazo` | `trazo`, `@trazo/auth`, `@trazo/host-cloudflare` | kept | npm scope ✅ plain ✅ GitHub `trazo-dev` ✅ `.dev` ❌ `.sh` no NS | none |
| 5 | **Blueform** | `blueform` | `blueform`, `@blueform/auth`, `@blueform/host-cloudflare` | kept | npm scope ✅ plain ✅ GitHub `blueform-dev` ✅ `.dev` and `.sh` no NS | none |

**Recommendation: Fanfold.** It is the only name free in every place checked except the bare GitHub handle, nothing
in software uses it, and it cannot be misheard or misspelled from speech. It says the thing Forman is for in one
picture: you write one blueprint and everything folds out of it. Its one cost is length; if `fanfold` is too long to
type all day, a short alias such as `ff` or `fan` can ship alongside it. If the shortest command wins, take Ortho and
the GitHub org `orthojs`.

## What happens after Aaron picks

1. Aaron creates the npm org and the GitHub org for the name he picks (and a domain, if he wants one).
2. A rename slice records the call in `design/decisions/`, adds the old name to the lint rule that forbids old names
   (`packages/lint/src/modules/rules/internal/old-names.ts`), and sweeps the repository. Today `formants` appears 914
   times in 540 files and `forman` as a whole word about 1,400 times in 521 files, so the sweep is mechanical and
   the lint rule proves it is complete.
3. Availability can change at any moment; recheck the chosen name's npm scope just before creating the org.

## Round two: Orthograph, and Open Harness as the org (18 November 2026)

Aaron asked what orthographic means, whether **Orthograph** works, and whether the framework could live under his
**Open Harness** organization, for example as "Open Harness Blueprint". He is optimizing for a good npm name and a
short command. Checked the same way as above:

| Name | npm scope | Plain npm package | GitHub | Domains | Seen on the web |
|---|---|---|---|---|---|
| orthograph | free | free | `orthograph` org taken (OrthoGraph, 2013, 0 repos); `orthograph-dev`, `orthographhq` free | `orthograph.dev`, `.com` registered; `.sh` no NS | OrthoGraph, a Hungarian floor plan and building survey app (iPad, Android, BIM export), sold since 2004 |
| orthographic | free | not checked | not checked | not checked | |
| open-harness | taken: `@open-harness/vitest` and others, maintained by npm user `pythonpete32` | | `Open-Harness` org exists (4 repos); Aaron's GitHub account is a member | | |
| openharness | taken: `@openharness/core`, "Building blocks for capable, general-purpose agents", by another maintainer (`MaxGfeller/open-harness`) | free | `openharness` org taken (2026, 0 repos) | `.dev`, `.sh`, `.com` all registered | |
| oharness | taken: `@oharness/engine` | taken: `oharness` 0.19.3, "a model-agnostic AI coding agent", published 17 November 2026 | free | `.dev`, `.com` registered | |

What follows from it:

- **Orthograph as the name, `ortho` as the command.** The product name and the scope can be long; the command is
  what gets typed. `@orthograph/core`, `@orthograph/auth`, `@orthograph/host-cloudflare`, and a binary called
  `ortho`. The plain npm package `ortho` is someone else's, but its binary is `orth`, and nothing called `ortho` is
  on this machine or in Homebrew, so the command itself is clear. The risk is OrthoGraph the floor plan app: a
  different field, but an architecture product with the same name.
- **Under Open Harness.** The GitHub org `Open-Harness` already holds Aaron's work. The npm scope `@open-harness`
  exists and is held by `pythonpete32`; if that account is Aaron's, the packages could be
  `@open-harness/blueprint`, `@open-harness/blueprint-auth` and so on, with a short command of its own. Two near
  neighbours are other people's agent projects: `@openharness` (no hyphen) and `oharness`, which makes the name easy
  to confuse in the agent space.
