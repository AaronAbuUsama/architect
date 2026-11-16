<!-- Generated from the blueprint. Do not edit. -->
# organization

A company whose owner hands out allowances, up to a cap each.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| name | text |
| owner | person.id |
| cap | Amount |

## Roles

- owner

## Operations

- [organization.create](create.md): Start an organisation. Whoever creates it owns it.
