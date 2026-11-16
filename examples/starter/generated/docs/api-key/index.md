<!-- Generated from the blueprint. Do not edit. -->
# api-key

A key an agent or a service calls with, on behalf of whoever created it. Better Auth keeps its hash.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| organization | organization.id |
| name | text |
| createdBy | person.id |

## Operations

- [api-key.create](create.md): Create an API key in an organisation. The key itself is shown once.
