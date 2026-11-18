// Q1: classify every IDL instruction against the blueprint's operation list. Reads only the IDL JSON.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { idl } from "./chain.ts";

// The blueprint's surface (spec.md) mapped to instruction names: what the generator would emit.
const OPERATIONS: Record<string, string> = { open_proposal: "proposal.open", vote: "proposal.vote", close_proposal: "proposal.close", add_member: "member.add" };
const READS: Record<string, string> = { get_proposal: "proposal.get" };
const LIFECYCLE = new Set(["initialize_workshop"]); // generated, not an operation: Solana has no constructor, so something must create the config PDA

type Ix = (typeof idl.instructions)[number];
const flat = (accs: any[]): any[] => accs.flatMap((a) => ("accounts" in a ? flat(a.accounts) : [a]));
const writable = (i: Ix) => flat(i.accounts as any[]).filter((a) => a.writable && !a.signer); // state the instruction can change
const feePaying = (i: Ix) => flat(i.accounts as any[]).filter((a) => a.writable && a.signer);
const disc = (name: string) => [...createHash("sha256").update(`global:${name}`).digest().subarray(0, 8)];

const rows = idl.instructions.map((i) => {
  const kind = OPERATIONS[i.name] ? `operation ${OPERATIONS[i.name]}`
    : READS[i.name] ? `declared read ${READS[i.name]}`
    : LIFECYCLE.has(i.name) ? "lifecycle (generated)"
    : writable(i).length === 0 && feePaying(i).length === 0 ? "helper outside the surface (read-only)"
    : "UNDECLARED state-changing";
  const discOk = JSON.stringify(disc(i.name)) === JSON.stringify(i.discriminator);
  return { instruction: i.name, class: kind, discriminator: i.discriminator.join(","), discOk, args: i.args.map((a) => `${a.name}:${JSON.stringify(a.type)}`).join(" "),
    signers: flat(i.accounts as any[]).filter((a) => a.signer).map((a) => a.name).join("+"), writable: writable(i).map((a) => a.name).join("+"), returns: JSON.stringify((i as any).returns ?? null) };
});
const w = (s: string) => s.padEnd(26);
let out = `Anchor IDL spec ${(idl as any).metadata?.spec}, program ${(idl as any).metadata?.name} ${(idl as any).metadata?.version} at ${idl.address}\n\n`;
out += w("instruction") + w("class") + w("signers") + w("writable (non-signer)") + "disc-recomputed\n";
for (const r of rows) out += w(r.instruction) + w(r.class.slice(0, 25)) + w(r.signers) + w(r.writable) + (r.discOk ? "sha256(global:name)[..8] matches" : "MISMATCH") + "\n";
out += "\nFull class column:\n" + rows.map((r) => `  ${r.instruction.padEnd(20)} ${r.class}`).join("\n") + "\n";
const surfaceMissing = [...Object.keys(OPERATIONS), ...Object.keys(READS)].filter((n) => !idl.instructions.some((i) => i.name === n));
out += `\nSpec entries missing from the IDL: ${surfaceMissing.length ? surfaceMissing.join(",") : "none"}\n`;
out += `Instructions the spec does not know: ${rows.filter((r) => r.class.startsWith("UNDECLARED")).map((r) => r.instruction).join(", ")}\n`;
out += `Rust pub fn tally_passed (helper): in the IDL? ${idl.instructions.some((i) => i.name === "tally_passed")} (it cannot be called from outside; the IDL lists #[program] entries only)\n`;
out += `\nWhat the IDL carries per instruction (excerpt, vote):\n${JSON.stringify(idl.instructions.find((i) => i.name === "vote"), null, 1)}\n`;
out += `\nIDL errors:\n${JSON.stringify(idl.errors)}\n\nIDL events: ${JSON.stringify((idl as any).events)}\n`;
out += `\nIDL top-level keys: ${Object.keys(idl).join(", ")}\n`;
writeFileSync(new URL("../evidence/q1-classify.txt", import.meta.url), out);
console.log(out.split("\n").slice(0, 22).join("\n"));
