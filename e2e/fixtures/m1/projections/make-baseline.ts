// Writes `acme-baseline.json` from acme's checked-in `generated/` (run once, on m1 before any mount exists):
//   node e2e/fixtures/m1/projections/make-baseline.ts
// It is the record of what "unchanged" means for M1.11, so it is not run again once a projection is mounted.
import { writeFileSync } from "node:fs";
import { acme } from "../../../layer1/support.ts";
import { baselinePath, digestOf, modelDigest, type Baseline } from "../../../m1/projections.ts";

const files = { ...digestOf(acme, "server"), ...digestOf(acme, "api") };
const out: Baseline = { files, model: modelDigest(acme) };
writeFileSync(baselinePath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`${Object.keys(files).length} files`);
