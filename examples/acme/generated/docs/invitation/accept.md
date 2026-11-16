<!-- Generated from the blueprint. Do not edit. -->
# invitation.accept

Accept an invitation and become a member of its organisation.

**Who may call:** the invitee of the invitation.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| invitation | invitation.id |

## Answer

| field | value |
|---|---|
| organization | invitation.organization |
| membership | membership.id |

## Move

`accept`: from pending to accepted, emitting InvitationAccepted.

## Steps

- `invitation.accept.join` (database)

## Refusals

| refusal | exit | when |
|---|---|---|
| InvitationNotPending | 40 | the invitation is in a state accept can't start from; carries `state` |
| NotAllowed | 3 | the caller isn't the invitee of the invitation; the handler never runs |

## How to call

```sh
acme invitation accept --invitation <invitation>
```

HTTP: `POST /invitation/accept` with the payload as JSON. SDK: `Sdk.invitation.accept(payload)`.
