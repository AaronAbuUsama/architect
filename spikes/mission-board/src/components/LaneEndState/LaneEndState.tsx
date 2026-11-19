// A building block's end state (GRILL Q5): what done looks like, how the lane is proved, and where it lives.
// Drawn as a page of blocks so it reads the same in the side panel, a modal or on its own page.
import { Button } from "@heroui/react";
import { FlagBannerIcon, XIcon } from "@phosphor-icons/react";
import type { LaneView } from "../../data/derive.ts";
import { Callout, Doc, DocHead, H2, Properties, Text } from "../shared/blocks.tsx";

export interface LaneEndStateProps {
  readonly lane: LaneView;
  readonly onClose?: () => void;
}

export const LaneEndState = ({ lane, onClose }: LaneEndStateProps) => {
  const e = lane.block.endState;
  const s = lane.score;
  return (
    <Doc label={`${lane.block.name} end state`}>
      <DocHead crumb={`${lane.block.name} · end state`} title={e.title} icon={<FlagBannerIcon size={20} />}
        action={onClose && <Button isIconOnly size="sm" variant="ghost" aria-label="Close" onPress={onClose}><XIcon size={16} /></Button>} />
      <Properties rows={[
        { name: "Kind", value: e.kind },
        { name: "Where it lives", value: e.ref ? <span className="mono">{e.ref}</span> : <span className="muted">Not built yet</span> },
        { name: "Lane", value: <span className="mono">{s.green} green · {s.built} built · of {s.needed}</span> },
      ]} />
      <Callout icon={<FlagBannerIcon size={16} />} title="What done looks like"><Text text={e.description} /></Callout>
      <H2>How the lane is proved</H2>
      <Text text={lane.block.proof} />
    </Doc>
  );
};
