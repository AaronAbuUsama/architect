<!-- Generated from the blueprint. Do not edit. -->
# organization.create

Found an organisation with its cap. Whoever founds it owns it, and is its first member.

**Who may call:** anyone signed in.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 250ms.

## Payload

| field | value |
|---|---|
| name | organization.name |
| cap | organization.cap |

## Answer

| field | value |
|---|---|
| organization | organization.id |

## Move

`create`: from nothing (it creates) to active, emitting OrganizationCreated.

## Steps

- `organization.create.insert` (database)
- `organization.create.owner` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
acme organization create --name <name> --cap <cap>
```

HTTP: `POST /organization/create` with the payload as JSON. SDK: `Sdk.organization.create(payload)`.
