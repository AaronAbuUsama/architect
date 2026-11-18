// MCP servers: one item card each, with its status (connected, or needs a credential in some environment) and Connect or
// Manage. Which a type may reach is the switch inside; credentials are stored per environment, outside the pull request.
import { PlugConnection } from "@gravity-ui/icons";
import { Chip } from "@heroui/react";
import { ItemCard, ItemCardGroup } from "@heroui-pro/react";
import { useState } from "react";
import { ENVIRONMENTS, MCP } from "../agent-fixtures.ts";
import { catalog } from "../fixtures.ts";
import type { Draft, SetDraft } from "./draft.ts";
import { McpDrawer } from "./mcp-drawer.tsx";
import { Section } from "./rows.tsx";

export function Mcps({ d, set, agent }: { d: Draft; set: SetDraft; agent: string }) {
  const [stored, setStored] = useState<Record<string, string[]>>(() => Object.fromEntries(Object.entries(MCP).map(([id, m]) => [id, m.stored])));
  return (
    <Section id="mcps" title="MCP servers" does="Servers the agent can call. A server that needs a credential cannot be used in an environment until one is stored there.">
      <ItemCardGroup>
        {catalog.mcps.map((m) => {
          const info = MCP[m.id]!, have = stored[m.id] ?? [], missing = info.needsKey ? ENVIRONMENTS.filter((e) => !have.includes(e)) : [], attached = d.w.mcps.includes(m.id);
          return (
            <ItemCard key={m.id}>
              <ItemCard.Icon><PlugConnection /></ItemCard.Icon>
              <ItemCard.Content>
                <ItemCard.Title className="font-mono">{m.id}</ItemCard.Title>
                <ItemCard.Description>{m.does}</ItemCard.Description>
                {missing.length > 0 && <span className="text-xs text-muted">No credential in {missing.join(", ")}</span>}
              </ItemCard.Content>
              <ItemCard.Action>
                {!info.needsKey ? <Chip size="sm" variant="soft">Built in</Chip> : missing.length ? <Chip size="sm" color="warning" variant="soft">Needs credential</Chip> : <Chip size="sm" color="success" variant="soft">Connected</Chip>}
                <Chip size="sm" variant={attached ? "primary" : "secondary"}>{attached ? "On" : "Off"}</Chip>
                <McpDrawer id={m.id} info={info} agent={agent} label={missing.length ? "Connect" : "Manage"} url={d.mcpUrls[m.id]!} onUrl={(u) => set({ mcpUrls: { ...d.mcpUrls, [m.id]: u } })}
                  stored={have} onStore={(env) => setStored((s) => ({ ...s, [m.id]: [...(s[m.id] ?? []), env] }))}
                  attached={attached} onAttach={(on) => set({ w: { ...d.w, mcps: on ? [...d.w.mcps, m.id] : d.w.mcps.filter((x) => x !== m.id) } })} />
              </ItemCard.Action>
            </ItemCard>);
        })}
      </ItemCardGroup>
    </Section>
  );
}
