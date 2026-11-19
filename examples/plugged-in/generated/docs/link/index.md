<!-- Generated from the blueprint. Do not edit. -->
# link

A title and web address on a public page.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| profile | profile.id |
| title | LinkTitle |
| url | LinkUrl |

## Machine

States: listed, removed. A move from the wrong state is refused LinkNotListed (exit 31).

| move | from | to | emits |
|---|---|---|---|
| add | (creates) | listed | LinkAdded |
| remove | listed | removed | LinkRemoved |

## Operations

- [link.add](add.md): Append a link to the public page of a claimed name.
- [link.order](order.md): Move a link to a zero-based position. A position past the end puts it last.
- [link.remove](remove.md): Remove a link from a public page.
