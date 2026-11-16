<!-- Generated from the blueprint. Do not edit. -->
# api-key.create

Create an API key in an organisation. The key itself is shown once.

**Who may call:** the owner of its organization.

**Budget:** p95 250ms.

## Payload

| field | value |
|---|---|
| organization | api-key.organization |
| name | api-key.name |

## Answer

| field | value |
|---|---|
| apiKey | api-key.id |
| key | Secret |

## Steps

- `api-key.create.issue` (database)
- `api-key.create.insert` (database)

## Refusals

| refusal | exit | when |
|---|---|---|
| NotAllowed | 3 | the caller isn't the owner of its organization; the handler never runs |

## How to call

```sh
starter api-key create --organization <organization> --name <name>
```

HTTP: `POST /api-key/create` with the payload as JSON. SDK: `Sdk.api-key.create(payload)`.
