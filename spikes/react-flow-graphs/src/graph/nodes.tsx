// Our components as React Flow nodes. Each takes a Placed node as its data and draws it with the kit's parts; the
// handles are invisible anchors, because edges follow elk's routes, not the handles.
import { Chip } from "@heroui/react";
import { ArrowRightIcon, ClockIcon, GlobeIcon, HourglassIcon, LightningIcon, PathIcon, PlugIcon, PlayIcon } from "@phosphor-icons/react/ssr";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { ReactNode } from "react";
import { environments } from "../../../portal-site/src/model.ts";
import { VerdictTile, type V } from "../../../portal-site/src/kit/verdict-matrix.tsx";
import type { NodeKind, Placed } from "./types.ts";

export type FlowNode = Node<Placed & Record<string, unknown>>;
type P = NodeProps<FlowNode>;

const Anchors = () => (<>
  <Handle type="target" position={Position.Left} className="g-anchor" isConnectable={false} />
  <Handle type="source" position={Position.Right} className="g-anchor" isConnectable={false} />
</>);

const Card = ({ d, icon, children, className = "" }: { d: Placed; icon?: ReactNode; children?: ReactNode; className?: string }) => (
  <div className={`g-card g-${d.kind} ${className}`} style={{ width: d.w, height: d.h }}>
    <Anchors />
    <div className="g-card__head">{icon}<span className="g-card__title">{d.label}</span></div>
    {d.sub && <div className="g-card__sub">{d.sub}</div>}
    {children}
  </div>
);

const ThingNode = ({ data: d }: P) => {
  const states = (d.data?.states as string[]) ?? [];
  return (
    <Card d={d}>
      <div className="g-card__foot">
        {states.length ? <span className="g-states">{states.map((s, i) => <span key={s}>{i > 0 && <ArrowRightIcon size={10} aria-hidden="true" />}<b>{s}</b></span>)}</span> : <span className="muted">no machine</span>}
        <Chip size="sm" variant="soft">{d.data?.ops as number} ops</Chip>
      </div>
      {((d.data?.events as string[]) ?? []).length > 0 && <div className="g-events">{(d.data!.events as string[]).map((e) => <span key={e} className="g-event-chip"><LightningIcon size={10} weight="fill" aria-hidden="true" />{e}</span>)}</div>}
    </Card>
  );
};

const GroupNode = ({ data: d }: P) => (
  <div className={`g-group${d.id === "g:app" ? " is-app" : ""}`} style={{ width: d.w, height: d.h }}>
    <Anchors />
    <div className="g-group__head">{d.id === "g:app" ? <GlobeIcon size={14} aria-hidden="true" /> : <PlugIcon size={14} aria-hidden="true" />}<b>{d.label}</b><span className="muted">{d.sub}</span></div>
  </div>
);

const EventNode = ({ data: d }: P) => (
  <div className="g-event" style={{ width: d.w, height: d.h }}><Anchors /><LightningIcon size={12} weight="fill" aria-hidden="true" /><span>{d.label}</span></div>
);

const StartNode = ({ data: d }: P) => d.data?.world
  ? <div className="g-start is-world" style={{ width: d.w, height: d.h }}><Anchors /><span>{d.label}</span></div>
  : <div className="g-start" style={{ width: d.w, height: d.h }} title={d.label}><Anchors /></div>;

const StateNode = ({ data: d }: P) => (
  <div className={`g-state${d.data?.end ? " is-end" : ""}`} style={{ width: d.w, height: d.h }}><Anchors />{d.label}</div>
);

const WorldNode = ({ data: d }: P) => (
  <Card d={d} icon={<GlobeIcon size={13} aria-hidden="true" />}>
    <div className="g-card__foot">{(d.data?.gives as string[]).map((g) => <Chip key={g} size="sm" variant="soft" className="mono">world.{g}</Chip>)}</div>
  </Card>
);

const JourneyNode = ({ data: d }: P) => {
  const v = d.data?.verdicts as Record<string, V>;
  return (
    <Card d={d} icon={<PathIcon size={13} aria-hidden="true" />}>
      <div className="g-card__foot">
        <span className="g-verdicts">{environments.map((e) => <span key={e.name} className="g-verdict"><VerdictTile v={v[e.name]!} title={`${e.name}: ${v[e.name]}`} /><span>{e.name}</span></span>)}</span>
        <span className="muted">{d.data?.steps as number} steps</span>
      </div>
    </Card>
  );
};

const Activity = ({ data: d }: P) => <Card d={d} icon={<PlayIcon size={12} weight="fill" aria-hidden="true" />} />;
const Wait = ({ data: d }: P) => <Card d={d} icon={d.label.startsWith("clock") ? <ClockIcon size={13} aria-hidden="true" /> : <HourglassIcon size={13} aria-hidden="true" />} />;
const Op = ({ data: d }: P) => <Card d={d} className="mono-title" />;

export const nodeTypes: Record<NodeKind, (p: P) => ReactNode> = {
  thing: ThingNode, group: GroupNode, event: EventNode, start: StartNode, state: StateNode, world: WorldNode,
  journey: JourneyNode, activity: Activity, wait: Wait, op: Op,
};
