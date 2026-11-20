# Spike: UI SDK in a real world

**Question.** Does a UI SDK primitive generated from Plugged In's blueprint carry a real operation end to end, through
Plugged In's real generated SDK into a running local world, in Chromium? And how does blueprint meaning map onto UI
SDK's agent marks?

**Answer.** Yes, if the generated form is reshaped. A person typing and pressing, and an agent in one `act`, both claim
a name through the real SDK in a real local world. A real journey replayed through the page passes prove's own checks,
step for step, the same as `ortho prove`. A refusal fails the agent's step with `HN-001`, and nothing is written. Three
of the four marks map cleanly. But a mark makes UI SDK hide or redact a whole component, so the form can't be one
primitive per verb as the first spike had it. Each field has to be UI SDK's own Input, and the verb keeps only `submit`.
The agent's source reaches the Worker's door, and the server drops it today.

Two more things came out of it. The send now goes through one small action module, shaped as M1.22's action. Neither
workaround from the first spike goes away behind it (section 9). And UI SDK carries a real product screen, not just
forms: a Notion-style Markdown editor, built only from UI SDK components with bundled fonts, works in Chromium for
a person and is visible to an agent (section 8).

It feeds K24 ("nothing in `packages/` depends on UI SDK until the second spike passes") and the question K24 left open:
whether a generated screens output belongs in stage 1.

## What was tried

- `fixtures/` holds the model input, cut from `origin/goal/stage-1` at `eaf7a10e`. `plugged-in.json` has the real
  `handle.claim`. `acme.json` has the real `session.sign-in`, with a secret payload field and two issued answer fields.
  `marks.json` has Plugged In's `handle.release` plus two **hypothetical** keys that nothing can declare today: a
  payload field private to `handleOwner`, and `needsApproval` (K5's planned word).
- `src/generate.ts` (182 lines) is #215's generator, reshaped. For each operation it writes two files. One is a verb
  primitive whose only agent action is `submit`; it keeps `pending`, `error`, `refusal`, `done`, and the answer as
  `value`. The other is a whole React form: UI SDK's `Field`, `FieldLabel`, `Input` and `FieldDescription` for each
  payload field, then the refusal, the answer and the submit button. The marks mapping is written in `MARKS`.
- `src/runtime.ts` (65 lines) is #215's shared helper, keeping the answer in state as `value`, and mapping the action's
  refusal into the state the bridge reads.
- `src/action.ts` (65 lines) is the one seam between a form and the app: an action in M1.22's shape (caller, payload,
  refusal, approval), with our `defineAction` owning approval. The generator writes `<op>.action.ts` for each operation,
  and each form takes an `action` instead of a send function.
- `page/editor/` is a Notion-style Markdown editor (section 8), built from UI SDK components only.
- `page/main.tsx` is the hand-written test harness. It wires the generated form to **Plugged In's real generated SDK**
  (`generated/sdk`: its Effect `HttpApiClient`, its payload schemas, its declared errors), bundled for the browser by
  esbuild.
- `src/harness.ts` starts the world the way `ortho prove` does: `Worlds.start` with a local OTLP collector, which means
  wrangler on real workerd, a fresh D1, the world Durable Object and a new auth secret. It also serves the page on one
  origin with every other path proxied to the world, recording each request at the world's door, and launches headless
  Chromium (Playwright 1.65.1).
- No cloud, no Docker, no keys, no spend. Cast tokens stay in memory: they go into the page before it loads and are
  never printed or written.

The goal code is never committed here. `npm run link -- <dir>` points `.goal` and `.plugged-in` (both gitignored) at a
detached checkout of `origin/goal/stage-1` that has had `pnpm install`.

Pinned: `@ui-sdk/core`, `@ui-sdk/react` and `@ui-sdk/web` at `0.1.0-beta.7`; React 19.3.1; Playwright 1.65.1
(13 November); esbuild 0.28.2; TypeScript 6.0.2. Effect 4.1.1 comes from the goal checkout, as Plugged In resolves it.

