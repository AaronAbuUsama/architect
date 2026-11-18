# Journeys and planted fixtures (starter)

Written by the journey author, not the builder. The builder never edits these files, the evals or the runner's generic checks.

## Files

- `blueprint/starting-worlds/founded.ts`: ada (`owner`) runs `organization.create({ name: "Acme Demo" })`; it gives `organization`.
- `blueprint/starting-worlds/invited.ts`: from `founded`, ada runs `invitation.send` to olga's email; gives `organization` and `invitation`.
- `journeys/*.ts`: five journeys, listed below. Journey name is the file name with spaces ("health is up" in `health-is-up.ts`), as in acme.
- `test/fixtures/journeys/<name>/`: one planted break each, with its own README (what it replaces, what it breaks, which step must fail).

## Cast and runtime rules these journeys are written to

- A cast member whose role is not `Blueprint.anyone` is signed up through Better Auth before the journey and calls with their own bearer token (`person`, `email`, `password`).
- A `Blueprint.anyone` member gets a fresh `email` and `password`, no account and no token; their `person` ref is never used here.
- `s.last` in a payload is the answer of the latest call that answered 200; a refused call leaves it alone. In a check, `s.last` is the step's own answer. Journeys that chain ids rely on this.
- Sessions from `session.sign-in` are not used by later steps.

## health is up

| # | Call | Expected |
|---|---|---|
| 1 | visitor (anyone) `system.health` | `status` is "ok"; no events; span `system.health` |

## sign up and sign in

| # | Call | Expected |
|---|---|---|
| 1 | newcomer (anyone) `session.show` | refused `NotAllowed`; no events; span `session.show` absent |
| 2 | newcomer `person.sign-up` (own email, password, "Newcomer") | `person` is `per_...`; spans `person.sign-up`, `.create` |
| 3 | newcomer `person.sign-up` again, same email | refused `PersonEmailTaken`; no events |
| 4 | newcomer `session.sign-in` with a wrong password | refused `SessionCredentialsWrong`; no events; span `session.sign-in` |
| 5 | newcomer `session.sign-in` with the right password | `session` is `ses_...`; `token` non-empty; spans `session.sign-in`, `.verify` |

## invite and accept (from `founded`; ada owner, olga and bob signed in)

