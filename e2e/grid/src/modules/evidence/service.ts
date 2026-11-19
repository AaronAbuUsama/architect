import { RefusalEvals } from "../refusal-evals/service.ts";
import type { EvidenceApi } from "./types.ts";

/** An operation's generated docs page: `generated/docs/<thing>/<verb>.md`. */
const docsPath = (thing: string, verb: string) => `generated/docs/${thing}/${verb}.md`;

export const Evidence: EvidenceApi = {
  ofRefusal: async ({ model, refusal, ports }) => {
    const operations = RefusalEvals.declaredBy(model, refusal);
    const pairs = await Promise.all(operations.map(async (name) => {
      const op = model.operations[name]!;
      return [name, await ports.read(docsPath(op.thing, op.verb)), await ports.portal(`/portal/operations/${name}`)] as const;
    }));
    const observed = await ports.observed(refusal);
    return {
      model,
      docs: Object.fromEntries(pairs.map(([name, page]) => [name, page])),
      portal: Object.fromEntries(pairs.map(([name, , html]) => [name, html])),
      spans: await ports.spans(),
      cli: observed?.cli,
      mcp: observed?.mcp,
    };
  },
};
