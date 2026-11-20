<!-- Generated from the blueprint. Do not edit. -->
# handle.resolve

Find the handle that holds a claimed name. A released or unclaimed name has none.

**Who may call:** anyone.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| name | handle.name | A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. |

## Answer

| field | value | description |
|---|---|---|
| handle | handle.id | The handle's own id. |

## Steps

- `handle.resolve.load` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| HandleNotFound | 13 | HN-003 | declared in errors.ts |

## How to call

```sh
plugged-in handle resolve --name <name>
```

HTTP: `POST /handle/resolve` with the payload as JSON. SDK: `Sdk.handle.resolve(payload)`.
