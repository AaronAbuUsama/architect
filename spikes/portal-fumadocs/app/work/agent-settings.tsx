// One agent type's settings, laid out like the HeroUI Pro dashboard template's settings page: sections of rows, the
// label and what it means on the left, the field on the right, a divider between rows, Reset and Save changes at the
// bottom. Nothing saves in place: Save changes reviews the diff of the type's files and opens a pull request.
import { Button, Chip, Separator } from "@heroui/react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { General, Models } from "./agents/general.tsx";
import { Asks, Limits, Tools } from "./agents/limits.tsx";
import { changedFiles, initialDraft, plain, type Draft } from "./agents/draft.ts";
import { Mcps } from "./agents/mcps.tsx";
import { Prompt } from "./agents/prompt.tsx";
import { Review } from "./agents/review.tsx";
import { Skills } from "./agents/skills.tsx";
import { Versions } from "./agents/versions.tsx";
import { promptMarkdown } from "./agent-file.ts";
import { runs, workerOf, workers } from "./fixtures.ts";
import { HeadLink, RunStatus, TYPE_TONE, WorkShell } from "./shell.tsx";

export function meta() { return [{ title: "Agent settings · acme work" }]; }

export default function AgentSettings() {
  const w = workerOf(useParams().type ?? "") ?? workers[0]!;
  return <Settings key={w.id} id={w.id} />;
}

function Settings({ id }: { id: string }) {
  const saved = useMemo(() => initialDraft(workerOf(id)), [id]);
  const [d, setD] = useState<Draft>(saved), [pr, setPr] = useState<number | null>(null);
  const set = (p: Partial<Draft>) => { setPr(null); setD((x) => ({ ...x, ...p })); };
  const setW = (p: Partial<Draft["w"]>) => set({ w: { ...d.w, ...p } });
  const files = changedFiles(saved, d), live = runs.filter((r) => r.worker === id && r.status === "running"), name = plain(d.w.name) || id;
  const promptEdited = promptMarkdown(d.prompt).join("\n") !== promptMarkdown(saved.prompt).join("\n");
  return (
    <WorkShell title={<span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: TYPE_TONE[id] }} />{plain(saved.w.name)}</span>} sub={<>Settings · declared in <code>{saved.w.file}</code></>}
      actions={<>{live.map((r) => <HeadLink key={r.id} to={`/work/r/${r.id}`}><RunStatus s={r.status} /> {r.id} live</HeadLink>)}<HeadLink to="/work/agents">All agent types</HeadLink></>}>
      <form className="mx-auto flex max-w-5xl flex-col gap-4 px-5 pb-10 pt-2" onSubmit={(e) => e.preventDefault()} onReset={(e) => { e.preventDefault(); setD(saved); setPr(null); }}>
        <p className="text-sm text-muted">Changes are proposed as a pull request. Running threads keep the settings they started with.</p>
        <General w={d.w} setW={setW} />
        <Models w={d.w} setW={setW} />
        <Prompt id={id} value={d.prompt} onChange={(prompt) => set({ prompt })} edited={promptEdited} />
        <Skills d={d} saved={saved} set={set} agent={name} />
        <Mcps d={d} set={set} agent={name} />
        <Tools w={d.w} setW={setW} />
        <Limits w={d.w} setW={setW} />
        <Asks w={d.w} setW={setW} />
        <Versions saved={saved} d={d} />
        <Separator />
        <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 bg-background/90 px-1 py-3 backdrop-blur">
          {pr ? <Chip color="success" variant="soft">Pull request #{pr} opened</Chip> : <span className="mr-auto text-sm text-muted">{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} changed` : "Nothing changed"}</span>}
          <Button type="reset" variant="ghost" isDisabled={!files.length && !pr}>Reset</Button>
          <Review files={files} agent={name} branch={`agents/${id}-${files.length}`} proposed={pr !== null} onOpen={() => setPr(214)} />
        </div>
      </form>
    </WorkShell>
  );
}
