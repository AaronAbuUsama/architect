// One agent type's settings, laid out like a HeroUI settings page: sections of rows, the label and what it means on the
// left, the control on the right. Nothing saves in place: changes collect into a diff of the type's file, proposed as a
// pull request, so every thread records the settings it ran on.
import { Button, Checkbox, CheckboxGroup, Chip, Input, Label, ListBox, Modal, NumberField, Radio, RadioGroup, Select, Switch, Tag, TagGroup, TextArea, TextField } from "@heroui/react";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { workerFile, lineDiff } from "./agent-file.ts";
import { catalog, runs, workerOf, workers } from "./fixtures.ts";
import { Md } from "./output.tsx";
import { HeadLink, RunStatus, TYPE_TONE, WorkShell } from "./shell.tsx";
import { runStats } from "./thread.tsx";
import type { Kind, WorkerType } from "./types.ts";

export function meta() { return [{ title: "Agent settings · acme work" }]; }
const KINDS: Kind[] = ["specify", "design machine", "validate machine", "build", "prove", "promote", "spike"];

function Section({ title, does, children }: { title: string; does: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface shadow-surface">
      <header className="border-b border-separator px-5 py-3.5"><h2 className="font-semibold">{title}</h2><p className="text-sm text-muted">{does}</p></header>
      <div className="divide-y divide-separator">{children}</div>
    </section>
  );
}
function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 px-5 py-4 md:grid-cols-[14rem_1fr]">
      <div><div className="text-sm font-medium">{label}</div>{hint && <div className="text-xs text-muted">{hint}</div>}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
const Num = ({ label, value, set, min, step = 1, unit }: { label: string; value: number; set: (n: number) => void; min: number; step?: number; unit?: string }) => (
  <NumberField value={value} onChange={set} minValue={min} step={step} className="w-40">
    <Label className="text-xs text-muted">{label}{unit && ` (${unit})`}</Label>
    <NumberField.Group><NumberField.DecrementButton /><NumberField.Input /><NumberField.IncrementButton /></NumberField.Group>
  </NumberField>
);

function Models({ w, set }: { w: WorkerType; set: (p: Partial<WorkerType>) => void }) {
  const mine = runs.filter((r) => r.worker === w.id);
  const allow = (ids: string[]) => set({ models: [...w.models.filter((m) => ids.includes(m)), ...ids.filter((m) => !w.models.includes(m))] });
  const makeDefault = (id: string) => set({ models: [id, ...w.models.filter((m) => m !== id)] });
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <CheckboxGroup aria-label="Allowed models" value={w.models} onChange={allow}>
        <RadioGroup aria-label="Default model" value={w.models[0] ?? null} onChange={makeDefault}>
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary text-left text-xs text-muted"><tr><th className="px-3 py-2 font-medium">Allowed</th><th className="font-medium">Default</th><th className="font-medium">Price (per M in · out)</th><th className="font-medium">Threads</th><th className="font-medium">Passed</th><th className="pr-3 font-medium">Tool calls failed</th></tr></thead>
            <tbody>{catalog.models.map((m) => { const on = w.models.includes(m.id), rs = mine.filter((r) => r.model === m.id), st = rs.map(runStats), tools = st.reduce((a, s) => a + s.tools, 0), fails = st.reduce((a, s) => a + s.toolFails, 0); return (
              <tr key={m.id} className={`border-t border-separator ${on ? "" : "text-muted"}`}>
                <td className="px-3 py-2"><Checkbox value={m.id}><Checkbox.Content><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><span className="flex flex-col"><Label className="font-mono text-xs">{m.id}</Label><span className="text-xs text-muted">{m.by}</span></span></Checkbox.Content></Checkbox></td>
                <td><Radio value={m.id} isDisabled={!on} aria-label={`Make ${m.id} the default`}><Radio.Content><Radio.Control><Radio.Indicator /></Radio.Control></Radio.Content></Radio></td>
                <td className="tabular-nums">${m.inPerM} · ${m.outPerM}</td>
                <td>{rs.length ? rs.map((r) => <Link key={r.id} to={`/work/r/${r.id}`} className="mr-1.5 inline-flex items-center gap-1 text-accent hover:underline"><RunStatus s={r.status} />{r.id}</Link>) : <span className="text-muted">–</span>}</td>
                <td className="tabular-nums">{rs.length ? `${rs.filter((r) => r.status === "passed").length} of ${rs.filter((r) => r.status !== "running").length}` : "–"}</td>
                <td className={`pr-3 tabular-nums ${fails ? "text-danger" : ""}`}>{tools ? `${fails} of ${tools}` : "–"}</td>
              </tr>); })}</tbody>
          </table>
        </RadioGroup>
      </CheckboxGroup>
    </div>
  );
}

