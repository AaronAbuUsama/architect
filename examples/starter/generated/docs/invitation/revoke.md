<!-- Generated from the blueprint. Do not edit. -->
# invitation.revoke

Withdraw an invitation that hasn't been accepted.

**Who may call:** the owner of its invitation.organization.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| invitation | invitation.id |

## Answer

(none)

## Move

`revoke`: from pending to revoked, emitting InvitationRevoked.

## Steps

- `invitation.revoke.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| InvitationNotPending | 40 | IN-900 | the invitation is in a state revoke can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its invitation.organization; the handler never runs |

## How to call

```sh
starter invitation revoke --invitation <invitation>
```

HTTP: `POST /invitation/revoke` with the payload as JSON. SDK: `Sdk.invitation.revoke(payload)`.
