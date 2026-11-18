<!-- Generated from the blueprint. Do not edit. -->
# profile.get

Read a claimed name's public profile and its links in display order.

**Who may call:** anyone.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| handle | handle.name |

## Answer

| field | value |
|---|---|
| handle | handle.name |
| links | schema |

## Steps

- `profile.get.load` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ProfileNotFound | 6 | PR-001 | declared in errors.ts |

## How to call

```sh
links profile get --handle <handle>
```

HTTP: `POST /profile/get` with the payload as JSON. SDK: `Sdk.profile.get(payload)`.
