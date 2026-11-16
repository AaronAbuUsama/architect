import { Blueprint } from "@architect/blueprint";
import { Amount } from "../../values/money.ts";

export class AllowanceLimitTooHigh extends Blueprint.error({ cap: Amount }, { exit: 44 }) {}
