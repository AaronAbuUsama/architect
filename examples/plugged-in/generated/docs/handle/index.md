<!-- Generated from the blueprint. Do not edit. -->
# handle

A public name, claimed once, that is the address of a public page.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| name | HandleName |

## Machine

States: claimed. A move from the wrong state is refused HandleNotClaimed (exit 11).

| move | from | to | emits |
|---|---|---|---|
| claim | (creates) | claimed | HandleClaimed |

## Operations

- [handle.claim](claim.md): Claim a free name and make it the address of a public page, with its profile.
