// Writes the totals in an e2e suite's README from facts, so no pull request keeps a count by hand.
//   node e2e/totals/totals.mjs            rewrite every block
//   node e2e/totals/totals.mjs --check    exit 1, naming the fix, when a block is not what would be written
//   --root <dir>                          the folder that holds the suites (default: e2e/)
// A suite is a folder e2e/<suite>/ with a README.md that holds <!-- totals:start --> and <!-- totals:end -->.
// Tests are counted by `vitest list --json` (nothing runs) with e2e/vitest.<suite>.config.ts, else e2e/vitest.config.ts.
// Reds are the lines of e2e/<suite>/expected-failing.txt, when it exists.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const START = "<!-- totals:start -->";
export const END = "<!-- totals:end -->";
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");

/** The expected-failing keys of a list: `m1/14-x.test.ts > describe > test`, one per line, `#` lines and blanks skipped. */
export const parseList = (text) => text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

/** An entry for a hook or a file that errored is not a test, so it is never counted as one. */
const isErrorKey = (key, file) => key === file || /\[[a-zA-Z ]* error\]$/.test(key);

/**
 * The facts: `tests` is vitest's list as [{ file, name }] (file relative to the e2e folder), `keys` the expected-failing
 * lines (or undefined when the suite has no list).
 */
export const facts = (suite, tests, keys) => {
  const files = new Map();
  for (const t of tests) files.set(t.file, [...(files.get(t.file) ?? []), `${t.file} > ${t.name}`]);
  const listed = new Set(keys ?? []);
  const rows = [...files].sort(([a], [b]) => (a < b ? -1 : 1)).map(([file, all]) => ({
    file: file.slice(suite.length + 1), tests: all.length, red: keys ? all.filter((k) => listed.has(k)).length : undefined,
  }));
  const known = new Set(tests.map((t) => `${t.file} > ${t.name}`));
  const stale = keys ? keys.filter((k) => !known.has(k) && !isErrorKey(k, k.split(" > ")[0])).length : 0;
  return { rows, stale, hasList: keys !== undefined };
};

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** The block, markers included. */
export const render = ({ rows, stale, hasList }) => {
  const total = rows.reduce((n, r) => n + r.tests, 0);
  const red = rows.reduce((n, r) => n + (r.red ?? 0), 0);
  const sentence = hasList
    ? `${plural(total, "test", "tests")} in all; ${total - red} pass; ${red} expected to fail, listed in \`expected-failing.txt\`.${stale ? ` ${plural(stale, "listed line matches", "listed lines match")} no test: take ${stale === 1 ? "it" : "them"} off the list.` : ""}`
    : `${plural(total, "test", "tests")} in all; all pass.`;
  const head = hasList ? ["| File | Tests | Expected to fail |", "|---|---|---|"] : ["| File | Tests |", "|---|---|"];
  const line = (name, r) => `| ${name} | ${r.tests} |${hasList ? ` ${r.red} |` : ""}`;
  return [
    START, "<!-- Written by `nx run e2e:totals` from the tests and expected-failing.txt. Do not edit by hand. -->", "",
    sentence, "", ...head, ...rows.map((r) => line(`\`${r.file}\``, r)), line("**All**", { tests: total, red }), "", END,
  ].join("\n");
};

/** The README with its block replaced; throws when the markers are not one start, then one end. */
export const replaceBlock = (readme, block) => {
  const a = readme.indexOf(START);
  const b = readme.indexOf(END);
  if (a === -1 || b < a || readme.indexOf(START, a + 1) !== -1) throw new Error(`needs one ${START} followed by one ${END}`);
  return readme.slice(0, a) + block + readme.slice(b + END.length);
};

const listTests = (root, suite) => {
  const config = ["vitest.config.ts", `vitest.${suite}.config.ts`].filter((c) => existsSync(join(root, c))).at(-1);
  if (!config) throw new Error(`no ${join(root, "vitest.config.ts")}`);
  const out = execFileSync(join(repo, "node_modules/.bin/vitest"), ["list", "--json", "--root", root, "--config", join(root, config), `${suite}/`], {
    cwd: root, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out.slice(out.indexOf("["))).map((t) => ({ file: relative(root, t.file), name: t.name })).filter((t) => t.file.startsWith(`${suite}/`));
};

export const run = (argv) => {
  const check = argv.includes("--check");
  const root = resolve(argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : join(repo, "e2e"));
  const readmes = readdirSync(root)
    .filter((n) => statSync(join(root, n)).isDirectory() && existsSync(join(root, n, "README.md")))
    .filter((n) => readFileSync(join(root, n, "README.md"), "utf8").includes(START));
  let stale = 0;
  for (const suite of readmes) {
    const path = join(root, suite, "README.md");
    const listFile = join(root, suite, "expected-failing.txt");
    const keys = existsSync(listFile) ? parseList(readFileSync(listFile, "utf8")) : undefined;
    const old = readFileSync(path, "utf8");
    const next = replaceBlock(old, render(facts(suite, listTests(root, suite), keys)));
    if (next === old) continue;
    stale++;
    if (check) console.error(`${relative(process.cwd(), path)}: the totals are out of date. Run: pnpm nx run e2e:totals`);
    else { writeFileSync(path, next); console.log(`${relative(process.cwd(), path)}: totals written`); }
  }
  if (!readmes.length) console.log(`no suite README under ${relative(process.cwd(), root) || "."} has ${START}`);
  else if (!stale) console.log(`totals are current in ${readmes.map((s) => `${s}/README.md`).join(", ")}`);
  return check && stale ? 1 : 0;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run(process.argv.slice(2)));
