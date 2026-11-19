// A page's notes, the way the experimental portal's operation pages keep them (internal/portal-pro, note-editor):
// a tiptap editor over markdown, with a stale warning when what it's about changed since the notes were written.
// The prototype holds edits in the page; saving beside the card is the conductor's write, not the board's.
import { Button } from "@heroui/react";
import { ListBulletsIcon, TextBolderIcon, TextHIcon } from "@phosphor-icons/react";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

export interface PageNotesProps {
  readonly markdown: string;
  /** True when the grid was regraded after these notes were written. */
  readonly stale: boolean;
}

export const PageNotes = ({ markdown, stale }: PageNotesProps) => {
  const [draft, setDraft] = useState(markdown);
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false } }), Markdown],
    content: markdown,
    contentType: "markdown",
    immediatelyRender: true,
    onUpdate: ({ editor: next }) => setDraft(next.getMarkdown()),
    editorProps: { attributes: { role: "textbox", "aria-label": "Notes", "aria-multiline": "true" } },
  });
  const dirty = draft.trim() !== markdown.trim();
  return (
    <section className="notes" aria-label="Notes">
      <div className="notes-head">
        <h2 className="doc-h2">Notes</h2>
        <div className="notes-toolbar">
          <Button variant="ghost" size="sm" isIconOnly aria-label="Bold" onPress={() => editor?.chain().focus().toggleBold().run()}><TextBolderIcon size={16} /></Button>
          <Button variant="ghost" size="sm" isIconOnly aria-label="Heading" onPress={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><TextHIcon size={16} /></Button>
          <Button variant="ghost" size="sm" isIconOnly aria-label="Bulleted list" onPress={() => editor?.chain().focus().toggleBulletList().run()}><ListBulletsIcon size={16} /></Button>
        </div>
      </div>
      {stale && <p className="notes-warning">The grid was regraded since these notes were written. Check them against the page above.</p>}
      <EditorContent editor={editor} className="notes-editor" />
      <p className="notes-status" role="status">{dirty ? "Edited here; not saved in the prototype" : markdown ? "Saved beside the card" : ""}</p>
    </section>
  );
};
