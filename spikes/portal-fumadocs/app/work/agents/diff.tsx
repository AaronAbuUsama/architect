// A diff in Pro's CodeBlock (with its copy button), and the Timeline of versions that skills and agent types share.
import { Chip, Disclosure, Button } from "@heroui/react";
import { Timeline } from "@heroui-pro/react";
import { CodeBlock } from "@heroui-pro/react/code-block";
import type { ReactNode } from "react";
import type { Diff } from "../agent-file.ts";

export const DiffBlock = ({ label, text }: { label: string; text: string }) => (
  <CodeBlock><CodeBlock.Header><span>{label}</span><CodeBlock.CopyButton code={text} /></CodeBlock.Header><CodeBlock.Code code={text} language="diff" /></CodeBlock>
);

export const stat = (d: Diff) => `+${d.added} −${d.removed}`.replace("−", "-");

export type Entry = { key: string; title: ReactNode; meta: ReactNode; note: string; status?: "current" | "warning" | "default"; diff?: Diff; diffLabel?: string; extra?: ReactNode };
/** One Timeline item per version, newest first. Each can open the diff against the version before it. */
export function VersionTimeline({ entries, size = "md" }: { entries: Entry[]; size?: "sm" | "md" }) {
  return (
    <Timeline size={size}>
      {entries.map((e) => (
        <Timeline.Item key={e.key} status={e.status ?? "default"}>
          <Timeline.Rail><Timeline.Marker /><Timeline.Connector /></Timeline.Rail>
          <Timeline.Content>
            <article className="flex min-w-0 flex-col gap-1.5 pb-4">
              <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium">{e.title}</h3>
              <p className="text-xs text-muted">{e.meta}</p>
              <p className="text-sm">{e.note}</p>
              {e.extra}
              {e.diff && e.diff.changed > 0 && (
                <Disclosure>
                  <Disclosure.Heading><Button slot="trigger" size="sm" variant="ghost" className="-ml-2 w-fit">View diff <Chip size="sm" variant="soft">{stat(e.diff)}</Chip></Button></Disclosure.Heading>
                  <Disclosure.Content><Disclosure.Body><DiffBlock label={e.diffLabel ?? "diff"} text={e.diff.text} /></Disclosure.Body></Disclosure.Content>
                </Disclosure>)}
            </article>
          </Timeline.Content>
        </Timeline.Item>))}
    </Timeline>
  );
}
