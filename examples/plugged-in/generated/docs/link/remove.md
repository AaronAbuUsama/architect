<!-- Generated from the blueprint. Do not edit. -->
# link.remove

Remove a link from a public page.

**Who may call:** anyone.

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
| LinkNotListed | 31 | LN-900 | the link is in a state remove can't start from; carries `state` |

## How to call

```sh
plugged-in link remove --link <link>
```

HTTP: `POST /link/remove` with the payload as JSON. SDK: `Sdk.link.remove(payload)`.
