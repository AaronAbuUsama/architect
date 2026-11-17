// One MCP server in a Drawer: where it is, what it exposes, and a credential for each environment. Connecting stores the
// value in that environment's secret store; it is never shown again, and it is not part of the pull request.
import { Key, Lock } from "@gravity-ui/icons";
import { Button, Chip, Drawer, Input, TextField } from "@heroui/react";
import { CellSwitch, ItemCard, ItemCardGroup } from "@heroui-pro/react";
import { useState } from "react";
import { ENVIRONMENTS, type McpInfo } from "../agent-fixtures.ts";

type Props = { id: string; info: McpInfo; url: string; onUrl: (u: string) => void; stored: string[]; onStore: (env: string) => void; attached: boolean; onAttach: (on: boolean) => void; agent: string; label: string };

export function McpDrawer({ id, info, url, onUrl, stored, onStore, attached, onAttach, agent, label }: Props) {
  const [editing, setEditing] = useState<string | null>(null), [secret, setSecret] = useState("");
  const store = (env: string) => { onStore(env); setEditing(null); setSecret(""); };
  return (
    <Drawer>
      <Button size="sm" variant={label === "Connect" ? "primary" : "secondary"}>{label}</Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog style={{ width: "min(34rem, 90vw)", maxWidth: "none" }}>
            <Drawer.CloseTrigger />
            <Drawer.Header><Drawer.Heading className="font-mono">{id}</Drawer.Heading><p className="text-xs text-muted">MCP server over {info.transport}. Exposes {info.exposes.join(", ")}.</p></Drawer.Header>
            <Drawer.Body className="flex flex-col gap-5">
              <TextField value={url} onChange={onUrl} aria-label="Server address"><div className="mb-1 text-sm font-medium">Server</div><Input variant="secondary" className="font-mono text-xs" /></TextField>
              <div className="flex flex-col gap-2">
                <div><div className="text-sm font-medium">Credentials</div><p className="text-xs text-muted">One per environment, kept in that environment&apos;s secret store. A value is never shown after you store it.</p></div>
                {!info.needsKey ? <p className="text-sm text-muted">Built in. It needs no credential.</p> : (
                  <ItemCardGroup variant="secondary">
                    {ENVIRONMENTS.map((env) => { const has = stored.includes(env); return (
                      <ItemCard key={env} className="flex-wrap">
                        <ItemCard.Icon>{has ? <Lock /> : <Key />}</ItemCard.Icon>
                        <ItemCard.Content><ItemCard.Title>{env}</ItemCard.Title><ItemCard.Description>{has ? "Stored. The value is hidden." : "No credential stored"}</ItemCard.Description></ItemCard.Content>
                        <ItemCard.Action>
                          {has && <Chip size="sm" color="success" variant="soft">Connected</Chip>}
                          <Button size="sm" variant={has ? "ghost" : "primary"} onPress={() => { setEditing(editing === env ? null : env); setSecret(""); }}>{has ? "Replace" : "Connect"}</Button>
                        </ItemCard.Action>
                        {editing === env && (
                          <form className="flex w-full items-end gap-2 pt-2" onSubmit={(e) => { e.preventDefault(); if (secret) store(env); }}>
                            <TextField type="password" value={secret} onChange={setSecret} aria-label={`Credential for ${env}`} autoComplete="off" className="flex-1"><Input variant="secondary" placeholder={`Paste the credential for ${env}`} /></TextField>
                            <Button type="submit" size="sm" variant="primary" isDisabled={!secret}>Store</Button>
                          </form>)}
                      </ItemCard>); })}
                  </ItemCardGroup>)}
              </div>
              <CellSwitch variant="secondary" isSelected={attached} onChange={onAttach}><CellSwitch.Trigger><CellSwitch.Label>Give to {agent}</CellSwitch.Label><CellSwitch.Control /></CellSwitch.Trigger></CellSwitch>
            </Drawer.Body>
            <Drawer.Footer><Button slot="close" variant="secondary">Done</Button></Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
