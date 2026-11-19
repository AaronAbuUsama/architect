import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";
import { HandleTaken } from "../errors.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Handle, {
  description: "Claim a free name and make it the address of a public page, with its profile.",
  payload: { name: Handle.fields.name },
  answer: { handle: Handle.fields.id },
  move: machine.moves.claim,
  errors: [HandleTaken],
  allowed: [Blueprint.anyone],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  idempotent: "request", // the same request twice claims once
  budget: { p95: "150 millis" },
});
