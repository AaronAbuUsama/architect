# wire

`Wire.refusals(classes)`: a handler fails with the blueprint's error classes, and the API declares generated
`Schema.TaggedError` classes with their HTTP status. This maps one to the other by name, keeping the fields. Anything
not declared dies, so the caller sees a 500 and the trace a defect, never an undeclared refusal (D2 item 14).
