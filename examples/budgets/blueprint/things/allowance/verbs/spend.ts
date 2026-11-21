import { Blueprint } from "orthograph";
import { Allowance } from "../thing.ts";
import { machine } from "../machine.ts";
import { grantee } from "../roles.ts";
import { AllowanceExceeded } from "../errors.ts";
import { Amount } from "../../../values/money.ts";
import { Recipient } from "../../../values/accounts.ts";

export default Blueprint.operation(Allowance, {
  description: "Spend from what is left of the allowance: the Safe pays the token to the recipient.",
  payload: { allowance: Allowance.fields.id, amount: Amount, to: Recipient },
  answer: { remaining: Amount }, // a field of AllowanceSpent (M6-chain item 7)
  move: machine.moves.spend,
  errors: [AllowanceExceeded],
  allowed: [grantee],
  budget: { p95: "5 seconds" },
});
