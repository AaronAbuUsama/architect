# acme with kits mounted: a sketch (PROPOSED)

**Everything here is proposed** by `design/decisions/K1-kits.md`. None of it compiles today; nothing imports it. It
shows what acme looks like once the auth, wallets, payments and email kits are mounted: the folders, the files that
change, and what each target gets.

## The folders

Files marked ✎ are in this sketch. Unmarked files are acme's today (`examples/acme` on `origin/layer/3`), unchanged.

```text
acme/
  architect.config.ts                       ✎ `auth` is gone: sign-in is a kit now
  package.json                                + @architect/kit-auth, kit-wallets, kit-payments, kit-email, pinned exactly
  blueprint/
    kits/
      auth.ts                               ✎ Blueprint.use(auth, { choices })
      wallets.ts                            ✎ Blueprint.use(wallets, { choices, narrow })
      payments.ts                           ✎ Blueprint.use(payments, { narrow })
      email.ts                              ✎ Blueprint.use(email, {})
    environments/
      local.ts                              ✎ identity: auth.identity.test
      test.ts                                 the same change as local.ts
      staging.ts                              identity: auth.identity({ via: [...] }) and the kits' secrets
      production.ts                         ✎ identity: auth.identity({ via: [...] }) and the kits' secrets
    things/
      allowance/ …                            unchanged
      organization/verbs/refund.ts          ✎ new: acme's own op over the payments kit's Payments.refund
      invitation/verbs/send.ts              ✎ a mail step: Blueprint.step.dependency(Mail.send)
      api-key/ …                              stays acme's (it needs acme's `owner` role); its handler calls Accounts.createApiKey
      person/, session/                       removed: they are the auth kit's things now
      membership/, organization/, system/     unchanged
    journeys/                                 acme's journeys, moved here from the root journeys/ folder
    starting-worlds/                          unchanged
  src/
    invitation/send.ts                      ✎ sends the email through the step
    organization/refund.ts                    scaffolded by generate: "Yours from now on."
    person/, session/                         removed: the kit's handlers are in the kit
  generated/                                  see below
```

## What each target gets

Reach is worked out from `runs` and `allowed` (section 1.4 of the record). "Every way in" is session, key, device and
agent. Production issues all four.

| Operation or piece | From | Runs | Reach | server | SDK | CLI | MCP |
|---|---|---|---|---|---|---|---|
| `allowance.grant · spend · revoke · get` | acme | server | every way in | ✔ | ✔ | ✔ | ✔ |
| `organization.create · get`, `invitation.send · accept · revoke`, `membership.get`, `api-key.create` | acme | server | every way in | ✔ | ✔ | ✔ | ✔ |
| `organization.refund` | acme | server | session only | ✔ | ✔ | · | · |
| `person.sign-up`, `session.sign-in` | auth | server | anyone | ✔ | ✔ | ✔ | ✔ |
| `session.show` | auth | server | every way in | ✔ | ✔ | ✔ | ✔ |
| `/api/auth/*`, `/device`, `/login`, `/consent` | auth | server | inbound | ✔ | · | · | · |
| `Principals`, the world's cast | auth | runtime piece | | ✔ | · | · | · |
| `wallet.create · import · keys` | wallets | client | anyone | · | ✔ local code | ✔ in the CLI process | · |
| `wallet.link` | wallets | client | not agent | · | ✔ local code + 2 calls | ✔ | · |
| `wallet.challenge · complete · unlink` | wallets | server | not agent | ✔ | ✔ | ✔ | · |
| `wallet.list` | wallets | server | narrowed by acme: session, device, agent | ✔ | ✔ | ✔ | ✔ |
| `checkout.start` | payments | server | narrowed by acme: session, device | ✔ | ✔ | ✔ | · |
| `checkout.get` | payments | server | every way in (payer) | ✔ | ✔ | ✔ | ✔ |
| `/stripe` | payments | server | inbound (HMAC) | ✔ | · | · | · |
| `Payments.refund` | payments | dependency | | ✔ | · | · | · |
| `Mail.send` | email | dependency | | ✔ | · | · | · |
| `/resend` | email | server | inbound (Svix signature) | ✔ | · | · | · |

Docs and the portal get every row, each marked with where it runs, who may reach it, and which kit it came from.

## What generate writes

```text
generated/
  model/model.json, edges.json     every declaration, acme's and the kits', each kit one with `from-kit` and its version;
                                   new edges: runs-in, uses-dependency, calls, inbound-moves, from-kit
  api/src/<thing>/<verb>.ts        acme's and the kits' declarations (kits' imported from their /blueprint entry)
  api/src/dependencies/<mount>/*.ts   the dependency tags handlers yield (Mail, Payments, Accounts)
  server/main.ts                   acme's routes, the kits' server ops and inbound entries, Principals from kit-auth,
                                   implementations from each kit's /worker entry; one Worker
  server/wrangler.jsonc            + each kit's tables, actors and secret names
  sdk/src/wallet/create.ts         local code: imports kit-wallets' client entry (node or browser); no HTTP
  sdk/src/wallet/link.ts           local code with two HTTP calls (challenge, complete) and one Signer step
  sdk/src/…                        every op whose reach admits session or key
  cli/src/main.ts                  every op whose reach admits device or key: `acme wallet create`, `acme checkout start`
  mcp/src/index.ts                 every server op whose reach admits agent: no wallet.create, link, challenge,
                                   complete; no checkout.start (narrowed); no organization.refund
  docs/, portal/blueprint.json     everything, with runs, reach and kit
```

## The builder's commands, in order

```bash
architect add kit @architect/kit-auth          # in a new project, `pnpm create architect` has done this already
architect add kit @architect/kit-wallets
architect add kit @architect/kit-payments
architect add kit @architect/kit-email
architect generate
architect check                                 # names any clash, missing secret or environment mismatch
architect prove --env local                     # acme's journeys and every kit's, in acme's worlds
architect model --surfaces --env production     # the table above
```
