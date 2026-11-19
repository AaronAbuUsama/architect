// Move: a machine move as chips: the states it leaves, an arrow, and the one it reaches.
import type { ReactElement } from "react";
import type { MoveProps } from "../types.ts";

export const Move = ({ from, to }: MoveProps): ReactElement => (
  <span className="move">
    {from.length > 0 ? from.map((f) => <span key={f} className="move__state">{f}</span>) : <span className="move__state move__state--new">new</span>}
    <span className="move__arrow" aria-hidden="true">→</span>
    {to.map((t) => <span key={t} className="move__state move__state--to">{t}</span>)}
  </span>
);
