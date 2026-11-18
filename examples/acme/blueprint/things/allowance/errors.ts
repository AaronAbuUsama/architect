import { Blueprint } from "orthograph";
import { Amount } from "../../values/money.ts";

// Refusals that depend on data. The machine's own refusal, AllowanceNotActive, is generated and never written here.
export class AllowanceExceeded extends Blueprint.error({ remaining: Amount }, { exit: 41 }) {}
export class AllowanceNotFound extends Blueprint.error({}, { exit: 43 }) {}
export class AllowanceLimitTooHigh extends Blueprint.error({ cap: Amount }, { exit: 44 }) {}
