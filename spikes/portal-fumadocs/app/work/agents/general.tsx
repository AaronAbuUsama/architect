// General (name, description, task kinds) and Models (which are allowed, which is the default, each one's price and record).
import { Cpu } from "@gravity-ui/icons";
import { Button, Chip, Input, Label, Switch, TextArea, TextField } from "@heroui/react";
import { CheckboxButtonGroup, ItemCard, ItemCardGroup } from "@heroui-pro/react";
import { Link } from "react-router";
import { catalog, runs } from "../fixtures.ts";
import type { Kind, WorkerType } from "../types.ts";
import { Section, SettingRow } from "./rows.tsx";
import { failText, passText, statsOf } from "./stats.ts";

export type SetW = (p: Partial<WorkerType>) => void;
const KINDS: Kind[] = ["specify", "design machine", "validate machine", "build", "prove", "promote", "spike"];

export function General({ w, setW }: { w: WorkerType; setW: SetW }) {
  return (
    <Section id="general" title="General" does="What this agent is for, and which tasks a manager may give it.">
      <SettingRow label="Name" hint="Shown on the board and in every thread.">
        <TextField value={w.name} onChange={(name) => setW({ name })} aria-label="Name"><Input variant="primary" /></TextField>
      </SettingRow>
      <SettingRow label="Description" hint="What the manager reads when it picks an agent for a task.">
        <TextField value={w.does} onChange={(does) => setW({ does })} aria-label="Description"><TextArea rows={3} variant="primary" /></TextField>
      </SettingRow>
      <SettingRow label="Task kinds" hint="The kinds on the board it may be started on.">
        <CheckboxButtonGroup layout="grid" aria-label="Task kinds" value={w.kinds} onChange={(v) => setW({ kinds: v as Kind[] })} className="grid-cols-2">
          {KINDS.map((k) => <CheckboxButtonGroup.Item key={k} value={k}><CheckboxButtonGroup.ItemContent><Label>{k}</Label></CheckboxButtonGroup.ItemContent><CheckboxButtonGroup.Indicator /></CheckboxButtonGroup.Item>)}
        </CheckboxButtonGroup>
      </SettingRow>
    </Section>
  );
}

export function Models({ w, setW }: { w: WorkerType; setW: SetW }) {
  const allow = (id: string, on: boolean) => setW({ models: on ? [...w.models, id] : w.models.filter((m) => m !== id) });
  return (
    <Section id="models" title="Models" does="Every model it may run on. The first allowed is the default; the manager picks one per thread and the thread records which.">
      <ItemCardGroup>
        {catalog.models.map((m) => {
          const on = w.models.includes(m.id), isDefault = w.models[0] === m.id, s = statsOf(w.id, m.id);
          const mine = runs.filter((r) => r.worker === w.id && r.model === m.id);
          return (
            <ItemCard key={m.id}>
              <ItemCard.Icon><Cpu /></ItemCard.Icon>
              <ItemCard.Content>
                <ItemCard.Title className="font-mono">{m.id}</ItemCard.Title>
                <ItemCard.Description>{m.by} · ${m.inPerM} in and ${m.outPerM} out per million tokens</ItemCard.Description>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  {passText(s)} · {failText(s)}
                  {mine.map((r) => <Link key={r.id} to={`/work/r/${r.id}`} className="text-accent hover:underline">{r.id}</Link>)}
                </span>
              </ItemCard.Content>
              <ItemCard.Action>
                {isDefault ? <Chip size="sm" color="accent" variant="soft">Default</Chip> : on && <Button size="sm" variant="ghost" onPress={() => setW({ models: [m.id, ...w.models.filter((x) => x !== m.id)] })}>Make default</Button>}
                <Switch aria-label={`Allow ${m.id}`} isSelected={on} isDisabled={on && w.models.length === 1} onChange={(v) => allow(m.id, v)}><Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Content></Switch>
              </ItemCard.Action>
            </ItemCard>);
        })}
      </ItemCardGroup>
    </Section>
  );
}
