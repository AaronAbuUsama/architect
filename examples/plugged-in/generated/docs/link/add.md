<!-- Generated from the blueprint. Do not edit. -->
# link.add

Append a link to the public page of a claimed name.

**Who may call:** anyone.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| handle | handle.name |
| title | link.title |
| url | link.url |

## Answer

| field | value |
|---|---|
| link | link.id |

## Move

`add`: from nothing (it creates) to listed, emitting LinkAdded.

## Steps

- `link.add.load` (database)
- `link.add.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| LinkNeedsHandle | 30 | LN-001 | declared in errors.ts |

## How to call

```sh
plugged-in link add --handle <handle> --title <title> --url <url>
```

HTTP: `POST /link/add` with the payload as JSON. SDK: `Sdk.link.add(payload)`.
