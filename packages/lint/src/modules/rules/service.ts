import type { Plugin } from "./types.ts";
import { noNameAsString } from "./internal/names.ts";
import { declaredErrorsOnly, refusalHasLog } from "./internal/refusals.ts";
import { handlerMatchesPath, noWallClock } from "./internal/place.ts";
import { noOldNames } from "./internal/old-names.ts";
import { requiredStepUsed } from "./internal/steps.ts";

/** The oxlint plugin. `ortho check` registers it by path and passes every rule the same `ProjectFacts`. */
export const plugin: Plugin = {
  meta: { name: "ortho" },
  rules: {
    "no-name-as-string": noNameAsString,
    "refusal-has-log": refusalHasLog,
    "declared-errors-only": declaredErrorsOnly,
    "no-wall-clock": noWallClock,
    "handler-matches-path": handlerMatchesPath,
    "no-old-names": noOldNames,
    "required-step-used": requiredStepUsed,
  },
};
