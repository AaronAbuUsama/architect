<!-- Generated from the blueprint. Do not edit. -->
# handle

A public name that belongs to one person until they release it, and is the address of a public page.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| name | HandleName |
| owner | id |

## Machine

States: claimed, released. A move from the wrong state is refused HandleNotClaimed (exit 11).

| move | from | to | emits |
|---|---|---|---|
| claim | (creates) | claimed | HandleClaimed |
| release | claimed | released | HandleReleased |

## Events

- `HandleClaimed`: carries handle (handle.id), name (handle.name); emitted by the move claim
- `HandleReleased`: carries handle (handle.id), name (handle.name); emitted by the move release

## Unique

- name: unique while claimed
- owner: unique while claimed

## Roles

- handleOwner

## Operations

- [handle.claim](claim.md): Claim a free name and make it the address of your public page, with its profile.
- [handle.release](release.md): Free your name and take its public page offline. Anyone may claim the name afterwards.
- [handle.resolve](resolve.md): Find the handle that holds a claimed name. A released or unclaimed name has none.
