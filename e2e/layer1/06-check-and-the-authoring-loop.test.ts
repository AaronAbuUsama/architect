// Check 6: the allowance is built on the starter by Architect's own commands, and check holds the rules throughout.
// add writes a thing of blanks that check names; with the declarations written, generate scaffolds each handler once;
// with the handlers written, check and prove pass. Each of the journey author's check fixtures fails it.
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acme, architect, copyOf, nothingRunning, repo } from "./support.ts";

const starter = join(repo, "examples/starter");

describe("check 6: architect add, generate and check build the allowance on the starter", () => {
  it("blanks, then scaffolds, then a project that checks and proves", () => {
    // The starter as the preset writes it, in a folder named acme.
    const project = copyOf(starter);
    const { root } = project;
    try {
      const added = architect(root, "add", "thing", "allowance");
      expect(added.stdout.trim().split("\n")).toHaveLength(6);
      const blank = architect(root, "check");
      expect(blank.status).toBe(1);
      expect(blank.stdout.split("\n")[0]).toBe("allowance has 3 blanks");

      // The declarations written (acme's own, with its cap on organization), then generate.
      rmSync(join(root, "blueprint/things/allowance"), { recursive: true });
      for (const p of ["blueprint/things/allowance", "blueprint/things/organization", "blueprint/values/money.ts", "blueprint/starting-worlds/founded.ts", "blueprint/starting-worlds/funded.ts"]) {
        cpSync(join(acme, p), join(root, p), { recursive: true });
      }
      cpSync(join(acme, "implementation/handlers/organization/create.ts"), join(root, "implementation/handlers/organization/create.ts"));
      const generated = architect(root, "generate");
      const scaffolds = generated.stdout.split("\n").filter((l) => l.endsWith("(scaffold: yours from now on)"));
      expect(scaffolds.map((l) => l.split(" ")[1])).toEqual([
        "implementation/handlers/allowance/grant.ts", "implementation/handlers/allowance/revoke.ts", "implementation/handlers/allowance/spend.ts",
      ]);
      expect(architect(root, "generate").stdout.trim()).not.toContain("implementation/");

      // The handlers and journeys written: check and prove pass.
      for (const op of ["grant", "revoke", "spend"]) cpSync(join(acme, `implementation/handlers/allowance/${op}.ts`), join(root, `implementation/handlers/allowance/${op}.ts`));
      cpSync(join(acme, "journeys"), join(root, "journeys"), { recursive: true });
      const checked = architect(root, "check");
      expect(checked.stdout.trimEnd().split("\n").at(-1), checked.stdout).toBe("check ✔");
      const proved = architect(root, "prove", "--env", "local", "--port", "8885");
      expect(proved.stdout.trimEnd().split("\n").at(-1), proved.stdout).toBe("prove ✔");
      expect(proved.stdout).toMatch(/^allowance\.spend 9 evals ✔/m);
      expect(existsSync(join(root, "generated/docs/allowance/spend.md"))).toBe(true);
      nothingRunning(root);
    } finally {
      project.remove();
    }
  });

  const SPEND = "implementation/handlers/allowance/spend.ts";
  const fixtures = [
    ["check/edited-output/get.ts", "generated/api/src/allowance/get.ts", "no-edited-output"],
    ["check/name-as-string/spend.ts", SPEND, "no-name-as-string"],
    ["check/refusal-without-log/spend.ts", SPEND, "refusal-has-log"],
    ["types/undeclared-error/spend.ts", SPEND, "TS"],
  ] as const;
  for (const [fixture, over, rule] of fixtures) {
    it(`${fixture}: check exits 1 naming ${over} and ${rule}`, () => {
      const project = copyOf(acme);
      try {
        expect(readFileSync(join(acme, "test/fixtures", fixture), "utf8")).not.toBe("");
        cpSync(join(acme, "test/fixtures", fixture), join(project.root, over));
        const run = architect(project.root, "check");
        expect(run.status).toBe(1);
        expect(run.stdout.split("\n").some((l) => l.includes(over) && l.includes(rule)), run.stdout).toBe(true);
      } finally {
        project.remove();
      }
    });
  }
});
