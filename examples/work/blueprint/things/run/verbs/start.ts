import { Blueprint } from "@architect/blueprint";
import { Run } from "../thing.ts";
import { machine } from "../machine.ts";
import { RunAgentCannot, RunOverBudget, RunTaskClaimed } from "../errors.ts";
import { owner } from "../../mission/roles.ts";

export default Blueprint.operation(Run, {
  description: "Start an agent on one task. The run claims the task until it ends.",
  payload: { mission: Run.fields.mission, task: Run.fields.task, agent: Run.fields.agent, model: Run.fields.model, budget: Run.fields.budget },
  answer: { run: Run.fields.id },
  move: machine.moves.start,
  errors: [RunOverBudget, RunAgentCannot, RunTaskClaimed],
  allowed: [owner.of("mission")],
  steps: { claim: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "250 millis" },
});