```bash
git worktree add --detach ../goal origin/goal/stage-1 && (cd ../goal && pnpm install)
npm install && npm run link -- ../goal
npm run generate   # writes generated/
npm run typecheck  # the generated code, the runtime and the generator
npm test           # builds the pages; 16 tests; writes evidence/
```

## What was found

Each number is a test in `test/`. The quoted output is in `evidence/`.

1. **A person claims a name in the real world.** Typing `firstpage` and pressing Claim shows
   `Handle: hdl_…`. The request reached the world as `POST /handle/claim`, 200,
   `"source": "person"` (the action's caller; UI SDK's own source was `mouse`). The journal for its trace holds `HandleClaimed`, and its spans include `handle.claim.record`.
   Afterwards, `handle.resolve` through the SDK from Node answers the same handle (`evidence/claim.md`, 1).

2. **The agent claims in one `act`, and the request says an agent made it.** The steps are `setValue` on the "Name"
   input, then `submit` on "Claim your name". `act` returns `ok: true`, and the snapshot then shows the verb's `value`
   as `{ "handle": "hdl_…" }`, so an agent can read what it got. **Where the source lands:** an `x-ortho-source: agent`
   header that reaches the Worker's door (the proxy records it). **It lands nowhere after that.** The journal entry
   (`operation`, `move`, `subject`, `event`, `fields`) and the root span's attributes (`principal.person`,
   `payload.name`, `answer.handle`, …) carry no source, and `Principal` is `{ kind, person, email }`. So a role can't
   check it today (`evidence/claim.md`, 2).
   - **The SDK has no place for it.** The generated client takes a credential and a request key, nothing per call. The
     page gives Effect's `FetchHttpClient.Fetch` a wrapped `fetch` for each call (`page/main.tsx`, `fetchAs`). That
     works, but it is a workaround.
   - **What a role could check, and what it can't.** If `Principals.of` read the header into the principal, as
     `via: "person" | "agent"`, then `allowed` could carry a built-in that refuses agents, and spans and the journal
     could record it. But the page sets that header itself: it is an honest page's word, not a guard. Any script holding
     the session token can leave it out. A real boundary needs the agent to hold its own credential. MCP already is one:
     its OAuth token marks every call as coming through the agent's door. So the page source is right for the record and
     for cooperative rules ("ask first", audit), and wrong for enforcement.

3. **Break: a taken name fails the agent's step with the declared code, and nothing is written.** Carol's agent tries
   `firstpage`. `act` returns `ok: false` with `submit on Claim your name (c4) failed: HandleTaken (HN-001)`. The page
   shows `Refused: HandleTaken (HN-001)`. The world answered 422. The journal for that trace is `[]`, the spans include
   `handle.claim.load` but no `handle.claim.record`, and `handle.resolve` answers the same handle before and after
   (`evidence/claim.md`, 3).

4. **A real journey's claim steps, sent through the page, come out the same as `ortho prove` says.** The journey is
   "a name is claimed once": five steps, four of them `handle.claim`, two with the journey's own request keys. First,
   `ortho prove --only` runs it its own way, over HTTP in its own world: 5/5 pass. Then the test replays it in another
   world. It uses prove's own loader, script and `runChecks` (expect, refuses, emits, noEvents, machine.isIn), plus the
   span checks from the collector. Each claim step is a person typing and pressing in Chromium, signed in as the step's
   actor, with the step's request key. The one resolve step goes over HTTP as prove does. Per step, the verdicts and
   failures are identical: all pass, none fail. The page showed `Handle: hdl_…` for the replayed request and
   `Refused: HandleTaken (HN-001)` for both refusals (`evidence/journey.md`).

