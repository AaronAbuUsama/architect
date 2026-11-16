import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const scratch = resolve(import.meta.dirname, "../../../test/tmp");
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));

/** A copy of acme's blueprint inside the package, so its imports still resolve. */
const copyOfAcme = (): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "acme-"));
  cpSync(join(acme, "blueprint"), join(root, "blueprint"), { recursive: true });
  return root;
};

describe("model", () => {
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  it("describes acme", async () => {
    const exit = await modelOf(acme);
    expect(Exit.isSuccess(exit)).toBe(true);
    if (!Exit.isSuccess(exit)) return;
    expect(Object.keys(exit.value.operations)).toEqual(["allowance.get", "allowance.grant", "allowance.revoke", "allowance.spend", "api-key.create", "invitation.accept", "invitation.revoke", "invitation.send", "membership.get", "organization.create", "organization.get", "person.sign-up", "session.show", "session.sign-in", "system.health"]);
    const grant = exit.value.operations["allowance.grant"];
    expect(grant?.refusals).toEqual(["AllowanceLimitTooHigh", "NotAllowed"]);
    expect(grant?.steps).toEqual({ insert: { name: "allowance.grant.insert", type: "database" } });
    expect(grant?.allowed).toEqual([{ kind: "role-of", role: "organization.owner", path: "organization" }]);
    expect(exit.value.things["allowance"]?.fields["member"]?.ref).toBe("person.id");
    await expect(JSON.stringify(exit.value, null, 2) + "\n").toMatchFileSnapshot("__snapshots__/acme.model.json");
  });

  it("names an operation after its file: grant.ts renamed to award.ts is allowance.award", async () => {
    const root = copyOfAcme();
    renameSync(join(root, "blueprint/things/allowance/verbs/grant.ts"), join(root, "blueprint/things/allowance/verbs/award.ts"));
    const exit = await modelOf(root);
    expect(Exit.isSuccess(exit)).toBe(true);
    if (!Exit.isSuccess(exit)) return;
    expect(Object.keys(exit.value.operations)).toEqual(["allowance.award", "allowance.get", "allowance.revoke", "allowance.spend", "api-key.create", "invitation.accept", "invitation.revoke", "invitation.send", "membership.get", "organization.create", "organization.get", "person.sign-up", "session.show", "session.sign-in", "system.health"]);
    expect(exit.value.operations["allowance.award"]?.steps["insert"]?.name).toBe("allowance.award.insert");
  });

  it("keeps every hash when a file is only reformatted", async () => {
    const before = await modelOf(acme);
    const root = copyOfAcme();
    const file = join(root, "blueprint/things/allowance/verbs/grant.ts");
    const reformatted = readFileSync(file, "utf8").split("\n").map((l) => `\t${l}   `).join("\n\n");
    writeFileSync(file, `// reformatted\n${reformatted}`);
    const after = await modelOf(root);
    expect(Exit.isSuccess(before) && Exit.isSuccess(after)).toBe(true);
    if (!Exit.isSuccess(before) || !Exit.isSuccess(after)) return;
    expect(readFileSync(file, "utf8")).not.toEqual(readFileSync(join(acme, "blueprint/things/allowance/verbs/grant.ts"), "utf8"));
    expect(after.value.operations["allowance.grant"]?.hash).toBe(before.value.operations["allowance.grant"]?.hash);
    expect(after.value).toEqual(before.value);
  });

  it("refuses a verb file that holds no operation", async () => {
    const exit = await modelOf(resolve(import.meta.dirname, "../../../test/fixtures/not-an-operation"));
    expect(Exit.isFailure(exit)).toBe(true);
    expect(JSON.stringify(exit)).toContain("blueprint/things/widget/verbs/spin.ts");
  });
});
