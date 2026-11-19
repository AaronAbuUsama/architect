import { Blueprint } from "orthograph";

// G4 (S-04): `name` is unique while a handle is `claimed`; a released handle keeps its name and frees it.
// THE ONE LINE A BUILDER MAY CHANGE is the `unique:` line, to whatever spelling G4's builder settles on
// (`Blueprint.unique(...)` in place of the property, say). The checks pin behaviour, never the spelling.
export const Handle = Blueprint.thing({
  description: "A name someone holds for as long as they keep it.",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }) },
  unique: { name: { while: ["claimed"] } },
});
