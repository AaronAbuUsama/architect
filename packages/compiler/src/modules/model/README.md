# model

Builds the model, the one description every generator reads, from a loaded blueprint.

- Names come from paths and exports: `things/<thing>/verbs/<verb>.ts` is operation `<thing>.<verb>`; an error is named by
  its exported class; a step by its key, as `<thing>.<verb>.<key>`.
- References are resolved: a field taken from another thing's field carries `ref`, a named value carries `named`.
- Each thing and operation carries a `hash` of its canonical JSON (sorted keys), so reformatting a file never changes
  it and renaming a file does.
- A blueprint that breaks the layout fails with `BlueprintInvalid`, listing every problem, never the first only.
- Stores (K3): `blueprint/stores/<name>.ts` is store `<name>`; a thing that names one carries `store`, a feature's own
  are `<mount>-<name>`. The kinds a host supplies are `STORE_KINDS` (`internal/stores.ts`). An operation whose `move`
  and steps write to more than one store is refused with the operation, its file and what writes where. An
  environment's `stores:` may bind only declared database stores. A project with no store has none in its model.
  Tests: `stores.test.ts`; `vault.test.ts` runs the real fixture feature beside acme.
