<!-- Generated from the blueprint. Do not edit. -->
# person.sign-up

Sign up with an email address and a password.

**Who may call:** anyone.

**Budget:** p95 400ms.

## Payload

| field | value |
|---|---|
| email | person.email |
| password | Password (secret) |
| name | person.name |

## Answer

| field | value |
|---|---|
| person | person.id |

## Steps

- `person.sign-up.create` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| PersonEmailTaken | 11 | PE-001 | declared in errors.ts |

## How to call

```sh
work person sign-up --email <email> --password <password> --name <name>
```

HTTP: `POST /person/sign-up` with the payload as JSON. SDK: `Sdk.person.sign-up(payload)`.
