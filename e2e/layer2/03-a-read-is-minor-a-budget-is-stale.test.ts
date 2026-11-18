// Check 3 (D3 #15.3, walkthrough step 10): adding `allowance.list` gives `next 1.1.0` and `stale none`, and
// `allowance.list 9 evals ✔`; loosening spend's budget makes exactly spend stale in staging and production.
//
// Chosen where D3 #14 is open:
// - `architect version --next` prints the version alone on one line (`1.0.0`, with no production release; `1.1.0` after the read).
// - `architect impact` prints `next <version>` and `stale none`, or `stale <ops> in <envs>` with the operation names and the
//   environment names each separated by commas and/or spaces (`stale allowance.spend in staging, production`). "Stale in" means
//   the working model differs from the model the logbook holds verdicts for in that environment, and only the shipped
//   environments (staging, production) are listed: the test environment is proven afresh on every push.
// - A budget change is a patch, so with the read added the next version stays `1.1.0`.
// - Verdicts and releases come from the first release (prove --env test, promote to staging, promote to production), as in check 4.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addList, release } from "./flow.ts";
import { type Stack, finish, startStack } from "./services.ts";
import { install, project, run } from "./support.ts";

const copy = project();
let stack: Stack | undefined;
beforeAll(async () => { stack = await startStack(copy.root, 3, { registry: true }); });
afterAll(async () => { try { await finish(copy.root, stack); } finally { copy.remove(); } });

const words = (text: string) => text.split(/[\s,]+/).filter((w) => w !== "");
/** `stale <ops> in <envs>` as the operations and the environments it names. */
const staleLine = (lines: ReadonlyArray<string>) => {
  const line = lines.find((l) => l.startsWith("stale "));
  expect(line, lines.join("\n")).toBeDefined();
  const [ops, envs] = line!.slice("stale ".length).split(" in ");
  return { ops: words(ops!), envs: words(envs ?? "").sort() };
};

describe("check 3: versions and staleness", () => {
  it("a new read is minor with nothing stale and 9 evals green; a looser budget stales only spend, in staging and production", () => {
    const s = stack!;
    const { root } = copy;
    expect(run(root, s.env, "version", "--next").stdout.trim(), "no production release yet").toBe("1.0.0");
    release(root, s, copy.rev);
    expect(run(root, s.env, "impact").lines).toContain("stale none");

    addList(root, s);
    const impact = run(root, s.env, "impact");
    expect(impact.status, impact.out).toBe(0);
    expect(impact.lines, impact.out).toContain("next 1.1.0");
    expect(impact.lines, impact.out).toContain("stale none");
    expect(run(root, s.env, "version", "--next").stdout.trim()).toBe("1.1.0");

    const proved = run(root, s.env, "prove", "--env", "local", "--port", String(s.ports.local));
    expect(proved.status, proved.out.slice(-3000)).toBe(0);
    expect(proved.stdout).toMatch(/^allowance\.list 9 evals ✔/m);

    install(root, "looser-budget/spend.ts", "blueprint/things/allowance/verbs/spend.ts");
    const looser = run(root, s.env, "impact");
    expect(looser.status, looser.out).toBe(0);
    expect(looser.lines, looser.out).toContain("next 1.1.0");
    expect(staleLine(looser.lines)).toEqual({ ops: ["allowance.spend"], envs: ["production", "staging"] });
  });
});
