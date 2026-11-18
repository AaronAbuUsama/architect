<!-- Generated from the blueprint. Do not edit. -->
# link.add

Append a link to your public profile.

**Who may call:** anyone signed in.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
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
| LinkNeedsHandle | 4 | LI-001 | declared in errors.ts |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
starter link add --title <title> --url <url>
```

HTTP: `POST /link/add` with the payload as JSON. SDK: `Sdk.link.add(payload)`.
