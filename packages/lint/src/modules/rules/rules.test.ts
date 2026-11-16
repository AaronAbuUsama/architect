// Each architect rule, run by real oxlint on a small project: what it reports, and what it lets through.
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { ProjectFacts } from "./types.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const root = resolve(import.meta.dirname, "../../../tmp/rules");
const facts: ProjectFacts = {
  root,
  names: ["allowance.spend", "allowance.spend.load", "AllowanceExceeded"],
  errors: ["AllowanceExceeded", "AllowanceLimitTooHigh"],
  handlers: { "implementation/handlers/allowance/spend.ts": ["AllowanceExceeded"] },
};
const RULES = ["no-name-as-string", "refusal-has-log", "declared-errors-only", "no-wall-clock", "handler-matches-path"];

/** Lays `files` out under the project, lints them, and gives back `<path> <rule>` per report. */
const lint = (files: Record<string, string>): ReadonlyArray<string> => {
  rmSync(root, { recursive: true, force: true });
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  const config = { jsPlugins: [resolve(import.meta.dirname, "../../main.ts")], categories: { correctness: "off" }, plugins: [], rules: Object.fromEntries(RULES.map((r) => [`architect/${r}`, ["error", facts]])) };
  writeFileSync(join(root, "oxlintrc.json"), JSON.stringify(config));
  const run = spawnSync(join(repo, "node_modules/.bin/oxlint"), ["-c", "oxlintrc.json", "--no-ignore", "--format", "unix", ...Object.keys(files)], { cwd: root, encoding: "utf8" });
  return run.stdout.split("\n").flatMap((l) => {
    const m = /^(.+?):\d+:\d+: .* \[Error\/architect\((.+?)\)\]$/.exec(l);
    return m ? [`${m[1]} ${m[2]}`] : [];
  });
};

afterAll(() => rmSync(root, { recursive: true, force: true }));

const spend = "implementation/handlers/allowance/spend.ts";

describe("the architect rules", () => {
  it("no-name-as-string: a declared name as a literal outside generated/", { timeout: 60_000 }, () => {
    expect(lint({
      [spend]: `export const a = "allowance.spend";\nexport const b = "not.a.name";\n`,
      "generated/api/src/x.ts": `export const a = "allowance.spend";\n`,
    })).toEqual([`${spend} no-name-as-string`]);
  });

  it("refusal-has-log and declared-errors-only: a refusal says why first, and is one its operation declares", { timeout: 60_000 }, () => {
    expect(lint({
      [spend]: [
        `declare const Effect: any; declare class AllowanceExceeded {} declare class AllowanceLimitTooHigh {}`,
        `export const logged = () => { Effect.logInfo("over"); return new AllowanceExceeded(); };`,
        `export const silent = () => { return new AllowanceExceeded(); };`,
        `export const other = () => { Effect.logInfo("why"); return new AllowanceLimitTooHigh(); };`,
      ].join("\n"),
    })).toEqual([`${spend} refusal-has-log`, `${spend} declared-errors-only`]);
  });

  it("no-wall-clock: Date.now, new Date(), setTimeout and raw Effect.sleep, but not new Date(at)", { timeout: 60_000 }, () => {
    expect(lint({
      [spend]: [
        `declare const Effect: any;`,
        `export const a = Date.now();`, `export const b = new Date();`, `export const c = new Date(0);`,
        `setTimeout(() => 0, 1);`, `export const d = Effect.sleep("1 second");`,
      ].join("\n"),
    })).toEqual(Array(4).fill(`${spend} no-wall-clock`));
  });

  it("handler-matches-path: a handler file belongs to a declared operation", { timeout: 60_000 }, () => {
    expect(lint({ [spend]: `export {};\n`, "implementation/handlers/allowance/refund.ts": `export {};\n` }))
      .toEqual(["implementation/handlers/allowance/refund.ts handler-matches-path"]);
  });
});
