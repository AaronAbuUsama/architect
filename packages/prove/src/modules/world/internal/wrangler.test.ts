import { describe, expect, it } from "vitest";
import { buildErrors } from "./wrangler.ts";

const esc = "\u001b";
const error = `${esc}[31m✘ ${esc}[41;31m[${esc}[41;97mERROR${esc}[41;31m]${esc}[0m ${esc}[1mNo matching export in "../../blueprint/things/handle/invariants.ts" for import "oneHolderPerName"${esc}[0m

      ../../src/handle/resolve.ts:6:9:
  ${esc}[37m      6 │ import { oneHolderPerName } from "../../blueprint/things/handle/inv...
`;

describe("a worker that cannot be built", () => {
  it("is read from wrangler's coloured log: the error line and the importing file, no colour", () => {
    expect(buildErrors(`ready on 127.0.0.1\n${error}`)).toBe(
      '✘ [ERROR] No matching export in "../../blueprint/things/handle/invariants.ts" for import "oneHolderPerName"\n      ../../src/handle/resolve.ts:6:9:',
    );
  });

  it("is not there when the log holds no error", () => {
    expect(buildErrors("▲ [WARNING] something\nReady on http://127.0.0.1:8787\n")).toBeUndefined();
  });
});
