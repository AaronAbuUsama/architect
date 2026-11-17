<!-- Generated from the blueprint. Do not edit. -->
# allowance.get

Read one allowance by its id: organization, member, limit, spent, state.

**Who may call:** the grantee of the allowance, or the owner of its organization.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | allowance.id |

## Answer

| field | value |
|---|---|
| organization | allowance.organization |
| member | allowance.member |
| limit | allowance.limit |
| spent | allowance.spent |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the grantee of the allowance, or the owner of its organization; the handler never runs |

## How to call

```sh
acme allowance get --id <id>
```

HTTP: `POST /allowance/get` with the payload as JSON. SDK: `Sdk.allowance.get(payload)`.
