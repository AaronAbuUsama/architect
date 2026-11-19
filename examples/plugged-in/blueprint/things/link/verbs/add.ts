import { Blueprint } from "orthograph";
import { Link } from "../thing.ts";
import { Handle } from "../../handle/thing.ts";
import { LinkNeedsHandle } from "../errors.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Link, {
  description: "Append a link to the public page of a claimed name.",
  payload: { handle: Handle.fields.name, title: Link.fields.title, url: Link.fields.url },
  answer: { link: Link.fields.id },
  move: machine.moves.add,
  errors: [LinkNeedsHandle],
  allowed: [Blueprint.anyone],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
