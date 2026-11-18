# The portal's design (M1.25)

Draft, in progress with Aaron. The full design is written once rounds 1 and 2 are answered.

## Aaron's answers

### Round 1 (18 November 2026, by speech, relayed by the conductor)

- **Q1, the chat: A.** "We are defo using Pi Durable for the portal's chat. We are going to make our own thing on top of
  Pi Durable that can automatically connect into any function and use the application, whatever it is you're building.
  But in the portal we are going to have a customised set of agents for building the application." So the chat's
  surface is Pi Durable, with our own layer on top that reaches every action. The building agents (the factory) are
  designed in their own 📐 thread; this design covers the chat surface and its place in the portal only.
- **Q8, HeroUI Pro: neither A nor B.** "We're using it privately anyway, so it's no problem for now. If it ever does
  become a problem, we'll just clean-room the components that we need." So the portal is HeroUI Pro only, with no free
  face. **Fallback, recorded:** if Pro's licence ever blocks distribution, we clean-room the components the portal uses
  into our own package; the page contract stays as it is, so only the face changes.
- **Q2 to Q7:** open, put back in round 2.

## Inputs from other threads

### The factory thread (K10), 18 November 2026: what an extension must carry

Its needs, relayed by the conductor, and how the extension contract (round 2, Q11 option A) carries each one:

| Need | Carried by | New in the contract |
|---|---|---|
| a. Its own nav section and pages: Agents (roster), Runs (a list, and one run live with its transcript, tool cards and spend), Workspaces (files diff, `check` and `prove` output, preview link), Experiments (start, keep, throw away) | Each page belongs to a thing: Agent, Run, Workspace, Experiment. Each gets its generated pages, plus a `sidebar` group and `views` slots. Experiment's start, keep and throw away are moves on its lifecycle | `views.one`, a view of one instance (round 2 only had list views) |
| b. Every button is a generated action | Q9 option A: a slot component gets only generated actions and declared reads, with no store handle and no fetch | A lint rule in the portal package (proposed) |
| c. An agent picker in the composer; a chat thread is one Run; the rail shows a running Run beside the thing it touches | Run is the `@orthograph/agents` thing that the Pi Durable drawer renders, so the portal feature owns no thread of its own | `chat.addressees`, `rail.on(thing, …)` |
| d. A run's screen context includes its workspace (branch, revision) | The face adds to M1.24's screen context | `context: (page) => ({ … })` |

**Gap:** "beside the thing it touches" needs a field that can point to any thing, a declaration name plus an id.
`FieldModel` today only refers to one named thing (`packages/compiler/src/modules/model/types.ts:15`). It goes to
M1.01 or M1.03 with `from: { kind, mount }` (Q3).
