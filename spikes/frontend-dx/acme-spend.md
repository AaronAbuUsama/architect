<!-- Generated from the blueprint. Do not edit. -->
# allowance.spend

Spend from what is left of this month's allowance.

**Who may call:** the grantee of the allowance.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| allowance | allowance.id |
| amount | Amount |
| memo | Memo |

## Answer

| field | value |
|---|---|
| remaining | Amount |

## Move

`spend`: from active to active or exhausted, emitting AllowanceSpent.

## Steps

- `allowance.spend.load` (database)
- `allowance.spend.record` (database)

## Refusals

| refusal | exit | when |
|---|---|---|
| AllowanceExceeded | 41 | declared in errors.ts, carrying remaining |
| AllowanceNotActive | 40 | the allowance is in a state spend can't start from; carries `state` |
| NotAllowed | 3 | the caller isn't the grantee of the allowance; the handler never runs |

## How to call

```sh
acme allowance spend --allowance <allowance> --amount <amount> --memo <memo>
```

HTTP: `POST /allowance/spend` with the payload as JSON. SDK: `Sdk.allowance.spend(payload)`.
