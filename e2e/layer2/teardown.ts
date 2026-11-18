// After every Gate 2 check: nothing of Orthograph's is left running in Docker. A container named `ortho-*` that
// was not there when the run began is a leak: it is removed, and the run fails. (Layer 1 keeps its own teardown; run
// the two layers one after the other, or a layer 1 collector will look like a leak here.)
import { spawnSync } from "node:child_process";

const names = () => spawnSync("docker", ["ps", "-a", "--format", "{{.Names}}"], { encoding: "utf8" }).stdout
  .split("\n").filter((n) => n.startsWith("ortho-"));

export default function setup() {
  const before = new Set(names());
  return () => {
    const left = names().filter((n) => !before.has(n));
    for (const name of left) spawnSync("docker", ["rm", "-f", name]);
    if (left.length > 0) throw new Error(`left behind: ${left.join(", ")}`);
  };
}
