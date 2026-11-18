// After every check: no collector or registry container of Forman's is left running.
import { spawnSync } from "node:child_process";

export default function setup() {
  return () => {
    const left = spawnSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" }).stdout
      .split("\n").filter((n) => /^forman-(collector|e2e-verdaccio)-/.test(n));
    if (left.length > 0) throw new Error(`left running: ${left.join(", ")}`);
  };
}
