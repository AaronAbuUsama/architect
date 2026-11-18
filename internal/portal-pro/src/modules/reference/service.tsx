import { CodeBlock } from "@heroui-pro/react/code-block";
import { getTableOfContents } from "fumadocs-core/content/toc";
import { AnchorProvider, TOCItem } from "fumadocs-core/toc";
import { isValidElement, useMemo, type ReactNode } from "react";
import Markdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import "./internal/reference.css";

export const Reference = ({ markdown, linkTo, children }: {
  markdown: string;
  linkTo?: (href: string) => string;
  children?: ReactNode;
}) => {
  const toc = useMemo(() => getTableOfContents(markdown), [markdown]);
  const outline = <ul>{toc.map((item) => <li key={item.url}>
    <TOCItem href={item.url}>{item.title}</TOCItem>
  </li>)}</ul>;

  return <AnchorProvider toc={toc}>
    <div className="op-docs">
      <div className="reference-column">
        {children}
        {toc.length > 0 && <details className="reference-mobile-outline"><summary>On this page</summary>{outline}</details>}
        <article className="op-article">
          <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={{
            a: ({ href, children }) => <a href={href && (linkTo ? linkTo(href) : href)}>{children}</a>,
            table: ({ children }) => <div className="op-doc-table"><table>{children}</table></div>,
            pre: ({ children }) => {
              if (!isValidElement<{ className?: string; children?: ReactNode }>(children) || typeof children.props.children !== "string") {
                return <pre>{children}</pre>;
              }
              const code = children.props.children.trimEnd();
              const language = children.props.className?.replace(/^language-/u, "") ?? "text";
              return <CodeBlock className="reference-code-block">
                <CodeBlock.Header><span>{language === "sh" ? "Shell" : language}</span><CodeBlock.CopyButton code={code} aria-label="Copy code" /></CodeBlock.Header>
                <CodeBlock.Code code={code} language={language} />
              </CodeBlock>;
            },
          }}>{markdown}</Markdown>
        </article>
      </div>
      {toc.length > 0 && <nav className="op-toc" aria-label="On this page">
        <p>On this page</p>
        {outline}
      </nav>}
    </div>
  </AnchorProvider>;
};
