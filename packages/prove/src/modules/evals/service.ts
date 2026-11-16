import type { EvalsApi, PerOperation } from "./types.ts";
import { answerShape, declaredErrors, events, explainability, machinePath, steps, whoMayCall } from "./internal/calls.ts";
import { coverage, performance } from "./internal/run.ts";
import { gather } from "./internal/evidence.ts";

/** The per-operation evals, in their numbered order; coverage (8) runs once over everything. */
const PER_OPERATION: ReadonlyArray<PerOperation> = [answerShape, declaredErrors, machinePath, events, whoMayCall, steps, performance, explainability];

export const Evals: EvalsApi = {
  gather,
  judge: (project, evidence) => [
    ...Object.values(project.model.operations).flatMap((op) => {
      const mine = evidence.filter((e) => e.call.operation === op.name);
      return PER_OPERATION.map((ev) => ev(op, mine, project));
    }),
    coverage(project.model, evidence),
  ],
};
