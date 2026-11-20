<!-- Generated from the blueprint. Do not edit. -->
# handle.claim

Claim a free name and make it the address of your public page, with its profile.

**Who may call:** anyone signed in.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| name | handle.name | A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. |

## Answer

| field | value | description |
|---|---|---|
| handle | handle.id | The handle's own id. |

## Move

`claim`: from nothing (it creates) to claimed, emitting HandleClaimed.

## Steps

- `handle.claim.load` (database)
- `handle.claim.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| HandleTaken | 10 | HN-001 | declared in errors.ts |
| HandleAlreadyOwned | 12 | HN-002 | declared in errors.ts |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
plugged-in handle claim --name <name>
```

HTTP: `POST /handle/claim` with the payload as JSON. SDK: `Sdk.handle.claim(payload)`.
