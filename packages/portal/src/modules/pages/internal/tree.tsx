// The tree (design/portal.md, "The frame"): the model. Home, the things (each folded to its operations; an operation the model has not
// filled in yet is greyed, with its page as the spec), then the reference pages. Held with their pages: environments, plugins, stores.
import { Chip, Shell } from "@orthograph/portal-ui";
import type { ReactElement } from "react";
import type { BlueprintWire } from "#modules/wire/types.js";
import { link } from "./links.ts";
import { referenceKinds } from "../types.ts";

export interface Here {
  readonly id: string;
  readonly thing?: string;
}

const referenceLabel: Readonly<Record<(typeof referenceKinds)[number], string>> = { access: "Access", events: "Events", machines: "Machines", refusals: "Refusals" };

export const Tree = ({ blueprint, here }: { readonly blueprint: BlueprintWire; readonly here: Here }): ReactElement => {
  const { things, operations, blanks = {} } = blueprint.model;
  const ownOps = (thing: string): ReadonlyArray<{ readonly name: string; readonly verb: string; readonly kind: string; readonly blank: boolean }> => [
    ...Object.values(operations).filter((o) => o.thing === thing).map((o) => ({ name: o.name, verb: o.verb, kind: o.kind, blank: o.name in blanks })),
    ...Object.keys(blanks).filter((name) => !(name in operations) && name.startsWith(`${thing}.`)).map((name) => ({ name, verb: name.slice(thing.length + 1), kind: "operation", blank: true })),
  ];
  return (
    <div data-portal="tree">
      <Shell.Tree.Group>
        <Shell.Tree.Menu aria-label="Home">
          <Shell.Tree.MenuItem id="home" href={link.home} textValue="Home" isCurrent={here.id === "home"}><Shell.Tree.MenuLabel>Home</Shell.Tree.MenuLabel></Shell.Tree.MenuItem>
        </Shell.Tree.Menu>
      </Shell.Tree.Group>
      <Shell.Tree.Group>
        <Shell.Tree.GroupLabel>Things</Shell.Tree.GroupLabel>
        <Shell.Tree.Menu aria-label="Things" defaultExpandedKeys={here.thing === undefined ? [] : [here.thing]}>
          {Object.keys(things).map((name) => (
            <Shell.Tree.MenuItem key={name} id={name} textValue={name} href={link.thing(name)} isCurrent={here.id === `thing:${name}`}>
              <Shell.Tree.MenuItemContent>
                <Shell.Tree.MenuLabel><span data-portal="tree-item" data-kind="thing" data-name={name}>{name}</span></Shell.Tree.MenuLabel>
                <Shell.Tree.MenuTrigger><Shell.Tree.MenuIndicator /></Shell.Tree.MenuTrigger>
              </Shell.Tree.MenuItemContent>
              <Shell.Tree.Submenu>
                {ownOps(name).map((op) => (
                  <Shell.Tree.MenuItem key={op.name} id={op.name} textValue={op.verb} href={link.operation(op.name)} isCurrent={here.id === `operation:${op.name}`}>
                    <Shell.Tree.MenuItemContent>
                      <Shell.Tree.MenuLabel>
                        <span data-portal="tree-item" data-kind="operation" data-name={op.name} data-blank={String(op.blank)} className={op.blank ? "blank-label" : undefined}>{op.verb}</span>
                      </Shell.Tree.MenuLabel>
                      {op.blank && <Shell.Tree.MenuChip><Chip size="sm" variant="soft" className="tag">BLANK</Chip></Shell.Tree.MenuChip>}
                      {!op.blank && op.kind === "read" && <Shell.Tree.MenuChip><Chip size="sm" variant="soft" className="tag">READ</Chip></Shell.Tree.MenuChip>}
                    </Shell.Tree.MenuItemContent>
                  </Shell.Tree.MenuItem>
                ))}
              </Shell.Tree.Submenu>
            </Shell.Tree.MenuItem>
          ))}
        </Shell.Tree.Menu>
      </Shell.Tree.Group>
      <Shell.Tree.Group>
        <Shell.Tree.GroupLabel>Reference</Shell.Tree.GroupLabel>
        <Shell.Tree.Menu aria-label="Reference">
          <Shell.Tree.MenuItem id="journeys" href={link.journeys} textValue="Journeys" isCurrent={here.id === "journeys"}><Shell.Tree.MenuLabel>Journeys</Shell.Tree.MenuLabel></Shell.Tree.MenuItem>
          {referenceKinds.map((kind) => (
            <Shell.Tree.MenuItem key={kind} id={`reference:${kind}`} href={link.reference(kind)} textValue={referenceLabel[kind]} isCurrent={here.id === `reference:${kind}`}><Shell.Tree.MenuLabel>{referenceLabel[kind]}</Shell.Tree.MenuLabel></Shell.Tree.MenuItem>
          ))}
        </Shell.Tree.Menu>
      </Shell.Tree.Group>
    </div>
  );
};
