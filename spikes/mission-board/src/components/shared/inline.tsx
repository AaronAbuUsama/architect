// The grid's prose carries **bold** and `code`; this renders just those two, nothing else.
import { Fragment } from "react";

export const Inline = ({ text }: { text: string }) => (
  <>
    {text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
      part.startsWith("**") ? <b key={i}>{part.slice(2, -2)}</b>
        : part.startsWith("`") ? <code key={i} className="mono">{part.slice(1, -1)}</code>
        : <Fragment key={i}>{part}</Fragment>)}
  </>
);
