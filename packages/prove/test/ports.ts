// Free loopback ports for tests (the same file sits in each package that needs it, as a package may not import another's
// files), so two runs on one machine (two worktrees, two test files) never meet on a port.
// Ask for the names you need: distinct ports are picked at random from 20000-29999 and each is checked free. That range
// is below the one the operating system hands out to wrangler's own sockets and to outgoing connections (32768 up on
// Linux, 49152 up on macOS), so a port asked for early is not taken by them before it is used. Start the server that
// uses a port soon after asking all the same.
import { spawnSync } from "node:child_process";

const finder = `
const net = require("node:net");
const want = Number(process.argv[1]);
const got = [];
const free = (port) => new Promise((ok) => {
  const s = net.createServer();
  s.once("error", () => ok(false));
  s.listen(port, "127.0.0.1", () => s.close(() => ok(true)));
});
(async () => {
  while (got.length < want) {
    const port = 20000 + Math.floor(Math.random() * 10000);
    if (!got.includes(port) && (await free(port))) got.push(port);
  }
  console.log(JSON.stringify(got));
})();
`;

/** `freePorts("logbook", "issuer")` is `{ logbook: 24873, issuer: 27114 }`: distinct, free on 127.0.0.1 when asked. */
export const freePorts = <const K extends string>(...names: ReadonlyArray<K>): Readonly<Record<K, number>> => {
  const run = spawnSync(process.execPath, ["-e", finder, String(names.length)], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`no free ports: ${run.stderr}`);
  const ports = JSON.parse(run.stdout) as ReadonlyArray<number>;
  return Object.fromEntries(names.map((name, i) => [name, ports[i]!])) as Record<K, number>;
};

export const freePort = (): number => freePorts("one").one;
