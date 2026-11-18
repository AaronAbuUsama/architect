import { Button } from "@heroui/react";
import { ListBulletsIcon, TextBolderIcon, TextHIcon } from "@phosphor-icons/react";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { appAction } from "../extension-host/service.tsx";
import type { WorkspaceNote, WorkspacePage } from "../workspace/types.ts";
import "./internal/note-editor.css";

const Notes = ({ page, initial }: { page: WorkspacePage; initial: WorkspaceNote }) => {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial.markdown);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const dirty = saved.markdown.trim() !== draft.trim();
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false } }), Markdown],
    content: initial.markdown,
    contentType: "markdown",
    onUpdate: ({ editor: next }) => setDraft(next.getMarkdown()),
    editorProps: { attributes: { role: "textbox", "aria-label": "Page notes", "aria-multiline": "true" } },
  });

  useEffect(() => {
    if (!dirty) return;
    const confirm = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", confirm);
    return () => window.removeEventListener("beforeunload", confirm);
  }, [dirty]);

  const save = () => {
    setSaving(true);
    setError(undefined);
    void appAction<WorkspaceNote>("save-page-notes", { key: page.key, revision: saved.revision, markdown: draft }, "workspace")
      .then(setSaved)
      .catch((failure: Error) => setError(failure.message))
      .finally(() => setSaving(false));
  };

  return <section className="workspace-note" aria-label="Author notes">
    <div className="workspace-note-head">
      <h2>Notes</h2>
      <div className="workspace-note-toolbar">
        <Button variant="ghost" size="sm" isIconOnly aria-label="Bold" onPress={() => editor?.chain().focus().toggleBold().run()}><TextBolderIcon size={16} /></Button>
        <Button variant="ghost" size="sm" isIconOnly aria-label="Heading" onPress={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><TextHIcon size={16} /></Button>
        <Button variant="ghost" size="sm" isIconOnly aria-label="Bulleted list" onPress={() => editor?.chain().focus().toggleBulletList().run()}><ListBulletsIcon size={16} /></Button>
        <Button variant="secondary" size="sm" isDisabled={!dirty || saving} onPress={save}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </div>
    {saved.stale && <p className="workspace-note-warning">The blueprint changed since these notes were saved. Review them against the reference below.</p>}
    <EditorContent editor={editor} className="workspace-editor" />
    <div className="workspace-note-status" role="status">{error ?? (dirty ? "Unsaved edits" : saved.markdown ? "Saved beside the declaration" : "")}</div>
  </section>;
};

export const PageNotes = ({ page }: { page: WorkspacePage }) => {
  const [loaded, setLoaded] = useState<WorkspaceNote>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    void appAction<{ notes: WorkspaceNote }>("read-page", { key: page.key }).then((value) => {
      if (!cancelled) setLoaded(value.notes);
    }, (failure: Error) => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, [page.key]);
  return loaded ? <Notes page={page} initial={loaded} />
    : <p className="workspace-loading" role="status">{error ?? "Loading notes…"}</p>;
};
