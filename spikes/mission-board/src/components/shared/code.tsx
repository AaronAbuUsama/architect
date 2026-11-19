// A code block in HeroUI Pro's code-block style, highlighted by shiki's core with only the languages the pages use.
// Pro's own CodeBlock imports all of shiki (9.7 MB in this bundle), so this keeps Pro's classes and loads two grammars.
import { Button } from "@heroui/react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/dist/langs/bash.mjs";
import typescript from "shiki/dist/langs/typescript.mjs";
import githubDark from "shiki/dist/themes/github-dark-default.mjs";

const highlighter = createHighlighterCoreSync({ themes: [githubDark], langs: [bash, typescript], engine: createJavaScriptRegexEngine() });

export interface CodeProps {
  readonly code: string;
  readonly language: "bash" | "typescript";
  readonly label?: string;
}

export const Code = ({ code, language, label }: CodeProps) => {
  const html = useMemo(() => highlighter.codeToHtml(code, { lang: language, theme: "github-dark-default" }), [code, language]);
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-block doc-code">
      <div className="code-block__header">
        <span className="doc-code-label">{label ?? language}</span>
        <Button isIconOnly size="sm" variant="ghost" aria-label="Copy code"
          onPress={() => { void navigator.clipboard?.writeText(code); setCopied(true); }}>
          {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
        </Button>
      </div>
      <div className="code-block__code" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};
