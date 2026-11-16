<!-- Generated from the blueprint. Do not edit. -->
# allowance.grant

Let a member spend from the organisation, up to a limit each month.

**Who may call:** the owner of its organization.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| organization | allowance.organization |
| member | allowance.member |
| limit | allowance.limit |

## Answer

| field | value |
|---|---|
| allowance | allowance.id |

## Move

`grant`: from nothing (it creates) to active, emitting AllowanceGranted.

## Steps

- `allowance.grant.insert` (database)

## Refusals

| refusal | exit | when |
|---|---|---|
| AllowanceLimitTooHigh | 44 | declared in errors.ts, carrying cap |
| NotAllowed | 3 | the caller isn't the owner of its organization; the handler never runs |

## How to call

```sh
acme allowance grant --organization <organization> --member <member> --limit <limit>
```

HTTP: `POST /allowance/grant` with the payload as JSON. SDK: `Sdk.allowance.grant(payload)`.
