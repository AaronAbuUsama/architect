// Tools (the grant), the sandbox, the limits and "must ask first". A call outside the grant is refused and shows as a
// failed tool call; the manager is told when a limit trips.
import { Button, Input, Label, ListBox, NumberField, Tag, TagGroup, TextField } from "@heroui/react";
import { CellSelect, CellSlider, CheckboxButtonGroup } from "@heroui-pro/react";
import { useState } from "react";
import { catalog } from "../fixtures.ts";
import type { WorkerType } from "../types.ts";
import type { SetW } from "./general.tsx";
import { Section, SettingRow } from "./rows.tsx";

export function Tools({ w, setW }: { w: WorkerType; setW: SetW }) {
  return (
    <Section id="tools" title="Tools" does="The grant: every tool the agent may call. Anything else is refused.">
      <SettingRow label="Granted tools" hint={`${w.tools.length} of ${catalog.tools.length} granted.`}>
        <CheckboxButtonGroup layout="grid" aria-label="Granted tools" value={w.tools} onChange={(tools) => setW({ tools })} className="grid-cols-2">
          {catalog.tools.map((t) => <CheckboxButtonGroup.Item key={t} value={t}><CheckboxButtonGroup.ItemContent><Label className="font-mono text-xs">{t}</Label></CheckboxButtonGroup.ItemContent><CheckboxButtonGroup.Indicator /></CheckboxButtonGroup.Item>)}
        </CheckboxButtonGroup>
      </SettingRow>
    </Section>
  );
}

const Slide = ({ label, value, set, min, max, step = 1, unit = "" }: { label: string; value: number; set: (n: number) => void; min: number; max: number; step?: number; unit?: string }) => (
  <CellSlider variant="secondary" aria-label={label} value={value} minValue={min} maxValue={Math.max(max, value)} step={step} onChange={(v) => set(Array.isArray(v) ? v[0]! : v)}>
    <CellSlider.Track><CellSlider.Fill /><CellSlider.Thumb /><CellSlider.Label>{label}</CellSlider.Label><CellSlider.Output>{({ state }) => `${state.values[0]}${unit}`}</CellSlider.Output></CellSlider.Track>
  </CellSlider>
);

export function Limits({ w, setW }: { w: WorkerType; setW: SetW }) {
  const limits = (p: Partial<WorkerType["limits"]>) => setW({ limits: { ...w.limits, ...p } });
  return (
    <Section id="limits" title="Sandbox and limits" does="Where its commands run, and the hard stops on one thread.">
      <SettingRow label="Sandbox" hint="Commands run here. With none, the agent can only read.">
        <CellSelect variant="secondary" aria-label="Sandbox" selectedKey={w.sandbox ?? "none"} onSelectionChange={(k) => setW({ sandbox: k === "none" ? null : String(k) })}>
          <CellSelect.Trigger><CellSelect.Label>Template</CellSelect.Label><CellSelect.Value /><CellSelect.Indicator /></CellSelect.Trigger>
          <CellSelect.Popover><ListBox>
            <ListBox.Item id="none" textValue="None">None: it only reads<ListBox.ItemIndicator /></ListBox.Item>
            {catalog.sandboxes.map((s) => <ListBox.Item key={s.id} id={s.id} textValue={s.id}>{s.id}<ListBox.ItemIndicator /></ListBox.Item>)}
          </ListBox></CellSelect.Popover>
        </CellSelect>
      </SettingRow>
      <SettingRow label="Budget" hint={w.id === "manager" ? "Dollars a day, across all its threads." : "Dollars one thread may spend before it stops."}>
        <NumberField value={w.budgetUsd} onChange={(budgetUsd) => setW({ budgetUsd })} minValue={0.5} step={0.5} formatOptions={{ style: "currency", currency: "USD" }} aria-label="Budget" className="w-40">
          <NumberField.Group><NumberField.DecrementButton /><NumberField.Input /><NumberField.IncrementButton /></NumberField.Group>
        </NumberField>
      </SettingRow>
      <SettingRow label="Stops" hint="The first to trip ends the thread and tells its manager.">
        <div className="flex flex-col gap-2">
          <Slide label="Max turns" value={w.limits.maxTurns} set={(maxTurns) => limits({ maxTurns })} min={5} max={400} step={5} />
          <Slide label="Timeout" value={w.limits.timeoutMin} set={(timeoutMin) => limits({ timeoutMin })} min={5} max={120} step={5} unit=" min" />
          <Slide label="Threads at once" value={w.limits.parallel} set={(parallel) => limits({ parallel })} min={1} max={8} />
        </div>
      </SettingRow>
    </Section>
  );
}

export function Asks({ w, setW }: { w: WorkerType; setW: SetW }) {
  const [text, setText] = useState("");
  return (
    <Section id="asks" title="Must ask first" does="It stops and asks its manager, who asks you.">
      <SettingRow label="Asks before it would" hint="One line each, in the agent's own words.">
        <TagGroup aria-label="Must ask first" onRemove={(keys) => setW({ asks: w.asks.filter((a) => !keys.has(a)) })}>
          <TagGroup.List className="flex flex-wrap gap-1.5" renderEmptyState={() => <span className="text-sm text-muted">Nothing: it never stops to ask.</span>}>{w.asks.map((a) => <Tag key={a} id={a}>{a}<Tag.RemoveButton /></Tag>)}</TagGroup.List>
        </TagGroup>
        <form className="flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim() && !w.asks.includes(text.trim())) { setW({ asks: [...w.asks, text.trim()] }); setText(""); } }}>
          <TextField value={text} onChange={setText} aria-label="Add something it must ask first" className="flex-1"><Input variant="primary" placeholder="e.g. delete a journey" /></TextField>
          <Button type="submit" variant="secondary">Add</Button>
        </form>
      </SettingRow>
    </Section>
  );
}
