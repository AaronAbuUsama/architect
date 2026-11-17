import type { Plugin } from "./types.ts";
import { noNameAsString } from "./internal/names.ts";
import { declaredErrorsOnly, refusalHasLog } from "./internal/refusals.ts";
import { handlerMatchesPath, noWallClock } from "./internal/place.ts";

/** The oxlint plugin. `forman check` registers it by path and passes every rule the same `ProjectFacts`. */
export const plugin: Plugin = {
  meta: { name: "forman" },
  rules: {
    "no-name-as-string": noNameAsString,
    "refusal-has-log": refusalHasLog,
    "declared-errors-only": declaredErrorsOnly,
    "no-wall-clock": noWallClock,
    "handler-matches-path": handlerMatchesPath,
  },
};