| # | Call | Expected |
|---|---|---|
| 1 | ada `session.show` | `person` is ada's person, `email` is ada's email; no events |
| 2 | ada `organization.get` | name "Acme Demo", owner ada, state "active"; organization is in `active` |
| 3 | bob `invitation.send` to olga's email | refused `NotAllowed`; no events; spans `invitation.send`, `.insert` absent |
| 4 | ada `invitation.send` to olga's email | `invitation` is `inv_...`; `InvitationSent { invitation, email: olga's }`; invitation `pending`; spans `invitation.send`, `.insert` |
| 5 | bob `invitation.accept` (olga's) | refused `NotAllowed`; no events; still `pending`; spans `invitation.accept`, `.join` absent |
| 6 | olga `invitation.accept` | `organization` is ada's; `membership` is `mem_...`; `InvitationAccepted { membership }`; spans `invitation.accept`, `.join` |
| 7 | bob `membership.get` (olga's) | refused `NotAllowed` |
| 8 | olga `membership.get` | organization ada's, person olga, role "member"; no events |
| 9 | ada `invitation.send` to bob's email | `inv_...`; `InvitationSent`; `pending` |
| 10 | olga `invitation.revoke` (the second) | refused `NotAllowed`; no events; spans `invitation.revoke`, `.update` absent |
| 11 | ada `invitation.revoke` | `InvitationRevoked`; spans `invitation.revoke`, `.update` |

## an invitation is used once (from `invited`; ada owner, olga signed in)

| # | Call | Expected |
|---|---|---|
| 1 | olga `invitation.accept` the world's invitation | organization ada's, `mem_...`; `InvitationAccepted { invitation, membership }`; invitation `accepted`; spans `accept`, `.join` |
| 2 | olga `invitation.accept` again | refused `InvitationNotPending` (`machine.notFrom`, `{ state: "accepted" }`); no events; still `accepted`; `.join` absent |
| 3 | ada `invitation.revoke` the accepted one | refused `InvitationNotPending` `{ state: "accepted" }`; no events; `.update` absent |

This journey exists because `invite and accept` cannot accept twice: after a successful accept `s.last` no longer holds the invitation id, and there is no other way to name an earlier step's answer. The `invited` world gives the id.

## an owner makes an api key (from `founded`; ada owner, bob signed in)

| # | Call | Expected |
|---|---|---|
| 1 | bob `api-key.create` in ada's organisation | refused `NotAllowed`; no events; spans `api-key.create`, `.issue`, `.insert` absent |
| 2 | ada `api-key.create` "ci" | `apiKey` is `key_...`; `key` non-empty; spans `api-key.create`, `.issue`, `.insert` |
| 3 | bob `organization.create` "Bob Co" | `org_...`; `OrganizationCreated { organization, owner: bob }`; organization `active`; spans `organization.create`, `.insert`, `.owner` |
| 4 | ada `organization.get` bob's | refused `NotAllowed` |
| 5 | bob `api-key.create` in his own organisation | `key_...`, non-empty `key` |

## Coverage this gives

| Operation | Called by | Move / outcome | Declared errors refused |
|---|---|---|---|
| `system.health` | health is up | none | none declared |
| `person.sign-up` | sign up and sign in | none | `PersonEmailTaken` (step 3) |
| `session.sign-in` | sign up and sign in | none | `SessionCredentialsWrong` (step 4) |
| `session.show` | sign up and sign in (refused), invite and accept (answered) | none | `NotAllowed` |
| `organization.create` | `founded` world, an owner makes an api key | `create`, `active` | `NotAllowed` is the runtime's, not required |
| `organization.get` | invite and accept, an owner makes an api key | read | `NotAllowed` |
| `invitation.send` | `invited` world, invite and accept | `send`, `pending` | `NotAllowed` |
| `invitation.accept` | invite and accept, an invitation is used once | `accept`, `accepted` | `InvitationNotPending`, `NotAllowed` |
| `invitation.revoke` | invite and accept | `revoke`, `revoked` | `InvitationNotPending` (once-used journey), `NotAllowed` |
| `membership.get` | invite and accept | read | `NotAllowed` |
| `api-key.create` | an owner makes an api key | none | `NotAllowed` |

All 11 operations, all four moves (`organization.create`, `send`, `accept`, `revoke`), all four outcome states (`active`, `pending`, `accepted`, `revoked`), and both declared errors are covered.

## Fixtures

| Fixture | Replaces | Break | Must fail |
|---|---|---|---|
| `wrong-password-signs-in` | `session/sign-in.ts` | any password signs in | sign up and sign in, step 4 |
| `accept-without-membership` | `invitation/accept.ts` | accepts, never writes the membership | invite and accept, step 8 |
| `owner-step-skipped` | `organization/create.ts` | declared `owner` step never run | steps eval for `organization.create`; an owner makes an api key, step 3 |

## Formats I chose where the docs were silent

- **Calls.** `s.<actor>.run(declaration, payload)`, never an operation name as a string, as in acme. Reads (`organization.get`, `membership.get`) are run with `{ id }`.
- **`s.<actor>.email` / `.password`** are refs, resolved at run time; used as payload values and in `emits(InvitationSent, { email: s.olga.email })`.
- **Refusing the machine.** `InvitationNotPending` is written `refuses(machine.notFrom, { state: "accepted" })`, as acme does, not by the generated class.
- **Hidden handlers.** A call refused before the handler has no operation span, so I assert `spans({ absent: [...] })` for the operation and its declared steps.
- **Refused calls and `s.last`.** The runner sets `last` only on a 200; steps 5 and 7 of `invite and accept` and step 4 of `an owner makes an api key` depend on that. If a read does not update `last` the same way as an operation, nothing here depends on it: no step uses `s.last` after a successful read.
- **Revocation.** The revoke step checks `emits(InvitationRevoked, {})` and spans only: the answer is `{}`, so `s.last` cannot name the invitation, and `machine.isIn` is not asserted. The `revoked` outcome is still reached (the runner reads the stored state of the move's subject).
- **No request keys.** `organization.create` is `idempotent: "request"`; neither the world nor the journey passes one, as acme's `founded` does. If the runtime demands a key, the builder should default one per call rather than edit these.
- **`invited` world.** Not in the brief; added for the accepted state and the second accept (see above). Its cast gives olga `Blueprint.signedIn`.
- **Member vs invitee.** olga is `Blueprint.signedIn`; she is the invitee because her email matches, and a member after accepting. `member` has no role of its own in the blueprint.
- **Names.** Second invitation goes to bob's email, which is only a convenient second address; bob never accepts it.

## Not verified

`tsc -p examples/starter/tsconfig.json --noEmit` currently fails for reasons outside these files: `generated/sdk/src/session/sign-in.ts` emits `client.session.sign-in(...)` (a hyphen is not a property name), and `blueprint/things/system/thing.ts` has `fields: {}` where `Blueprint.thing` wants an `id`. With those two excluded, the journeys and starting worlds type-check clean.
