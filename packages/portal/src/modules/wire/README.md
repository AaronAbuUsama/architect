# wire

The portal's data contract (F1 §1, D3 #130): one versioned JSON document, `generated/portal/blueprint.json`, made from the
compiler's model and the generated docs, which the app reads instead of any project source.

`Wire.build` is pure and deterministic (no clock, no revision: a bundle names its own revision), sets the digest and records
`Compare.dependsOn` for every operation. `Wire.decode` accepts a blueprint only when its schema version is 1, it fits the schema
and its digest is its content's; an unknown version or a changed byte is a `BlueprintRejected` with the reason. `Wire.core`,
`dependsOn` and `hashOf` work out what a proof rests on from a model's JSON alone, so the portal can judge a proof against a
model the logbook holds without importing the compiler; generators' test keeps them equal to `Compare` on current and historical
models. Unknown extension keys are ignored; a model shape it cannot judge is `ModelUnsupported`, never a guess.
