# @formants/compiler

Reads a project's `blueprint/` by path and builds the model: `Compiler.model`, an Effect that needs a `BlueprintSource`
and fails with `BlueprintInvalid` or `SourceError`. Never runs in production. Modules: `source` (where files come from)
and `model` (what they mean).
