<!-- Generated from the blueprint. Do not edit. -->
# session.sign-in

Sign in with email and password. The token is the bearer for every later call.

**Who may call:** anyone.

**Budget:** p95 400ms.

## Payload

| field | value |
|---|---|
| email | person.email |
| password | Password |

## Answer

| field | value |
|---|---|
| session | session.id |
| token | Secret |

## Steps

- `session.sign-in.verify` (database)

## Refusals

| refusal | exit | when |
|---|---|---|
| SessionCredentialsWrong | 10 | declared in errors.ts |

## How to call

```sh
acme session sign-in --email <email> --password <password>
```

HTTP: `POST /session/sign-in` with the payload as JSON. SDK: `Sdk.session.sign-in(payload)`.
