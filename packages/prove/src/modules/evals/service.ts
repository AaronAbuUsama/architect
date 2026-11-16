import type { EvalsApi, PerOperation } from "./types.ts";
import { answerShape, declaredErrors, events, explainability, machinePath, steps, whoMayCall } from "./internal/calls.ts";
import { coverage, coverageSummary, performance } from "./internal/run.ts";
import { gather } from "./internal/evidence.ts";

/** The nine evals, in their numbered order, run for every operation. */
const PER_OPERATION: ReadonlyArray<PerOperation> = [answerShape, declaredErrors, machinePath, events, whoMayCall, steps, performance, coverage, explainability];

export const Evals: EvalsApi = {
  gather,
  judge: (project, evidence) => [
    ...Object.values(project.model.operations).flatMap((op) => {
      const mine = evidence.filter((e) => e.call.operation === op.name);
      return PER_OPERATION.map((ev) => ev(op, mine, { project, all: evidence }));
    }),
    coverageSummary(project.model, evidence),
  ],
};
