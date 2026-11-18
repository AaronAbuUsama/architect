// Planted fixture: the real spend declaration with its budget loosened from 150 to 300 millis. Install over
// blueprint/things/allowance/verbs/spend.ts.
import { Blueprint } from "orthograph";
import { Allowance } from "../thing.ts";
import { machine } from "../machine.ts";
import { grantee } from "../roles.ts";
import { AllowanceExceeded } from "../errors.ts";
import { Amount, Memo } from "../../../values/money.ts";

export default Blueprint.operation(Allowance, {
  description: "Spend from what is left of this month's allowance.",
  payload: { allowance: Allowance.fields.id, amount: Amount, memo: Memo },
  answer: { remaining: Amount },
  move: machine.moves.spend,
  errors: [AllowanceExceeded],
  allowed: [grantee],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  idempotent: "request", // retried with the same request key, it spends once
  budget: { p95: "300 millis" },
});
