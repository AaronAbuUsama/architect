# Goal 4: the snag log

Every snag Goal 4 hits, in the shape the goal file gives (`04-on-chain.md`, "The five roles") and `03-snags.md` uses.
The user (the DX trial) writes one whenever it is stuck on something it can't fix inside `examples/budgets/src/`, and
moves on; it never works around the framework. Snags found by the journey author, the checks author, a builder or a 🔍
reviewer are logged the same way, with "Hit" naming who hit them. A framework builder takes each, check first.

Status is one of `open`, `building` (with its pull request), `fixed` (with the change), or `parked` (with an owner and a
reason). The done check (`nx run e2e:on-chain`) passes only when every entry is `fixed` or `parked`.

Numbers are this log's own, from S-01; they never refer to Goal 3's log.