5. **The marks mapping, each tried** (`evidence/marks.md`). What a blueprint can declare today:

   | Blueprint meaning | Declarable today? | Mark | What happened |
   |---|---|---|---|
   | Secret payload field (`Blueprint.visibility.secret`) | Yes: acme and starter `sign-in`'s `password` | `data-agent-secret` on its Field, plus `type="password"` | The agent fills it; the snapshot and `act` show `[redacted]`; the email beside it stays readable; the send carries the real value (5a) |
   | Issued answer (`Blueprint.issued`) | Yes: acme and starter `sign-in`'s `session` and `token` | `data-agent-secret` on the answer part | The person sees `Token: tok-…`; the agent's snapshot and `act` show the verb's value as `[redacted]` (5b) |
   | Private to a role (`Blueprint.visibility.private`) | In the language and the model (`{ "private": ["handleOwner"] }`), but no example uses it, and none on a payload | `data-agent-hidden` on its Field | Gone from the snapshot; `setValue` on it fails with `"Reason" isn't available to agents here. Ask the person.`; the verb stays listed and usable (5c) |
   | An approval | **No.** K5 plans `needsApproval`; nothing declares it | `data-agent-confirm="<description>"` on the submit | With no `allow`: `Needs a person: "Free your name and take its public page offline. …"`. A person saying no: `The person said no to …`. A person saying yes: sent, with `via: agent`. Nothing is sent before the yes (5d) |

   - **Break: a mark covers the whole component, not the part it sits on.** UI SDK works out `secret` and `offLimits`
     per component, from any of its parts (`registry.js`: `entry.secret ||= isSecret(elements)`,
     `entry.offLimits = isOffLimits(elements)`). So the issued answer, sitting on the verb's answer part, makes the
     whole verb secret, and its refusal reaches the agent as `submit on Sign in (c6) failed: [redacted]` (5b). The
     agent can't learn why sign-in failed. #215's one primitive per verb, with a setter per field, would hide or redact
     the whole form for one private or secret field. That is why fields are UI SDK Inputs here. (The #215 shape was read
     from the code, not run.)
   - **Private to a role is not quite "hidden".** The agent acts as the same person, who holds the role. Hiding the
     field stops the agent from helping with it at all. `data-agent-secret` (fill but never read) may be the truer
     mapping. This needs a decision, not more spiking.
   - A password-type input is secret in UI SDK without any mark (`registry.js` matches `type`/`autocomplete`), so the
     mark on it is belt and braces.

6. **Break: actions the blueprint didn't grant are refused before any request.**
   `handle-claim c4 takes no release now. It takes: submit.`; `… takes no setName now …`; `… has nothing to press now.`
   A name that fails `HandleName`'s check (`Not A Name!`) is refused by the real SDK's payload check, inside the page:
   `InvalidPayload`. In all four cases, 0 requests reached the world (`evidence/claim.md`, 6).

7. **`web.css` alone gives a usable styled form.** Usable, not good: Aaron looked at these screenshots and called them
   poor, which is fair. Section 8 is what UI SDK looks like with a real design on top. The only stylesheet on the page is `/main.css`, and every rule in it
   sits in web.css's own `@layer ui-sdk`. Four tokens (`--ui-primary`, `--ui-primary-foreground`, `--ui-radius`,
   `--ui-font-size`) restyle it, and an 8 px radius reached the input. Light and dark both work
   (`evidence/style-light.png`, `evidence/style-dark.png`). Two things web.css leaves to the app: the body's font and
   colours (three declarations, from its own tokens), and `--ui-primary-foreground`. Set only `--ui-primary` and dark
   mode shows dark text on the blue button.

