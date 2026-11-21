import { Blueprint } from "orthograph";
import budgets from "../../stores/budgets.ts";
import { Amount } from "../../values/money.ts";

export const Allowance = Blueprint.thing({
  description: "Money a member may spend from a Safe, up to a limit.",
  fields: {
    id: Blueprint.id("alw"),
    safe: Blueprint.account(), // the Safe the money is spent from; it grants and revokes, by its owners
    member: Blueprint.account(), // who may spend: the wallet that signs the spend
    token: Blueprint.account(), // the token contract that is paid
    limit: Amount,
    spent: Amount,
  },
  lives: budgets,
});
