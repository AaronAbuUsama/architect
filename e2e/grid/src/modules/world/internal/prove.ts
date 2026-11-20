import { join } from "node:path";
import type { ProveRun, WorldApi } from "../types.ts";

export const proveFresh: WorldApi["proveFresh"] = ({ repo, project, report, telemetry, node }) => {
  node.remove(report);
  node.remove(telemetry);
  const ran = node.run("node", [join(repo, "packages/cli/src/main.ts"), "prove", "--root", project, "--env", "local", "--report", report], repo);
  const output = `${ran.stdout}${ran.stderr}`;
  const fresh = node.read(report) !== undefined;
  const head = output.split("\n").filter((l) => l.trim() !== "").slice(0, 5).join(" / ");
  const problems = fresh ? [] : [`prove wrote no report (status ${String(ran.status)}), so there is no run to judge: ${head === "" ? "it printed nothing" : head}`];
  return { status: ran.status, output, fresh, problems } satisfies ProveRun;
};
