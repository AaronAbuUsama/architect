// Free loopback ports for tests (the same file sits in each package that needs it, as a package may not import another's
// files), so two runs on one machine (two worktrees, two test files) never meet on a port.
// Ask for the names you need; the operating system picks distinct free ports. A port is only free until something
// else takes it, so start the server that uses it soon after asking.
import { spawnSync } from "node:child_process";

const finder = `
const net = require("node:net");
const n = Number(process.argv[1]);
const servers = Array.from({ length: n }, () => net.createServer());
let left = n;
const ports = [];
servers.forEach((s, i) => s.listen(0, "127.0.0.1", () => {
  ports[i] = s.address().port;
  if (--left === 0) { console.log(JSON.stringify(ports)); servers.forEach((x) => x.close()); }
}));
`;

/** `freePorts("logbook", "issuer")` is `{ logbook: 41873, issuer: 41874 }`: distinct, free on 127.0.0.1 when asked. */
export const freePorts = <const K extends string>(...names: ReadonlyArray<K>): Readonly<Record<K, number>> => {
  const run = spawnSync(process.execPath, ["-e", finder, String(names.length)], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`no free ports: ${run.stderr}`);
  const ports = JSON.parse(run.stdout) as ReadonlyArray<number>;
  return Object.fromEntries(names.map((name, i) => [name, ports[i]!])) as Record<K, number>;
};

export const freePort = (): number => freePorts("one").one;
