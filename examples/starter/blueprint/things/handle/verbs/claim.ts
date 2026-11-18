import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";
import { HandleTaken, HandleAlreadyOwned } from "../errors.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Handle, {
  description: "Claim a free name and make it the address of your public profile.",
  payload: { name: Handle.fields.name },
  answer: { handle: Handle.fields.id },
  move: machine.moves.claim,
  errors: [HandleTaken, HandleAlreadyOwned],
  allowed: [Blueprint.signedIn],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
