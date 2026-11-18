<!-- Generated from the blueprint. Do not edit. -->
# handle

A public name that belongs to one person until they release it.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| name | HandleName |
| owner | person.id |

## Machine

States: claimed, released. A move from the wrong state is refused HandleNotClaimed (exit 5).

| move | from | to | emits |
|---|---|---|---|
| claim | (creates) | claimed | HandleClaimed |
| release | claimed | released | HandleReleased |

## Roles

- handleOwner

## Operations

- [handle.claim](claim.md): Claim a free name and make it the address of your public profile.
- [handle.release](release.md): Free your name and take its public profile offline.
- [handle.resolve](resolve.md): Find the handle for a claimed name.
