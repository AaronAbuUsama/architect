<!-- Generated from the blueprint. Do not edit. -->
# handle.claim

Claim a free name and make it the address of a public page, with its profile.

**Who may call:** anyone.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| name | handle.name |

## Answer

| field | value |
|---|---|
| handle | handle.id |

## Move

`claim`: from nothing (it creates) to claimed, emitting HandleClaimed.

## Steps

- `handle.claim.load` (database)
- `handle.claim.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| HandleTaken | 10 | HN-001 | declared in errors.ts |

## How to call

```sh
plugged-in handle claim --name <name>
```

HTTP: `POST /handle/claim` with the payload as JSON. SDK: `Sdk.handle.claim(payload)`.
