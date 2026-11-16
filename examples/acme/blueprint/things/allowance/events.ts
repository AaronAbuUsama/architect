import { Blueprint } from "@architect/blueprint";
import { Allowance } from "./thing.ts";
import { Amount } from "../../values/money.ts";

export const AllowanceGranted = Blueprint.event({ allowance: Allowance.fields.id, limit: Amount });
