// A page's prose: what a person or an agent wrote, pinned to a hash. Stale prose turns amber, says what changed, and is kept.
import { useActionMutation } from "@agent-native/core/client";
import { useState } from "react";

import { cn } from "@/lib/utils";

type Any = any;

export const ProseBlock = ({ path, file, prose, refresh }: { path: string; file?: string; prose: Any; refresh: () => void }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const write = useActionMutation("write-prose", { onSuccess: () => { setEditing(false); refresh(); } });
  if (editing || !prose) {
    return editing ? (
      <div className="my-3">
        <textarea className="min-h-28 w-full rounded border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-1 flex gap-2 text-xs"><button type="button" className="rounded bg-slate-900 px-2 py-0.5 text-white" onClick={() => write.mutate({ path, text })}>Save, pinned to today's hash</button><button type="button" onClick={() => setEditing(false)}>Cancel</button><span className="ml-auto font-mono text-slate-400">{file}</span></div>
      </div>
    ) : (
      <button type="button" className="my-2 text-xs text-slate-400 hover:text-slate-600" onClick={() => { setText(""); setEditing(true); }}>+ Write about this ({file})</button>
    );
  }
  const stale = prose.state === "stale";
  const orphan = prose.state === "orphan";
  return (
    <div className={cn("my-4 border-l-[3px] py-0.5 pl-3", stale || orphan ? "border-amber-500 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/30" : prose.by === "agent" ? "border-indigo-300" : "border-slate-200")}>
      <div className="mb-0.5 text-[11.5px] text-slate-400">written by {prose.by} · about <code>{prose.about}@{prose.hash.slice(0, 8)}</code> · <span className="font-mono">{prose.file}</span></div>
      <div className="whitespace-pre-wrap text-[14px] leading-relaxed">{prose.text}</div>
      {stale ? (
        <div className="mt-1 text-xs text-amber-700">
          {prose.about.split(":")[1]} changed after this was written ({prose.hash.slice(0, 8)} → {prose.now?.slice(0, 8)}): {prose.parts.map((p: Any) => <span key={p.part}><code className="rounded bg-amber-100 px-1">{p.part}</code> {p.detail}; </span>)}
          <button type="button" className="ml-1 rounded border border-amber-300 bg-white px-1.5" onClick={() => write.mutate({ path, stillTrue: true })}>Still true</button>
          <button type="button" className="ml-1 rounded border border-slate-300 bg-white px-1.5" onClick={() => { setText(prose.text); setEditing(true); }}>Rewrite</button>
        </div>
      ) : orphan ? (
        <div className="mt-1 text-xs text-amber-700">What this is about is no longer in the model. It is kept until someone deletes {prose.file}.</div>
      ) : (
        <button type="button" className="mt-1 text-[11px] text-slate-400 hover:text-slate-600" onClick={() => { setText(prose.text); setEditing(true); }}>Edit</button>
      )}
    </div>
  );
};
