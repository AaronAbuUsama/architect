# records

`RecordsD1.layer(tables)`: `Records` over D1. A table per thing (named by the generated server from the thing's
path), a column per field holding its wire form, plus `state` for a thing with a machine. Rows decode and encode
through the thing's own schema, so a 128-bit amount round-trips exactly. A failing query dies (D2 item 14).