const Picks = ({ label, all, value, set }: { label: string; all: string[]; value: string[]; set: (v: string[]) => void }) => (
  <TagGroup aria-label={label} selectionMode="multiple" selectedKeys={new Set(value)} onSelectionChange={(s) => set(all.filter((x) => s === "all" || s.has(x)))}>
    <TagGroup.List className="flex flex-wrap gap-1.5">{all.map((x) => <Tag key={x} id={x} className="font-mono text-xs">{x}</Tag>)}</TagGroup.List>
  </TagGroup>
);

export default function AgentSettings() {
  const saved = workerOf(useParams().type ?? "") ?? workers[0]!;
  const [w, setW] = useState<WorkerType>(saved), [asked, setAsked] = useState("");
  const [proposed, setProposed] = useState(false);
  const set = (p: Partial<WorkerType>) => { setProposed(false); setW((x) => ({ ...x, ...p })); };
  const limits = (p: Partial<WorkerType["limits"]>) => set({ limits: { ...w.limits, ...p } });
  const diff = lineDiff(workerFile(saved), workerFile(w));
  const live = runs.filter((r) => r.worker === w.id && r.status === "running");
  return (
    <WorkShell key={saved.id} title={<span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: TYPE_TONE[w.id] }} />{saved.name}</span>} sub={<>Settings · declared in <code>{w.file}</code></>}
      actions={<>{live.map((r) => <HeadLink key={r.id} to={`/work/r/${r.id}`}>● {r.id} live</HeadLink>)}<HeadLink to="/work/agents">All agent types</HeadLink></>}>
      <div className="mx-auto flex max-w-4xl flex-col gap-5 px-6 py-6 pb-28">
        <Section title="General" does="What this agent is for, and which tasks a manager may give it.">
          <Row label="Name"><TextField value={w.name} onChange={(name) => set({ name })} aria-label="Name"><Input className="max-w-sm" /></TextField></Row>
          <Row label="What it does" hint="Shown to the manager when it picks an agent."><TextField value={w.does} onChange={(does) => set({ does })} aria-label="What it does"><TextArea rows={2} /></TextField></Row>
          <Row label="Task kinds" hint="The board's kinds it may be started on.">
            <CheckboxGroup aria-label="Task kinds" value={w.kinds} onChange={(v) => set({ kinds: v as Kind[] })} className="flex flex-row flex-wrap gap-x-5 gap-y-2">
              {KINDS.map((k) => <Checkbox key={k} value={k}><Checkbox.Content><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Label>{k}</Label></Checkbox.Content></Checkbox>)}
            </CheckboxGroup>
          </Row>
        </Section>
        <Section title="Models" does="Every model it may run on. The manager picks one per thread from these; the thread records which.">
          <div className="p-4"><Models w={w} set={set} /></div>
        </Section>
        <Section title="Capabilities" does="Its skills, the MCP servers it can reach and the tools in its grant. A call outside the grant is refused and shows as a failed tool call.">
          <Row label="Skills" hint="From .agents/skills"><Picks label="Skills" all={catalog.skills} value={w.skills} set={(skills) => set({ skills })} /></Row>
          <Row label="MCP servers">
            <div className="flex flex-col gap-3">{catalog.mcps.map((m) => (
              <Switch key={m.id} isSelected={w.mcps.includes(m.id)} onChange={(on) => set({ mcps: on ? [...w.mcps, m.id] : w.mcps.filter((x) => x !== m.id) })}>
                <Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control><span className="flex flex-col"><Label className="font-mono text-sm">{m.id}</Label><span className="text-xs text-muted">{m.does}</span></span></Switch.Content>
              </Switch>))}</div>
          </Row>
          <Row label="Tools" hint="Its grant"><Picks label="Tools" all={catalog.tools} value={w.tools} set={(tools) => set({ tools })} /></Row>
        </Section>
        <Section title="Sandbox and limits" does="Where its commands run, and the hard stops on one thread. The manager is told when one trips.">
          <Row label="Sandbox">
            <Select aria-label="Sandbox" selectedKey={w.sandbox ?? "none"} onSelectionChange={(k) => set({ sandbox: k === "none" ? null : String(k) })} className="max-w-sm">
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover><ListBox>
                <ListBox.Item id="none" textValue="None">None: it only reads<ListBox.ItemIndicator /></ListBox.Item>
                {catalog.sandboxes.map((s) => <ListBox.Item key={s.id} id={s.id} textValue={s.id}><span className="flex flex-col"><span>{s.id}</span><span className="text-xs text-muted">{s.does}</span></span><ListBox.ItemIndicator /></ListBox.Item>)}
              </ListBox></Select.Popover>
            </Select>
          </Row>
          <Row label="Budget and stops">
            <div className="flex flex-wrap gap-4">
              <Num label="Budget" unit={w.id === "manager" ? "$ a day" : "$ a thread"} value={w.budgetUsd} set={(budgetUsd) => set({ budgetUsd })} min={0.5} step={0.5} />
              <Num label="Max turns" value={w.limits.maxTurns} set={(maxTurns) => limits({ maxTurns })} min={1} step={10} />
              <Num label="Timeout" unit="min" value={w.limits.timeoutMin} set={(timeoutMin) => limits({ timeoutMin })} min={1} step={5} />
              <Num label="At once" unit="threads" value={w.limits.parallel} set={(parallel) => limits({ parallel })} min={1} />
            </div>
          </Row>
          <Row label="Must ask first" hint="It stops and asks its manager, who asks you.">
            <TagGroup aria-label="Must ask first" onRemove={(keys) => set({ asks: w.asks.filter((a) => !keys.has(a)) })}>
              <TagGroup.List className="flex flex-wrap gap-1.5" renderEmptyState={() => <span className="text-sm text-muted">Nothing: it never stops to ask.</span>}>{w.asks.map((a) => <Tag key={a} id={a}>{a}<Tag.RemoveButton /></Tag>)}</TagGroup.List>
            </TagGroup>
            <form className="mt-2 flex max-w-sm gap-2" onSubmit={(e) => { e.preventDefault(); if (asked.trim()) { set({ asks: [...w.asks, asked.trim()] }); setAsked(""); } }}>
              <TextField value={asked} onChange={setAsked} aria-label="Add something it must ask first" className="flex-1"><Input placeholder="e.g. delete a journey" /></TextField>
              <Button type="submit" size="sm" variant="secondary">Add</Button>
            </form>
          </Row>
        </Section>
      </div>
      {diff.changed > 0 && (
        <div className="sticky bottom-4 mx-auto flex w-fit items-center gap-3 rounded-2xl border border-border bg-overlay px-4 py-2.5 shadow-overlay">
          <span className="text-sm">{diff.changed} line{diff.changed === 1 ? "" : "s"} changed in <code className="text-xs">{w.file}</code></span>
          {proposed && <Chip size="sm" color="success" variant="soft">Pull request proposed</Chip>}
          <Button size="sm" variant="ghost" onPress={() => { setW(saved); setProposed(false); }}>Discard</Button>
          <Modal>
            <Button size="sm" variant="primary">Review change</Button>
            <Modal.Backdrop><Modal.Container size="lg"><Modal.Dialog>
              <Modal.Header><Modal.Heading>Propose a change to {saved.name}</Modal.Heading></Modal.Header>
              <Modal.Body><p className="mb-2 text-sm text-muted">Running threads keep the settings they started with. New threads use this once the pull request is merged.</p><Md>{`\`\`\`diff\n${diff.text}\n\`\`\``}</Md></Modal.Body>
              <Modal.Footer><Button slot="close" variant="secondary">Keep editing</Button><Button slot="close" variant="primary" onPress={() => setProposed(true)}>Open pull request</Button></Modal.Footer>
            </Modal.Dialog></Modal.Container></Modal.Backdrop>
          </Modal>
        </div>)}
    </WorkShell>
  );
}
