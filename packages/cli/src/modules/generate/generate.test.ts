// L1.31: a handler is scaffolded once its operation has no blanks, written once, and never overwritten.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// Dot-folders (.wrangler, .architect) belong to whatever is running there; a filter also keeps cpSync off its native path,
// which aborts the process when a folder vanishes mid-copy.
const visible = (from: string) => !basename(from).startsWith(".");

const repo = resolve(import.meta.dirname, "../../../../..");
const main = resolve(import.meta.dirname, "../../main.ts");
const root = join(repo, "examples/acme/test/tmp/generate");
const architect = (...args: ReadonlyArray<string>) => spawnSync("node", [main, ...args, "--root", root], { encoding: "utf8" });
const scaffolds = (out: string) => out.split("\n").filter((l) => l.includes("(scaffold")).map((l) => l.split(" ")[1]);

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("architect generate", () => {
  it("scaffolds each finished operation's handler once, and nothing for one with blanks", { timeout: 120_000 }, () => {
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    for (const part of ["blueprint", "package.json"]) cpSync(join(repo, "examples/acme", part), join(root, part), { recursive: true, filter: visible });

    expect(architect("add", "operation", "allowance.pause").status).toBe(0);
    const first = architect("generate");
    expect(first.status).toBe(0);
    expect(scaffolds(first.stdout)).toEqual([
      "src/allowance/grant.ts", "src/allowance/revoke.ts", "src/allowance/spend.ts",
      "src/api-key/create.ts", "src/invitation/accept.ts", "src/invitation/revoke.ts",
      "src/invitation/send.ts", "src/organization/create.ts", "src/person/sign-up.ts",
      "src/session/show.ts", "src/session/sign-in.ts", "src/system/health.ts",
    ]);
    expect(existsSync(join(root, "generated/api/src/allowance/pause.ts"))).toBe(false);

    // Filled in, it gets its scaffold and its generated files.
    writeFileSync(join(root, "blueprint/things/allowance/verbs/pause.ts"), `import { Blueprint } from "@architect/blueprint";
import { Allowance } from "../thing.ts";
import { grantee } from "../roles.ts";

export default Blueprint.operation(Allowance, {
  description: "Pause an allowance.",
  payload: { allowance: Allowance.fields.id },
  answer: {},
  allowed: [grantee],
});
`);
    const second = architect("generate");
    expect(scaffolds(second.stdout)).toEqual(["src/allowance/pause.ts"]);
    expect(existsSync(join(root, "generated/api/src/allowance/pause.handler.ts"))).toBe(true);

    expect(architect("generate").stdout.trim()).toBe("nothing to change");
  });
});
