// Decoder: what arrives from the Aztec client -> the typed refusal with its stable code (spec.md).
// Codes are the blueprint's; the chain only ever carries the strings we put in assert messages (except AlreadyVoted).
export const CODES = { AlreadyVoted: "PR-001", ProposalExists: "PR-002", ProposalNotOpen: "PR-900", NotAllowed: "AR-001" } as const;
export type Tag = keyof typeof CODES;
const TAG_OF = Object.fromEntries(Object.entries(CODES).map(([t, c]) => [c, t])) as Record<string, Tag>;
const STATE = ["absent", "open", "passed", "failed"] as const;

export type Decoded =
  | { readonly _tag: Tag; readonly code: string; readonly state?: (typeof STATE)[number]; readonly via: string }
  | { readonly _tag: "NoCodeOfOurs"; readonly kind: string; readonly message: string };

/** `op` matters: a nullifier refusal means AlreadyVoted only for `vote` (the one op whose nullifier is user-repeatable). */
export function decode(op: string, error: unknown): Decoded {
  const message = String((error as Error)?.message ?? error);
  const coded = /\[((?:AR|PR)-\d{3})\]/.exec(message);
  if (coded && TAG_OF[coded[1]!]) {
    const tag = TAG_OF[coded[1]!]!;
    const state = tag === "ProposalNotOpen" ? STATE[Number(/state: (\d+)/.exec(message)?.[1])] : undefined;
    return { _tag: tag, code: coded[1]!, ...(state ? { state } : {}), via: "assert message" };
  }
  if (op === "vote" && /Nullifier collision|Existing nullifier|Nullifier conflict with existing tx/i.test(message))
    return { _tag: "AlreadyVoted", code: CODES.AlreadyVoted, via: "nullifier refusal (simulation: AVM collision; node: Existing nullifier / pending conflict)" };
  if (/reverted: reverted\. Reason: unknown/.test(message))
    return { _tag: "NoCodeOfOurs", kind: "mined-but-reverted (receipt carries a revert code, never the reason)", message: message.slice(0, 160) };
  const kind = /can only be called by the same contract/.test(message) ? "only_self guard"
    : /overflow/.test(message) ? "arithmetic (someone else's contract)"
    : /Nullifier/i.test(message) ? "nullifier (non-vote op)" : "other";
  return { _tag: "NoCodeOfOurs", kind, message: message.split("\n")[0]!.slice(0, 160) };
}
