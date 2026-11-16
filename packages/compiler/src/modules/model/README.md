# model

Builds the model, the one description every generator reads, from a loaded blueprint.

- Names come from paths and exports: `things/<thing>/verbs/<verb>.ts` is operation `<thing>.<verb>`; an error is named by
  its exported class; a step by its key, as `<thing>.<verb>.<key>`.
- References are resolved: a field taken from another thing's field carries `ref`, a named value carries `named`.
- Each thing and operation carries a `hash` of its canonical JSON (sorted keys), so reformatting a file never changes
  it and renaming a file does.
- A blueprint that breaks the layout fails with `BlueprintInvalid`, listing every problem, never the first only.
