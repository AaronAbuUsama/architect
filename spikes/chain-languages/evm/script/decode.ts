// Q5: raw revert data -> a typed refusal with its stable code. The code table is the blueprint's, not the ABI's.
import { decodeErrorResult, type Abi, type Hex } from "viem";

export const CODES = { AlreadyVoted: "PR-001", ProposalExists: "PR-002", ProposalNotOpen: "PR-900", NotAllowed: "AR-001" } as const;
export const STATES = ["absent", "open", "passed", "failed"] as const;
export const PANICS: Record<number, string> = { 0x01: "assert", 0x11: "overflow", 0x12: "division by zero", 0x21: "bad enum value", 0x32: "array out of bounds", 0x41: "out of memory" };

export type Decoded =
  | { kind: "refusal"; name: keyof typeof CODES; code: string; args: Record<string, unknown>; state?: string }
  | { kind: "own-uncoded"; name: string; args: unknown }          // in our ABI, but the blueprint has no code for it
  | { kind: "foreign"; name: string; args: unknown; from: string } // in someone else's ABI (their error bubbled through)
  | { kind: "panic"; code: number; meaning: string }
  | { kind: "string"; message: string }
  | { kind: "empty" }                                              // revert with no data (also: out of gas has no data)
  | { kind: "unknown"; selector: Hex; data: Hex };                 // a selector no ABI we hold knows

export const decodeRevert = (data: Hex | undefined, own: Abi, others: Record<string, Abi> = {}): Decoded => {
  if (data === undefined || data === "0x") return { kind: "empty" };
  try {
    const r = decodeErrorResult({ abi: own, data });
    if (r.errorName === "Panic") { const c = Number(r.args![0]); return { kind: "panic", code: c, meaning: PANICS[c] ?? "unknown" }; }
    if (r.errorName === "Error") return { kind: "string", message: String(r.args![0]) };
    const names = (own as readonly any[]).find((i) => i.type === "error" && i.name === r.errorName)?.inputs ?? [];
    const args = Object.fromEntries(names.map((n: any, i: number) => [n.name, (r.args as unknown[])[i]]));
    if (r.errorName in CODES) {
      const name = r.errorName as keyof typeof CODES;
      return { kind: "refusal", name, code: CODES[name], args, ...(name === "ProposalNotOpen" ? { state: STATES[Number(args.state)] } : {}) };
    }
    return { kind: "own-uncoded", name: r.errorName, args: r.args };
  } catch { /* not ours */ }
  for (const [from, abi] of Object.entries(others)) {
    try { const r = decodeErrorResult({ abi, data }); return { kind: "foreign", name: r.errorName, args: r.args, from }; } catch { /* next */ }
  }
  return { kind: "unknown", selector: data.slice(0, 10) as Hex, data };
};
