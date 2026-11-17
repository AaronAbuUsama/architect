import { Blueprint } from "@formants/forman";
import { Allowance } from "../thing.ts";
import { machine } from "../machine.ts";
import { AllowanceLimitTooHigh } from "../errors.ts";
import { owner } from "../../organization/roles.ts";

export default Blueprint.operation(Allowance, {
  description: "Let a member spend from the organisation, up to a limit each month.",
  payload: { organization: Allowance.fields.organization, member: Allowance.fields.member, limit: Allowance.fields.limit },
  answer: { allowance: Allowance.fields.id },
  move: machine.moves.grant,
  errors: [AllowanceLimitTooHigh],
  allowed: [owner.of("organization")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request", // the same request twice grants once
  budget: { p95: "200 millis" },
});
