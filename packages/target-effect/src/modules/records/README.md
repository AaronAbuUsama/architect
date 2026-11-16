# records

`Records.find(thing, id)`: a stored instance, decoded, with its state. Role checks load the thing a payload points at
through it, and reads (L1.23) answer from it. The host provides it (`host-cloudflare`'s D1 records for things that
live in the database); `recordsMemory` holds rows in memory for tests.
