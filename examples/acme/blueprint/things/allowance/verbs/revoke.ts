import { Blueprint } from "orthograph";
import { Allowance } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../organization/roles.ts";

export default Blueprint.operation(Allowance, {
  description: "Stop an allowance. Nothing more can be spent from it.",
  payload: { allowance: Allowance.fields.id },
  answer: {},
  move: machine.moves.revoke,
  allowed: [owner.of("allowance.organization")],
  steps: { update: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
