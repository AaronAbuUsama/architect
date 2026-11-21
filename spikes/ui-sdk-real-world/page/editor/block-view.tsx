// One block: UI SDK's TriggerMenu ("/" opens the block menu at the caret), its textarea, a Checkbox for a to-do, and a
// Menu behind the drag handle. Everything a person or an agent can touch is a UI SDK component.
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@ui-sdk/react/button";
import { Checkbox, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuShortcut, MenuTrigger } from "@ui-sdk/react/menu";
import { Separator } from "@ui-sdk/react/separator";
import {
  TriggerMenu, TriggerMenuContent, TriggerMenuEmpty, TriggerMenuGroup, TriggerMenuGroupLabel, TriggerMenuInput, TriggerMenuItem,
  TriggerMenuItemIcon, TriggerMenuList,
} from "@ui-sdk/react/trigger-menu";
import { kinds, type Block, type BlockType } from "./blocks.ts";

export type BlockEvents = {
  readonly text: (text: string) => void;
  readonly turnInto: (type: BlockType, text: string, checked?: boolean) => void;
  readonly check: (checked: boolean) => void;
  /** Enter: the text before the caret stays, the text after it starts a new block. */
  readonly split: (before: string, after: string) => void;
  /** Backspace with the caret at the start. */
  readonly joinUp: () => void;
  readonly move: (by: -1 | 1) => void;
  readonly addBelow: () => void;
  readonly duplicate: () => void;
  readonly remove: () => void;
};

const placeholders: Partial<Record<BlockType, string>> = {
  p: "Type '/' for commands", h1: "Heading 1", h2: "Heading 2", h3: "Heading 3", bullet: "List", number: "List",
  todo: "To-do", quote: "Empty quote", callout: "Type something…", code: "",
};

export const BlockView = ({ block, number, on, focusRef }: { block: Block; number: number; on: BlockEvents; focusRef: (el: HTMLTextAreaElement | null) => void }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  // Uncontrolled on purpose: UI SDK reads the native input event and re-renders synchronously before React's onChange
  // runs, so a controlled `value` snaps back and eats the "/" that opens the menu. The text is pushed in only when it
  // changed from outside (a shortcut, a split, a join).
  const input = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    if (input.current && input.current.value !== block.text) input.current.value = block.text;
  }, [block.text]);

  const keys = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (menuOpen || event.defaultPrevented || event.nativeEvent.isComposing) return;
    const el = event.currentTarget;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    if (event.key === "Enter" && !event.shiftKey && block.type !== "code") {
      event.preventDefault();
      on.split(block.text.slice(0, el.selectionStart), block.text.slice(el.selectionEnd));
    } else if (event.key === "Backspace" && atStart) {
      event.preventDefault();
      on.joinUp();
    } else if (event.key === "ArrowUp" && !el.value.slice(0, el.selectionStart).includes("\n")) {
      event.preventDefault();
      on.move(-1);
    } else if (event.key === "ArrowDown" && !el.value.slice(el.selectionEnd).includes("\n")) {
      event.preventDefault();
      on.move(1);
    }
  };

  const marker =
    block.type === "bullet" ? <span className="marker bullet" aria-hidden="true">•</span>
    : block.type === "number" ? <span className="marker number" aria-hidden="true">{number}.</span>
    : block.type === "callout" ? <span className="marker callout" aria-hidden="true">💡</span>
    : block.type === "todo" ? (
      <Checkbox className="marker todo" aria-label={`Done: ${block.text || "to-do"}`} checked={!!block.checked} onCheckedChange={(c: boolean) => on.check(c)}>
        <CheckboxIndicator />
      </Checkbox>
    ) : null;

  return (
    <div className={`block t-${block.type}${block.checked ? " is-checked" : ""}${focused ? " is-focused" : ""}`} data-block={block.id}>
      <div className="gutter">
        <Button className="gutter-button" aria-label="Add a block below" onClick={on.addBelow}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
        </Button>
        <Menu>
          <MenuTrigger className="gutter-button handle" aria-label={`Block actions: ${block.text.slice(0, 40) || block.type}`}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5.5" cy="4" r="1.1" /><circle cx="10.5" cy="4" r="1.1" /><circle cx="5.5" cy="8" r="1.1" /><circle cx="10.5" cy="8" r="1.1" /><circle cx="5.5" cy="12" r="1.1" /><circle cx="10.5" cy="12" r="1.1" /></svg>
          </MenuTrigger>
          <MenuContent className="block-menu" align="start">
            {kinds.filter((k) => k.type !== "divider").slice(0, 7).map((k) => (
              <MenuItem key={k.type} onSelect={() => on.turnInto(k.type, block.text)}>Turn into {k.label.toLowerCase()}</MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem onSelect={on.duplicate}>Duplicate<MenuShortcut>⌘D</MenuShortcut></MenuItem>
            <MenuItem destructive onSelect={on.remove}>Delete<MenuShortcut>Del</MenuShortcut></MenuItem>
          </MenuContent>
        </Menu>
      </div>
      {marker}
      {block.type === "divider" ? (
        <Separator className="divider" />
      ) : (
        <TriggerMenu
          triggers={[{ char: "/" }]}
          onOpenChange={(open: boolean) => setMenuOpen(open)}
          onSelect={(value: string, details) => {
            details.preventDefault();
            on.turnInto(value as BlockType, block.text.slice(0, details.match.start) + block.text.slice(details.match.end));
          }}
        >
          <TriggerMenuInput
            ref={(el) => { input.current = el; focusRef(el); }}
            className="block-input"
            rows={1}
            spellCheck={block.type !== "code"}
            aria-label={block.type === "p" ? "Text" : (kinds.find((k) => k.type === block.type)?.label ?? "Text")}
            placeholder={focused || block.type !== "p" ? placeholders[block.type] : ""}
            defaultValue={block.text}
            onInput={(e) => on.text(e.currentTarget.value)}
            onKeyDown={keys}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <TriggerMenuContent className="slash" align="start" sideOffset={6}>
            <TriggerMenuList>
              <TriggerMenuGroup>
                <TriggerMenuGroupLabel>Basic blocks</TriggerMenuGroupLabel>
                {kinds.map((k) => (
                  <TriggerMenuItem key={k.type} value={k.type} label={k.label}>
                    <TriggerMenuItemIcon className="slash-glyph">{k.glyph}</TriggerMenuItemIcon>
                    <span className="slash-text"><span className="slash-label">{k.label}</span><span className="slash-hint">{k.hint}</span></span>
                  </TriggerMenuItem>
                ))}
              </TriggerMenuGroup>
            </TriggerMenuList>
            <TriggerMenuEmpty>No results</TriggerMenuEmpty>
          </TriggerMenuContent>
        </TriggerMenu>
      )}
    </div>
  );
};
