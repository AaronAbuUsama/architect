// A generated doc, shown as the page it is: its Markdown rendered, without the `Generated from … Do not edit.` comment that opens it.
import { Markdown } from "@orthograph/portal-ui";
import type { ReactElement } from "react";

export const Doc = ({ text }: { readonly text: string }): ReactElement => (
  <div className="doc-body"><Markdown>{text.replace(/^<!--.*?-->\s*/s, "")}</Markdown></div>
);
