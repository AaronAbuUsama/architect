<!-- Generated from the blueprint. Do not edit. -->
# organization.create

Start an organisation. Whoever creates it owns it.

**Who may call:** anyone signed in.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| name | organization.name |
| cap | organization.cap |

## Answer

| field | value |
|---|---|
| organization | organization.id |

## Steps

- `organization.create.insert` (database)

## Refusals

| refusal | exit | when |
|---|---|---|
| NotAllowed | 3 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
acme organization create --name <name> --cap <cap>
```

HTTP: `POST /organization/create` with the payload as JSON. SDK: `Sdk.organization.create(payload)`.
