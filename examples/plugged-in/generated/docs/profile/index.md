<!-- Generated from the blueprint. Do not edit. -->
# profile

A claimed name's public page, with its links in the order they were put.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id | The page's own id. |
| handle | handle.id | The handle the page belongs to. |
| links | schema | The ids of the page's links, in the order they show. |

## Unique

- handle: unique in every state

## Operations

- [profile.get](get.md): Read a claimed name's public page and its links in display order.
