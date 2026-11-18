<!-- Generated from the blueprint. Do not edit. -->
# link.remove

Remove one of your links from your public profile.

**Who may call:** the linkOwner of the link.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| link | link.id |

## Answer

(none)

## Move

`remove`: from listed to removed, emitting LinkRemoved.

## Steps

- `link.remove.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| LinkNotListed | 5 | LI-900 | the link is in a state remove can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the linkOwner of the link; the handler never runs |

## How to call

```sh
links link remove --link <link>
```

HTTP: `POST /link/remove` with the payload as JSON. SDK: `Sdk.link.remove(payload)`.
