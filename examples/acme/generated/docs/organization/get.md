<!-- Generated from the blueprint. Do not edit. -->
# organization.get

Read one organization by its id: name, owner, state.

**Who may call:** the owner of the organization.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | organization.id |

## Answer

| field | value |
|---|---|
| name | organization.name |
| owner | organization.owner |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of the organization; the handler never runs |

## How to call

```sh
acme organization get --id <id>
```

HTTP: `POST /organization/get` with the payload as JSON. SDK: `Sdk.organization.get(payload)`.
