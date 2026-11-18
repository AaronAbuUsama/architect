<!-- Generated from the blueprint. Do not edit. -->
# handle.release

Free your name and take its public profile offline.

**Who may call:** the handleOwner of the handle.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| handle | handle.id |

## Answer

(none)

## Move

`release`: from claimed to released, emitting HandleReleased.

## Steps

- `handle.release.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| HandleNotClaimed | 5 | HN-900 | the handle is in a state release can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the handleOwner of the handle; the handler never runs |

## How to call

```sh
starter handle release --handle <handle>
```

HTTP: `POST /handle/release` with the payload as JSON. SDK: `Sdk.handle.release(payload)`.
