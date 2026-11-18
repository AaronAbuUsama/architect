// The system prompt, in Pro's RichTextEditor. It is saved as <id>.prompt.md beside the type's file, so a prompt change
// is a reviewed change like any other.
import { ArrowRotateLeft, ArrowRotateRight, Bold, Code, Heading2, Heading3, Italic, Link as LinkIcon, ListOl, ListUl, QuoteClose, Terminal } from "@gravity-ui/icons";
import { Chip } from "@heroui/react";
import { RichTextEditor } from "@heroui-pro/react/rich-text-editor";
import type { JSONContent } from "@tiptap/core";
import { VERSIONS } from "../agent-fixtures.ts";
import type { ComponentType } from "react";
import { Section } from "./rows.tsx";

type Cmd = "bold" | "italic" | "code" | "heading-2" | "heading-3" | "bulletList" | "orderedList" | "blockquote" | "codeBlock";
const ICON: Record<Cmd, ComponentType> = { bold: Bold, italic: Italic, code: Code, "heading-2": Heading2, "heading-3": Heading3, bulletList: ListUl, orderedList: ListOl, blockquote: QuoteClose, codeBlock: Terminal };
const FORMATS: Cmd[][] = [["bold", "italic", "code"], ["heading-2", "heading-3"], ["bulletList", "orderedList", "blockquote", "codeBlock"]];
const Fmt = ({ c }: { c: Cmd }) => { const I = ICON[c]; return <RichTextEditor.ToggleButton command={c}><I /></RichTextEditor.ToggleButton>; };

export function Prompt({ id, value, onChange, edited }: { id: string; value: JSONContent; onChange: (v: JSONContent) => void; edited: boolean }) {
  const last = VERSIONS[id]!.find((v) => v.areas.includes("prompt")) ?? VERSIONS[id]!.at(-1)!;
  return (
    <Section id="prompt" title="System prompt" does="Everything the agent is told before the first turn. Select text for the formatting menu.">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Chip size="sm" variant="soft">Prompt v{last.v}</Chip>
        <span>last changed {last.date} by {last.who}, in pull request #{last.pr}</span>
        {edited && <Chip size="sm" color="warning" variant="soft">Edited, not saved</Chip>}
      </div>
      <RichTextEditor value={value} onValueChange={onChange} placeholder="Tell the agent who it is and what it must not do.">
        <RichTextEditor.Shell>
          <RichTextEditor.Toolbar>
            <RichTextEditor.ToolbarGroup><RichTextEditor.ActionButton action="undo"><ArrowRotateLeft /></RichTextEditor.ActionButton><RichTextEditor.ActionButton action="redo"><ArrowRotateRight /></RichTextEditor.ActionButton></RichTextEditor.ToolbarGroup>
            {FORMATS.map((g) => <RichTextEditor.ToolbarGroup key={g[0]}>{g.map((c) => <Fmt key={c} c={c} />)}</RichTextEditor.ToolbarGroup>)}
            <RichTextEditor.ToolbarGroup>
              <RichTextEditor.LinkPopover>
                <RichTextEditor.LinkPopover.Trigger><LinkIcon /></RichTextEditor.LinkPopover.Trigger>
                <RichTextEditor.LinkPopover.Content><RichTextEditor.LinkPopover.Input /><RichTextEditor.LinkPopover.Actions><RichTextEditor.LinkPopover.UnsetButton /><RichTextEditor.LinkPopover.ApplyButton /></RichTextEditor.LinkPopover.Actions></RichTextEditor.LinkPopover.Content>
              </RichTextEditor.LinkPopover>
            </RichTextEditor.ToolbarGroup>
          </RichTextEditor.Toolbar>
          <RichTextEditor.Content />
          <RichTextEditor.BubbleMenu><Fmt c="bold" /><Fmt c="italic" /><Fmt c="code" /></RichTextEditor.BubbleMenu>
          <RichTextEditor.Footer><RichTextEditor.CharacterCount showWords /></RichTextEditor.Footer>
        </RichTextEditor.Shell>
      </RichTextEditor>
    </Section>
  );
}
