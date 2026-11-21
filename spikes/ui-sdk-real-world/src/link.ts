// Points the spike at a checkout of origin/goal/stage-1, read-only: `.goal` is the checkout, `.plugged-in` its example.
// Make one with `git worktree add --detach <dir> origin/goal/stage-1 && (cd <dir> && pnpm install)`, then
// `npm run link -- <dir>`. Nothing from it is ever committed here.
import { existsSync, rmSync, symlinkSync } from "node:fs";
import { resolve } from "node:path";

const goal = resolve(process.argv[2] ?? process.env["GOAL_WORKTREE"] ?? "");
if (!existsSync(`${goal}/examples/plugged-in/generated/sdk/src/index.ts`)) {
  console.error(`no Plugged In at ${goal}/examples/plugged-in: pass a checkout of origin/goal/stage-1`);
  process.exit(1);
}
for (const [link, target] of [[".goal", goal], [".plugged-in", `${goal}/examples/plugged-in`]] as const) {
  rmSync(link, { force: true });
  symlinkSync(target, link);
  console.log(`${link} -> ${target}`);
}
