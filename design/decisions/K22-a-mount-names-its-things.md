# K22: an app can give a mounted thing its own name

**Status: proposed, waiting on Aaron's grill (20 November 2026).** Drafted by the 📐 Capxul language designer thread.
Grounded at `origin/goal/stage-1` `f109821d` and Capxul Next `50851875` (read only).

This decides only the language: what a blueprint author writes to call a plugin's thing by the app's word. Where the
core ends, the repository split and when code graduates to a plugin are draft PR #185's questions, not this one's; this
record depends on none of them, and they lean on it only in one way: a plugin pulled out of Capxul can keep a neutral
word without forcing Capxul to change its own.

## The problem, in code

A mount has four verbs, and none of them names anything:

```ts
// packages/orthograph/src/modules/plugins/service.ts:33-40
const view = {
  choices: plugin.choices,
  ...(calls ? { calls } : {}),
  choose: (option: Option) => verb({ verb: "choose", option }),
  include: (...items: ReadonlyArray<unknown>) => verb({ verb: "include", items }),
  narrow: (operation: never, spec: { readonly via: ReadonlyArray<never> }) => verb({ verb: "narrow", operation, via: Object.freeze([...spec.via]) }),
  omit: (operation: never) => verb({ verb: "omit", operation }),
};
```

The only naming a mount does is by its file's name, and it can only add a prefix:

```ts
// packages/compiler/src/modules/mounts/internal/fold.ts:8-12
export const renamed = (plugin: Layout, mount: string, pkg: string, version: string): ReadonlyArray<ThingFiles> =>
  [...plugin.things.values()].map((t) => {
    const from = { kind: "feature" as const, mount, package: pkg, version, thing: t.name };
    return { ...t, name: mount === ownName(pkg) ? t.name : `${mount}-${t.name}`, from };
  });
```

So the planned `@orthograph/organizations` plugin (M2.07) mounted as `organizations.ts` gives `organization`,
`organization.create`, `OrganizationNotFound`; mounted as `companies.ts` it gives `companies-organization`. Never
`company`. Capxul's word is company everywhere: its command is `capxul company create`
(`capxul-next .../company/verbs/create.ts:1`), its refusals name the company, and Foreman's test drive asked "Is
'company' the word?" (`design/foreman/test-drive-capxul.md` question 4, finding 9, branch `claude/foreman-c521e2`).
Plugged In meets the same wall at stage 3, where its organisations are "groups" (`/@group`, ST3.07, which needs M2.07).

This is Aaron's reason for building Capxul on Orthograph: its pieces (companies, members, invitations, budgets) should
become plugins other apps mount. If mounting one means taking its words, every app either speaks the plugin's language
or copies the plugin, and the copy is what plugins exist to end.

## What it touches

| Dependent | Why it cares |
|---|---|
| `orthograph` (a new `Blueprint.adopt`), `plugins/types.ts` | the app's file that names a mounted thing |
| `compiler` `mounts/internal/fold.ts`, `model/internal/layout.ts:141-161` | a thing folder whose `thing.ts` adopts a mounted thing; names derived from the thing follow the new name |
| `compiler` model `from` (`model/types.ts:10-12`) | the thing keeps its origin: `from: { mount, package, thing: "organization" }` while its name is `company` |
| generators and projections: API paths, SDK, CLI commands, MCP tools, docs, portal | every output names the thing by the app's word |
| `host-cloudflare` store | the table is named by the app's word, from the first migration |
| telemetry: span names `company.create`, refusal codes | the trace says what the app says |
| grid cells `mount.model`, `mount.sdk`, `mount.cli`, `mount.mcp`, `mount.docs`, `mount.portal`, `mount.telemetry` | each must show the app's word and the plugin it came from |
| M2.07 (organisations), ST3.07 (Plugged In's groups), M7 (Capxul on Orthograph) | the first three mounts that want another word |

## The options

**Today** — the word comes with the plugin, or a mount prefix in front of it:

```bash
$ capxul organization create --handle northwind     # mounted as organizations.ts
$ capxul companies-organization create ...          # mounted as companies.ts
```

**A · A path in the app names it, and what is named after it follows** (recommended)

```ts
// blueprint/features/organizations.ts: the mount, unchanged
export default Blueprint.use(organizations, (o) => [o.choose(o.choices.invite.owner)]);

// blueprint/things/company/thing.ts: the folder's name is the thing's name in this app
import { Blueprint } from "orthograph";
import { Organization } from "@orthograph/organizations/blueprint/things/organization/thing.ts";
import organizations from "../../features/organizations.ts";

export const Company = Blueprint.adopt(organizations, Organization);
```

```bash
$ capxul company create --handle northwind --name "Northwind Trading"
$ capxul membership list --company org_7f3k        # the plugin's field `organization` points at it, so it follows
✗ CompanyNotFound: no company org_7f3k              # generated refusals follow; refusal codes keep their prefix
```

What follows the new name, with no string written anywhere: the thing, its operations and reads (`company.create`),
the refusals generated from it (`CompanyNotFound`, `CompanyNotActive`), events and errors the plugin named with the
thing's name as their first word (`OrganizationFounded` becomes `CompanyFounded`), and any field of the plugin's things
whose key is the thing's name and which points at it (`membership.organization` becomes `membership.company`). What
stays the plugin's: other fields, other events and errors, roles (`owner`, `member`), id prefixes, refusal codes (as
the mount makes them today), and every other thing of the plugin until the app adopts it too. A name that would clash is a `check` error
naming both files, as today.

