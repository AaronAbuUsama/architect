import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Evidence } from "./service.ts";
import type { Ports } from "./types.ts";
import type { ModelView } from "../refusal-evals/types.ts";

const model = JSON.parse(readFileSync(join(import.meta.dirname, "../../../../../examples/acme/generated/model/model.json"), "utf8")) as ModelView;

describe("the evidence of a refusal", () => {
  it("asks each declaring operation's docs and portal page, the spans and the clients' outcomes, and nothing else", async () => {
    const asked: Array<string> = [];
    const ports: Ports = {
      read: async (path) => { asked.push(`read ${path}`); return `docs of ${path}`; },
      portal: async (route) => { asked.push(`portal ${route}`); return undefined; },
      spans: async () => { asked.push("spans"); return [{ name: "x", attrs: {} }]; },
      observed: async (refusal) => { asked.push(`observed ${refusal}`); return { cli: { status: 41, stdout: "", stderr: "line" } }; },
    };
    const evidence = await Evidence.ofRefusal({ model, refusal: "AllowanceNotActive", ports });
    expect(asked.sort()).toEqual([
      "observed AllowanceNotActive",
      "portal /portal/operations/allowance.revoke", "portal /portal/operations/allowance.spend",
      "read generated/docs/allowance/revoke.md", "read generated/docs/allowance/spend.md",
      "spans",
    ]);
    expect(evidence.docs).toEqual({ "allowance.revoke": "docs of generated/docs/allowance/revoke.md", "allowance.spend": "docs of generated/docs/allowance/spend.md" });
    expect(evidence.portal).toEqual({ "allowance.revoke": undefined, "allowance.spend": undefined });
    expect(evidence.cli).toEqual({ status: 41, stdout: "", stderr: "line" });
    expect(evidence.mcp).toBeUndefined();
    expect(evidence.spans).toEqual([{ name: "x", attrs: {} }]);
  });

  it("leaves what could not be observed undefined, so the eval is red and says so", async () => {
    const ports: Ports = { read: async () => undefined, portal: async () => undefined, spans: async () => undefined, observed: async () => undefined };
    const evidence = await Evidence.ofRefusal({ model, refusal: "AllowanceExceeded", ports });
    expect(evidence).toMatchObject({ docs: { "allowance.spend": undefined }, spans: undefined, cli: undefined, mcp: undefined });
  });
});
