// The ratchet's entry: node e2e/ratchet/check.ts <report.json> <expected-failing.txt>
// Exit 0 when every failing test is on the list; 1 when one is not, or when there is no usable report (a crashed run).
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compare, ok, parseList, type Report } from "./ratchet.ts";

const [reportPath, listPath] = process.argv.slice(2);
const github = process.env["GITHUB_ACTIONS"] === "true";
const e2eRoot = resolve(import.meta.dirname, "..");

const annotate = (level: "error" | "warning", message: string): void => {
  console.log(github ? `::${level}::${message}` : `${level.toUpperCase()}: ${message}`);
};

const fail = (message: string): never => {
  annotate("error", message);
  process.exit(1);
};

const readReport = (path: string): Report | undefined => {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    return typeof value === "object" && value !== null && Array.isArray((value as Report).testResults) ? (value as Report) : undefined;
  } catch {
    return undefined;
  }
};

if (reportPath === undefined || listPath === undefined) fail("usage: check.ts <report.json> <expected-failing.txt>");
if (!existsSync(String(reportPath))) fail(`no vitest report at ${reportPath}: the run crashed before it wrote one`);
const report = readReport(String(reportPath));
if (report === undefined) fail(`${reportPath} is not a vitest JSON report`);
if (report!.testResults.length === 0) fail("the vitest report has no test files: nothing ran");

const verdict = compare(report!, parseList(readFileSync(String(listPath), "utf8")), e2eRoot);

for (const key of verdict.nowPassing) annotate("warning", `newly passing, take it off the list: ${key}`);
for (const key of verdict.missing) annotate("warning", `on the list but not in the report (renamed or deleted?): ${key}`);
for (const key of verdict.notRun) annotate("warning", `on the list but skipped this run: ${key}`);
for (const key of verdict.unexpected) annotate("error", `failing and not on the expected-failing list: ${key}`);

console.log(
  `ratchet: ${verdict.failing} failing, ${verdict.failing - verdict.unexpected.length} expected, ${verdict.unexpected.length} unexpected, ${verdict.nowPassing.length} newly passing, ${verdict.missing.length} missing`,
);
process.exit(ok(verdict) ? 0 : 1);
