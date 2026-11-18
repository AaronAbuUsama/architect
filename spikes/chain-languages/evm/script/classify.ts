// Q1: classify every ABI entry against the blueprint's operation list (spec.md).
// Matching is by the full signature (name + input types), never by name alone: overloads exist.
import { readFileSync } from "node:fs";
import { toFunctionSelector } from "viem";

type Item = { type: string; name?: string; inputs?: { type: string; name: string }[]; stateMutability?: string };

// What the blueprint declares, mapped to the ABI signature a generator would emit.
const OPERATIONS: Record<string, string> = {
  "open(bytes32,bytes32)": "proposal.open",
  "vote(bytes32,uint8)": "proposal.vote",
  "voteBySig(bytes32,uint8,uint256,uint256,bytes)": "proposal.vote (relayed)",
  "close(bytes32)": "proposal.close",
  "addMember(address)": "member.add",
};
const READS: Record<string, string> = { "get(bytes32)": "proposal.get" };
const REFUSALS: Record<string, string> = { AlreadyVoted: "PR-001", ProposalExists: "PR-002", ProposalNotOpen: "PR-900", NotAllowed: "AR-001" };
const EVENTS = ["ProposalOpened", "VoteCast", "ProposalClosed", "MemberAdded"];

const sig = (i: Item) => `${i.name}(${(i.inputs ?? []).map((x) => x.type).join(",")})`;
const contract = process.argv[2] ?? "MiniDao";
const file = contract === "MiniDao" ? "MiniDao.sol" : `${contract}.sol`;
const abi: Item[] = JSON.parse(readFileSync(`out/${file}/${contract}.json`, "utf8")).abi;
const meta = JSON.parse(readFileSync(`out/${file}/${contract}.json`, "utf8")).metadata.output.devdoc.methods ?? {};

const rows: { kind: string; entry: string; selector: string; note: string }[] = [];
for (const i of abi) {
  if (i.type === "function") {
    const s = sig(i);
    const sel = toFunctionSelector(s);
    const mut = i.stateMutability ?? "";
    const view = mut === "view" || mut === "pure";
    if (OPERATIONS[s]) rows.push({ kind: "operation", entry: s, selector: sel, note: OPERATIONS[s]! });
    else if (READS[s]) rows.push({ kind: "declared read", entry: s, selector: sel, note: READS[s]! });
    else if (view) rows.push({ kind: "helper outside the surface", entry: s, selector: sel, note: `${mut}; callable by anyone, not typed by the blueprint` });
    else rows.push({ kind: "UNDECLARED", entry: s, selector: sel, note: `${mut} and not in the operation list: a check must fail here` });
  } else if (i.type === "event") rows.push({ kind: "event", entry: sig(i), selector: "", note: EVENTS.includes(i.name!) ? "declared" : "other (OZ/infra)" });
  else if (i.type === "error") rows.push({ kind: "error", entry: sig(i), selector: toFunctionSelector(sig(i)), note: REFUSALS[i.name!] ?? "not one of the four codes (relayed path / library / their contract)" });
  else rows.push({ kind: i.type, entry: i.type, selector: "", note: "" });
}
console.log(`contract ${contract}: ${abi.length} ABI entries`);
console.table(rows);

const names = abi.filter((i) => i.type === "function").map((i) => i.name!);
const overloaded = [...new Set(names.filter((n, k) => names.indexOf(n) !== k))];
console.log("overloaded names (name-only matching would be wrong):", overloaded);
const undeclared = rows.filter((r) => r.kind === "UNDECLARED");
console.log("undeclared state-changing entries:", undeclared.map((r) => r.entry));
const declaredFound = [...Object.keys(OPERATIONS), ...Object.keys(READS)].filter((s) => !rows.some((r) => r.entry === s && (r.kind === "operation" || r.kind === "declared read")));
console.log("declared but MISSING from the ABI:", declaredFound);
console.log("\nWhat the ABI carries: names, input/output types + names, mutability (view/pure/nonpayable/payable), events (+indexed), error names and field types, constructor.");
console.log("What it lacks: roles (who may call), the machine (which state a call needs / leaves), refusal codes (PR-001...), which errors a given function may raise (errors are contract-wide), internal/private functions, and the blueprint operation name.");
console.log("\nOptional side channel: natspec @custom tags survive in the artifact's metadata.output.devdoc (not in the ABI, and `forge inspect devdoc` drops them for inherited functions):");
console.log(JSON.stringify(meta, null, 1).slice(0, 1200));
if (undeclared.length) process.exitCode = 3; // the check this stands in for
