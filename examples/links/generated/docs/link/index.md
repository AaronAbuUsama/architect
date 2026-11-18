<!-- Generated from the blueprint. Do not edit. -->
# link

A title and web address on a person's public profile.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| owner | person.id |
| title | LinkTitle |
| url | LinkUrl |

## Machine

States: listed, removed. A move from the wrong state is refused LinkNotListed (exit 5).

| move | from | to | emits |
|---|---|---|---|
| add | (creates) | listed | LinkAdded |
| remove | listed | removed | LinkRemoved |

## Roles

- linkOwner

## Operations

- [link.add](add.md): Append a link to your public profile.
- [link.order](order.md): Move a link to a zero-based position. A position past the end puts it last.
- [link.remove](remove.md): Remove one of your links from your public profile.
