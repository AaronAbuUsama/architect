// Skills: one item card per skill, the ones this agent has first. Manage opens the SKILL.md and its versions.
import { FileText } from "@gravity-ui/icons";
import { Chip } from "@heroui/react";
import { ItemCard, ItemCardGroup } from "@heroui-pro/react";
import { skillDoes, skillIds, skillVersions } from "../agent-fixtures.ts";
import type { Draft, SetDraft } from "./draft.ts";
import { Section } from "./rows.tsx";
import { SkillDrawer } from "./skill-drawer.tsx";

export function Skills({ d, saved, set, agent }: { d: Draft; saved: Draft; set: SetDraft; agent: string }) {
  const mine = skillIds.filter((s) => d.w.skills.includes(s)), rest = skillIds.filter((s) => !d.w.skills.includes(s));
  const card = (id: string) => (
    <ItemCard key={id}>
      <ItemCard.Icon><FileText /></ItemCard.Icon>
      <ItemCard.Content><ItemCard.Title className="font-mono">{id}</ItemCard.Title><ItemCard.Description>{skillDoes(id)}</ItemCard.Description></ItemCard.Content>
      <ItemCard.Action>
        <Chip size="sm" variant="soft">v{skillVersions(id)[0]!.v}</Chip>
        {d.skills[id] !== saved.skills[id] && <Chip size="sm" color="warning" variant="soft">Edited</Chip>}
        <SkillDrawer id={id} agent={agent} text={d.skills[id]!} saved={saved.skills[id]!} onText={(t) => set({ skills: { ...d.skills, [id]: t } })}
          attached={d.w.skills.includes(id)} onAttach={(on) => set({ w: { ...d.w, skills: on ? [...d.w.skills, id] : d.w.skills.filter((s) => s !== id) } })} />
      </ItemCard.Action>
    </ItemCard>);
  return (
    <Section id="skills" title="Skills" does="Instructions the agent reads when a task matches. Each is a SKILL.md under .agents/skills, shared by every type that has it.">
      <ItemCardGroup><ItemCardGroup.Header><ItemCardGroup.Title>On this agent</ItemCardGroup.Title><ItemCardGroup.Description>{mine.length} of {skillIds.length} skills</ItemCardGroup.Description></ItemCardGroup.Header>{mine.map(card)}</ItemCardGroup>
      {rest.length > 0 && <ItemCardGroup><ItemCardGroup.Header><ItemCardGroup.Title>Available to add</ItemCardGroup.Title><ItemCardGroup.Description>Open one and switch it on to give it to this agent.</ItemCardGroup.Description></ItemCardGroup.Header>{rest.map(card)}</ItemCardGroup>}
    </Section>
  );
}
