<!-- Generated from the blueprint. Do not edit. -->
# link.add

Append a link to your own public page. You need a claimed name first.

**Who may call:** anyone signed in.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| title | link.title | What the link shows on the page, up to 120 characters. |
| url | link.url | Where the link goes: a web address starting with http:// or https://, up to 2048 characters. |

## Answer

| field | value | description |
|---|---|---|
| link | link.id | The link's own id. |

## Move

`add`: from nothing (it creates) to listed, emitting LinkAdded.

## Steps

- `link.add.load` (database)
- `link.add.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| LinkNeedsHandle | 30 | LN-001 | declared in errors.ts |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
plugged-in link add --title <title> --url <url>
```

HTTP: `POST /link/add` with the payload as JSON. SDK: `Sdk.link.add(payload)`.
