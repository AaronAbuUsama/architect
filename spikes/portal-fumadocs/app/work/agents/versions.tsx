// Versions of this agent type: a Timeline of who changed what, the pull request, which threads ran on it, and the diff
// of the type's file against the version before.
import { Link as HeroLink } from "@heroui/react";
import { Link } from "react-router";
import { VERSIONS } from "../agent-fixtures.ts";
import { lineDiff } from "../agent-file.ts";
import { VersionTimeline, type Entry } from "./diff.tsx";
import { changedFiles, fileAt, type Draft } from "./draft.ts";
import { Section } from "./rows.tsx";

export function Versions({ saved, d }: { saved: Draft; d: Draft }) {
  const vs = VERSIONS[saved.w.id]!, pending = changedFiles(saved, d);
  const entries: Entry[] = [
    ...(pending.length ? [{ key: "draft", title: "Unsaved changes", meta: `${pending.length} file${pending.length === 1 ? "" : "s"} · becomes the next version once its pull request merges`, note: "Review them with Save changes.", status: "warning" as const, diff: lineDiff(fileAt(saved.w, 0), fileAt(d.w, 0)), diffLabel: d.w.file }] : []),
    ...vs.map((v, i): Entry => ({
      key: String(v.v), status: i === 0 ? "current" : "default", title: <>Version {v.v}{i === 0 && <span className="text-xs font-normal text-success">current</span>}</>,
      meta: <>{v.date} by {v.who} · <HeroLink href={`https://github.com/acme/architect/pull/${v.pr}`} target="_blank" rel="noreferrer">pull request #{v.pr}<HeroLink.Icon /></HeroLink></>,
      note: v.summary, diff: vs[i + 1] ? lineDiff(fileAt(saved.w, i + 1), fileAt(saved.w, i)) : undefined, diffLabel: `${saved.w.file} v${v.v - 1} to v${v.v}`,
      extra: <p className="text-xs text-muted">{v.threads.length ? <>Threads that ran on it: {v.threads.map((r) => <Link key={r} to={`/work/r/${r}`} className="mr-1.5 text-accent hover:underline">{r}</Link>)}</> : "No threads ran on it yet."}</p>,
    })),
  ];
  return (
    <Section id="versions" title="Versions" does="Every change to this type landed as a pull request. A thread records the version it ran on, so its result can be read against the settings it had.">
      <VersionTimeline entries={entries} />
    </Section>
  );
}
