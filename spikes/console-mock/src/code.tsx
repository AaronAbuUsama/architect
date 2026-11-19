// Pre-highlights code with shiki so the static mockup shows what CodeBlock shows after hydration.
import { CodeBlock } from "@heroui-pro/react/code-block";
import { codeToHtml } from "shiki";

export const highlight = (code: string, lang: string) => codeToHtml(code, { lang, theme: "github-dark-default" });

export const Code = ({ title, code, html }: { title: string; code: string; html: string }) => (
  <CodeBlock className="code">
    <CodeBlock.Header><span className="mono">{title}</span><CodeBlock.CopyButton code={code} /></CodeBlock.Header>
    <div className="code-block__code" data-slot="code-block-code" dangerouslySetInnerHTML={{ __html: html }} />
  </CodeBlock>
);
