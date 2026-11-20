<!-- Generated from the blueprint. Do not edit. -->
# profile.get

Read a claimed name's public page and its links in display order.

**Who may call:** anyone.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| handle | handle.name | A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. |

## Answer

| field | value | description |
|---|---|---|
| handle | handle.name | A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. |
| links | schema |  |

## Steps

- `profile.get.load` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ProfileNotFound | 20 | PR-001 | declared in errors.ts |

## How to call

```sh
plugged-in profile get --handle <handle>
```

HTTP: `POST /profile/get` with the payload as JSON. SDK: `Sdk.profile.get(payload)`.
