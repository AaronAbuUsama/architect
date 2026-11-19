// KeyPath and Move: two shapes that were dot- or bar-separated text. KeyPath is a grouping key read left to right
// (an issue's operation, step and error); Move is a machine move, the states it leaves and the one it reaches.
import { Chip } from "@heroui/react";
import { ArrowRightIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import { Fragment } from "react";

export const KeyPath = ({ parts, tone }: { parts: string[]; tone?: "danger" | "warning" }) => (
  <span className="key-path">{parts.map((p, i) => (
    <Fragment key={p + i}>{i > 0 && <CaretRightIcon size={10} aria-hidden="true" />}
      <Chip size="sm" variant="soft" color={i === parts.length - 1 ? tone ?? "default" : "default"} className="mono">{p}</Chip></Fragment>))}</span>
);

/** A move: from any of `from` (none means it creates) to `to`. */
export const Move = ({ from, to }: { from: string[]; to: string[] }) => (
  <span className="move">
    {from.length ? from.map((f) => <Chip key={f} size="sm" variant="secondary" className="mono">{f}</Chip>) : <Chip size="sm" variant="soft">new</Chip>}
    <ArrowRightIcon size={12} aria-hidden="true" />
    {to.map((t) => <Chip key={t} size="sm" variant="soft" color="accent" className="mono">{t}</Chip>)}
  </span>
);
