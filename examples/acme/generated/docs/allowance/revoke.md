<!-- Generated from the blueprint. Do not edit. -->
# allowance.revoke

Stop an allowance. Nothing more can be spent from it.

**Who may call:** the owner of its allowance.organization.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| allowance | allowance.id |

## Answer

(none)

## Move

`revoke`: from active or exhausted to revoked, emitting AllowanceRevoked.

## Steps

- `allowance.revoke.update` (database)

## Refusals

| refusal | exit | when |
|---|---|---|
| AllowanceNotActive | 40 | the allowance is in a state revoke can't start from; carries `state` |
| NotAllowed | 3 | the caller isn't the owner of its allowance.organization; the handler never runs |

## How to call

```sh
acme allowance revoke --allowance <allowance>
```

HTTP: `POST /allowance/revoke` with the payload as JSON. SDK: `Sdk.allowance.revoke(payload)`.
