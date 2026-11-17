// One skill's SKILL.md in a Drawer: edit the source, preview it, and read its version history. Attaching the skill to
// this agent type is the switch in the footer.
import { Button, Drawer, Tabs, TextArea, TextField } from "@heroui/react";
import { CellSwitch } from "@heroui-pro/react";
import { Markdown } from "@heroui-pro/react/markdown";
import { skillVersions } from "../agent-fixtures.ts";
import { lineDiff } from "../agent-file.ts";
import { VersionTimeline, type Entry } from "./diff.tsx";

const lines = (s: string) => s.replace(/\n$/, "").split("\n");

export function SkillDrawer({ id, text, saved, onText, attached, onAttach, agent }: { id: string; text: string; saved: string; onText: (t: string) => void; attached: boolean; onAttach: (on: boolean) => void; agent: string }) {
  const vs = skillVersions(id), dirty = text !== saved;
  const entries: Entry[] = [
    ...(dirty ? [{ key: "draft", title: "Unsaved edit", meta: "Goes into the pull request with the rest", note: "Your changes to SKILL.md.", status: "warning" as const, diff: lineDiff(lines(vs[0]!.text), lines(text)), diffLabel: `.agents/skills/${id}/SKILL.md` }] : []),
    ...vs.map((v, i): Entry => ({ key: String(v.v), title: <>Version {v.v}</>, meta: `${v.date} by ${v.who}`, note: v.note, status: i === 0 && !dirty ? "current" : "default", diff: vs[i + 1] ? lineDiff(lines(vs[i + 1]!.text), lines(v.text)) : undefined, diffLabel: `SKILL.md v${vs[i + 1]?.v} to v${v.v}` })),
  ];
  return (
    <Drawer>
      <Button size="sm" variant="secondary">Manage</Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog style={{ width: "min(42rem, 90vw)", maxWidth: "none" }}>
            <Drawer.CloseTrigger />
            <Drawer.Header><Drawer.Heading>{id}</Drawer.Heading><p className="font-mono text-xs text-muted">.agents/skills/{id}/SKILL.md · version {vs[0]!.v}{dirty && " · edited"}</p></Drawer.Header>
            <Drawer.Body className="flex flex-col gap-4">
              <Tabs>
                <Tabs.ListContainer><Tabs.List aria-label="Skill views"><Tabs.Tab id="edit">SKILL.md<Tabs.Indicator /></Tabs.Tab><Tabs.Tab id="preview">Preview<Tabs.Indicator /></Tabs.Tab><Tabs.Tab id="history">Versions<Tabs.Indicator /></Tabs.Tab></Tabs.List></Tabs.ListContainer>
                <Tabs.Panel id="edit" className="pt-3"><TextField value={text} onChange={onText} aria-label="SKILL.md"><TextArea rows={18} variant="secondary" className="font-mono text-xs" /></TextField></Tabs.Panel>
                <Tabs.Panel id="preview" className="pt-3"><Markdown>{text.replace(/^---[\s\S]*?---\n/, "")}</Markdown></Tabs.Panel>
                <Tabs.Panel id="history" className="pt-4"><VersionTimeline size="sm" entries={entries} /></Tabs.Panel>
              </Tabs>
              <CellSwitch variant="secondary" isSelected={attached} onChange={onAttach}><CellSwitch.Trigger><CellSwitch.Label>Give to {agent}</CellSwitch.Label><CellSwitch.Control /></CellSwitch.Trigger></CellSwitch>
            </Drawer.Body>
            <Drawer.Footer><Button slot="close" variant="secondary">Done</Button></Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
