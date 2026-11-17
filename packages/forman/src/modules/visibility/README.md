# visibility

Owns `Blueprint.visibility.secret`, `.private` and `.public`: who may see a field's value. A value and a field both
carry a `visibility`, `public` unless a blueprint says otherwise; `secret` and `private(roles)` are marked in the
blueprint, never guessed from a field's name.

Invariants: marking returns a copy of the same kind (the original is untouched), so a marked value is still a value and
a marked field is still the thing's field, with its `of`, `key` and `from`. Only a `public` field's value may be a span
attribute, a log line, a journal field or evidence; the runtime, prove and the Collector all read it from here (through
the compiler's model).

Test: `visibility.test.ts`.
