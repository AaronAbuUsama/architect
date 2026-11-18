// Q1: classify every function of the compiled Governance artifact against the blueprint's operation list.
import { save } from "../lib/world.js";
import { FunctionSelector } from "@aztec/aztec.js/abi";
import { GovernanceContractArtifact as artifact } from "../generated/Governance.js";

// What the blueprint declares (spec.md) -> the function the generator wraps it in. member.add is private; the rest public.
const operations: Record<string, string> = {
  "proposal.open": "open_proposal", "proposal.close": "close_proposal", "proposal.vote": "vote", "member.add": "add_member",
};
const declaredReads: Record<string, string> = { "proposal.get": "get" };
// Protocol-generated entries every Aztec contract carries (not the developer's, not the blueprint's).
const protocol = new Set(["public_dispatch", "sync_state", "offchain_receive", "constructor"]);

type Kind = "operation" | "declared read" | "helper (outside the surface)" | "undeclared" | "protocol";
const opNames = new Set(Object.values(operations)), readNames = new Set(Object.values(declaredReads));

function classify(f: { name: string; functionType: string; isOnlySelf: boolean; isStatic: boolean; isInitializer: boolean }): { kind: Kind; why: string } {
  if (protocol.has(f.name)) return { kind: "protocol", why: f.isInitializer ? "initializer (deploy-time)" : "emitted by the #[aztec] macro" };
  if (opNames.has(f.name)) return { kind: "operation", why: `declared operation, ${f.functionType}` };
  if (readNames.has(f.name)) return { kind: "declared read", why: `declared read, ${f.functionType}${f.isStatic ? " + #[view] (static)" : ""}` };
  // A helper is anything the developer added that cannot change state from outside: only_self or utility (device-local).
  if (f.isOnlySelf) return { kind: "helper (outside the surface)", why: "only_self: callable by the contract itself only" };
  if (f.functionType === "utility") return { kind: "helper (outside the surface)", why: "utility: unconstrained, device-local, cannot change chain state" };
  return { kind: "undeclared", why: `externally callable ${f.functionType} function with no blueprint entry` };
}

// Public fns are folded into one `public_dispatch` entry; the individual ones ride in nonDispatchPublicFunctions.
const all: Array<(typeof artifact.functions)[number] | NonNullable<typeof artifact.nonDispatchPublicFunctions>[number]> = [...artifact.functions, ...(artifact.nonDispatchPublicFunctions ?? [])];
const rows = await Promise.all(all.map(async (f) => ({
  name: f.name, selector: (await FunctionSelector.fromNameAndParameters(f.name, f.parameters)).toString(),
  functionType: f.functionType, isOnlySelf: f.isOnlySelf, isStatic: f.isStatic, isInitializer: f.isInitializer,
  params: f.parameters.map((p) => `${p.name}: ${p.type.kind}`), returns: f.returnTypes.map((t) => t.kind),
  ...classify(f),
})));
const internalOnly = ["_assert_admin"];
const missing = [...Object.values(operations), ...Object.values(declaredReads)].filter((n) => !rows.some((r) => r.name === n));
const out = { contract: artifact.name, rows, missingFromArtifact: missing,
  note: `#[internal] fns (${internalOnly.join(", ")}) are inlined into callers and do not appear in the artifact at all.` };
save("q1-classification.json", out);
console.table(rows.map((r) => ({ name: r.name, type: r.functionType, onlySelf: r.isOnlySelf, static: r.isStatic, selector: r.selector, kind: r.kind })));
console.log("missing from artifact:", missing, "|", out.note);