**B · A `rename` verb on the mount, with words**

```ts
export default Blueprint.use(organizations, (o) => [
  o.rename(o.things.organization, "company"),
  o.rename(o.things.membership.fields.organization, "company"),
  o.rename(o.events.OrganizationFounded, "CompanyFounded"),
]);
```

**C · Words for people only: labels**

```ts
export default Blueprint.use(organizations, (o) => [o.label(o.things.organization, { one: "company", many: "companies" })]);
// docs, portal and CLI help say "company"; the command, SDK and wire stay `organization`
```

```bash
$ capxul organization create --help
Found a company. ...
```

**D · The plugin hangs on the app's own thing (slots)**

```ts
// the plugin declares a slot instead of owning Organization; the app binds its own Company to it
export default Blueprint.use(organizations, (o) => [o.bind(o.slots.organization, Company)]);
// Company (fields, machine, create) is the app's; membership, invitation and the roles come from the plugin
```

### You do X → what happens

| Scenario | A · a path names it | B · `rename` verb | C · labels | D · slots |
|---|---|---|---|---|
| Capxul mounts organisations and calls it company | `capxul company create`; members point at `company` | the same, with each word written in the mount | `capxul organization create`, help says company | Capxul writes its own company; the plugin brings members and invitations |
| The plugin renames its field `organization` to `org` in its next release | the follow rule picks the new key or stops following; `check` says which | the app's string names a field that is gone: a `check` error | nothing visible changes | the slot's name changes; every binding is a `check` error |
| Plugged In mounts it as "group" | `blueprint/things/group/thing.ts` | `o.rename(..., "group")` | labels only | Plugged In writes its own group thing |
| A reader asks "where did company come from?" | the model's `from` says `@orthograph/organizations`, thing `organization`; the portal badges it | the same | the same | the plugin's slot |
| The rule "a declared name is never a string" | kept: the folder names it | broken: names written as strings in the mount | kept | kept |

### Rubric

| Axis | A · a path names it | B · `rename` verb | C · labels | D · slots |
|---|---|---|---|---|
| Floor-first | ✅ one call and one folder; `fold.ts` already renames, this gives it the word | ✅ similar size | ✅ smallest | ❌ a new kind of plugin: things that point at a thing they don't own |
| Reversibility | ✅ delete the folder and the plugin's word is back | ✅ | ✅ | ⚠️ a plugin written with slots can't simply go back |
| Blast radius | ⚠️ compiler layout and mounts, every generator's naming (they read names from the model, so mostly free) | ⚠️ the same | ✅ docs and portal only | ❌ compiler, plugins, runtime, every plugin author |
| Correctness | ✅ one source for the name; what follows is a fixed rule the compiler checks | ⚠️ each renamed word is a string that can name nothing | ❌ the app's code and wire still say the plugin's word | ✅ the app owns its central thing outright |
| Fit | ✅ names from paths, the rule every other name obeys (`naming.md`, K5) | ❌ breaks it | ⚠️ two names for one thing | ⚠️ the right shape for some plugins, later |

**Recommendation: A.** It gives the app its word everywhere a person or a client sees it, through the same rule every
other name follows, and it leaves the plugin unchanged. D is kept in `design/later.md` for a plugin that truly wraps
another app's thing, if extracting Capxul's budgets shows one.

## Supersedes

Filled in once Aaron answers.

## Aaron's answers

Waiting on the grill.
