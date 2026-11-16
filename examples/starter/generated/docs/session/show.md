<!-- Generated from the blueprint. Do not edit. -->
# session.show

Who is signed in.

**Who may call:** anyone signed in.

**Budget:** p95 100ms.

## Payload

(none)

## Answer

| field | value |
|---|---|
| person | person.id |
| email | person.email |

## Refusals

| refusal | exit | when |
|---|---|---|
| NotAllowed | 3 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
starter session show
```

HTTP: `POST /session/show` with the payload as JSON. SDK: `Sdk.session.show(payload)`.
