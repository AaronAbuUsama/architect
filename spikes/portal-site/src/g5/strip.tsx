// The strip at the top of each G5 drawing: which question, which option, and what changes between the options.
import { Chip } from "@heroui/react";
import type { ReactNode } from "react";
import { WithOpt, type TreeRow } from "../opt.tsx";

export type Option = { q: string; letter: string; name: string; recommended?: boolean; changes: string };

export const Strip = ({ o }: { o: Option }) => (
  <div className="r3-strip g5-strip">
    <Chip size="sm" variant="soft">G5 · {o.q}</Chip>
    <Chip size="sm" variant="soft" color={o.recommended ? "success" : "default"}>option {o.letter}{o.recommended ? ", recommended" : ""}</Chip>
    <b>{o.name}</b>
    <span>{o.changes} Counts are illustrative.</span>
  </div>
);

/** A drawing: round 4's portal with the G5 strip, and rows added to the tree where an option needs them. */
export const Drawing = ({ o, treeRows, children }: { o: Option; treeRows?: Record<string, TreeRow[]>; children: ReactNode }) =>
  <WithOpt opt={{ strip: <Strip o={o} />, treeRows }}>{children}</WithOpt>;