8. **A Notion-style Markdown editor, built only from UI SDK components** (`page/editor/`, `test/editor.test.ts`,
   `evidence/editor-*.png`). Pages are a `Tree`. Each block is a `TriggerMenu` with its `TriggerMenuInput`: "/" opens the
   block menu at the caret, and typing narrows it. To-dos are `Checkbox`, the block handle is a `Menu` (turn into,
   duplicate, delete), the divider is `Separator`, and the Markdown panel is a `Toggle`. Markdown typed at the start of a
   line turns the block (`# `, `## `, `- `, `1. `, `[] `, `> `, ` ``` `, `---`), Enter splits a block and continues a
   list, and Backspace at the start joins blocks. The page writes itself out as Markdown, live.
   - **The test types a whole page as a person** and checks the exact Markdown that comes out: a heading picked from the
     slash menu (126 ms from "/" to the click), a list, a to-do, a quote. Ticking the to-do turns `- [ ]` into `- [x]`.
   - **Fonts render, from our own origin.** Inter Variable and JetBrains Mono Variable are bundled from fontsource
     (5.3.0, pinned). `document.fonts` reports both loaded; the title, body and code computed styles start with them,
     and the two woff2 requests answered 200 from `/fonts/` (112 KiB together).
   - **Break: a controlled textarea eats the "/".** UI SDK reads the native input event and re-renders synchronously,
     before React's `onChange` runs. With a controlled `value`, React puts the old text back, so the "/" disappears and
     the menu never opens. The fix is an uncontrolled textarea that the editor writes to only when the text changed from
     outside (`block-view.tsx`). A generated form with a TriggerMenu would hit the same thing.
   - **An agent sees the editor's controls, not its words.** The snapshot lists the page tree (with its titles), every
     button, menu and to-do, and each block's TriggerMenu by its label (`Heading 2`, `Bulleted list`). It doesn't show a
     block's text, because a TriggerMenu has no `value` for the bridge to read. An agent could restructure the page, but
     not read it. For an editor an agent should read, the document itself has to be a primitive with a `value`.
   - Size: 494 KiB minified (166 KiB gzipped) for the script, 73 KiB of CSS, plus the two fonts. No Effect here.

9. **The action seam: neither workaround goes away** (the Conductor's question). The form now sends through
   `action.run(payload, { caller, approved })`, generated as `<op>.action.ts` (15 lines each) from the same model. All
   16 tests pass through it, including the real journey (proof 4).
   - **`dispatch` and `settle` stay.** UI SDK gives a change's source (`agent`, `mouse`, `keyboard`) only to callbacks,
     never to the primitive's api. The action needs that source to fill `ctx.caller`, so the send still has to leave
     through an `onSend` callback, and the callback still needs `settle` to hand the call back. The action replaces
     only what used to sit behind it: the page's send function.
   - **`pending` and `error` stay.** They are how the agent bridge knows a step has finished and whether it failed. An
     `ActionRefusal` is a value the bridge has never heard of, so the runtime still maps it into `error`, now as
     `"<details.name> (<errorCode>)"`. That mapping is a three-line function in one place, `runtime.ts`.
   - **What the seam did change.** Approval moved into `defineAction`, out of the page. The form always passes
     `approved: true`, because reaching `run` means a person pressed it, or the bridge's `allow` already asked one
     (`data-agent-confirm`). 5d now proves the action never asks twice (`asked` stays 0 after the bridge's yes), and
     that a host which never asked, such as an MCP tool call, is asked by the action itself, once. The caller is only
     `person` or `agent` now. `mouse` against `keyboard` stops at the form, which is all a role should see.
   - So the three layers fit: the blueprint's action is the spine, the generated form is bound to one action, and UI
     SDK is the widgets underneath. Both workarounds are adapters between UI SDK and the action, and each lives in one
     shared file, not in generated code.

Also found along the way:

- **An `ortho dev` world keys the journal by a trace the caller never sees.** With no collector, the journal's `trace`
  is not the `traceparent` the caller sent, nor the `x-trace-id` it got back, so "nothing was written" can't be read
  back by trace. `ortho prove` attaches a collector, and there it works. The harness starts worlds the way prove does.
- **The real SDK costs most of the page's weight.** Minified, the page is 892 KiB (293 KiB gzipped): Effect 573 KiB,
  React 217 KiB, UI SDK 73 KiB, Plugged In's generated SDK, API and blueprint 10 KiB, `orthograph` 8 KiB, and the
  generated forms 6 KiB.
- **The blueprint has no words for a person.** Labels come from keys: `Name`, `Sign-in session`, `Sign-in`. Descriptions
  read well as field help. The confirm sentence comes from the operation's description, which reads as a statement, not
  a question.

## Measurements

| What | Value |
|---|---|
| Generated, `handle.claim` | primitive 65 lines, React form 30 lines |
| Generated, `session.sign-in` and `handle.release` | 69 + 34 and 69 + 36 lines |
| Generated action, each operation | 15 lines |
| Generator, shared helper, action seam | 182, 65 and 65 lines (harness 110, test page 124) |
| Editor (`page/editor/`) | 9 + 82 + 136 + 179 lines of TypeScript, 141 of CSS |
| Type errors in the generated code | 0 |
| `npm test`: build, then 16 tests in Chromium | 26.4 s wall (build 0.4 s; 3 worlds started, one of them by prove) |
| A world ready (`Worlds.start` to `/_world/health`) | 3.3 to 5.5 s, 3 runs |
| `POST /handle/claim` at the world's door, 3 runs | first claim 75 to 120 ms (cold), then 21 to 35 ms; refusal 17 to 19 ms |
| One agent `act` (fill, send through the SDK, settle), seen from the test | 62 to 108 ms, 3 runs |
| `ortho prove --only "a name is claimed once"` | 5.8 s, its own world |

## The decision it supports

Build the screens output in stage 1, onto UI SDK, generated as whole forms:

- A verb is a generated form. Each payload field is UI SDK's `Field` and `Input`, with the field's description as its
  help text. The verb itself is a primitive whose only agent action is `submit`. Its state is `pending`, `error`
  (which the bridge reads), `refusal`, `done`, and the answer as `value`.
- The send goes through the app's generated SDK, so its payload check, its request key and its declared errors are the
  page's too. Proof 4 shows a page step and a direct call pass the same journey checks.
- The marks come from the blueprint: secret field to `data-agent-secret`, issued answer to `data-agent-secret`, private
  to `data-agent-hidden` (or secret, to be decided), approval to `data-agent-confirm`, once an approval can be
  declared.
- The page's source travels to the server, and is recorded there (principal, span, journal) as a fact about the call.
  It is not a guard: an agent that must be kept out is kept out by its own credential.

## Open risks

- **Nothing declares an approval,** and nobody uses private visibility. Both mappings were tried on hypothetical
  declarations. An approval needs a language decision (K5's `needsApproval`) before a generator can rely on it.
- **The source is a header that the page sets and the server ignores.** To use it, the generated SDK needs a per-call
  source option, and `Principals` needs to record it. That is a language and runtime change, not a screens one.
- **Redaction is per component.** An issued answer hides the verb's refusals from the agent. Showing the answer in its
  own component (outside the verb's parts) would avoid that. Not tried.
- **The `pending` and `error` convention, and `value` as the answer,** are read from the bridge's code
  (`agent.js` `settle` and `describe`), not documented API, in a beta that ships about once a day.
- **Effect in the browser** is 573 KiB minified. A screens output may want a lighter client for the page, generated
  from the same API.
- **An agent can't read an editor's text** through UI SDK's TriggerMenu. A document an agent should read needs its own
  primitive with a `value`.
- **Controlled inputs fight UI SDK's synchronous updates** (section 8). Generated forms use UI SDK's own `Input`, which
  is fine; any hand-written field around a TriggerMenu must be uncontrolled.
- **Not tried:** custom elements (#215 showed them), Vue, Svelte and Solid; reads and lists; a field referring to
  another thing; server rendering; Better Auth's real sign-in from the page (the cast's tokens were used); more than
  one form for the same verb on one page.
