import { Blueprint } from "@formants/forman";
import { Allowance } from "./thing.ts";
import { Amount, Memo } from "../../values/money.ts";

export const AllowanceGranted = Blueprint.event({ allowance: Allowance.fields.id, limit: Amount });
export const AllowanceSpent = Blueprint.event({ allowance: Allowance.fields.id, amount: Amount, memo: Memo, remaining: Amount });
export const AllowanceRevoked = Blueprint.event({ allowance: Allowance.fields.id });
