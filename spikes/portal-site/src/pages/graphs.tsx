// Graphs (the React Flow spike, spikes/react-flow-graphs): one Graph component, laid out by elk when the model is
// generated, drawing the blueprint map, each machine, and the worlds with their journeys. Two later views sketched.
import { Chip } from "@heroui/react";
import { InfoIcon } from "@phosphor-icons/react/ssr";
import type { AllGraphs } from "../../../react-flow-graphs/src/views/all.ts";
import { GraphView } from "../../../react-flow-graphs/src/graph/graph-view.tsx";
import { mapCounts } from "../../../react-flow-graphs/src/views/blueprint-map.ts";
import type { EdgeKind } from "../../../react-flow-graphs/src/graph/types.ts";
import { Island } from "../kit/island.tsx";
import { Foot, Shell } from "../shell.tsx";
import { Block } from "../ui.tsx";

const legend: [EdgeKind, string][] = [
  ["ref", "a field holds its id"], ["payload", "a payload takes it"], ["on", "an event, to its on: handler (planned)"],
  ["mounts", "mounts"], ["needs", "needs"],
];
const Legend = ({ kinds }: { kinds: [EdgeKind, string][] }) => (
  <ul className="g-legend" aria-label="What each line means">{kinds.map(([k, t]) => <li key={k}><i className={`g-swatch g-swatch--${k}`} />{t}</li>)}</ul>
);

/** Server-rendered with the first lighting, then mounted as an island. */
const View = (p: Parameters<typeof GraphView>[0]) => <Island name="GraphView" props={p}><GraphView {...p} /></Island>;

export const Graphs = ({ g }: { g: AllGraphs }) => {
  const c = mapCounts();
  return (
    <Shell here={{ id: "graphs" }} crumbs={["Plugged In", "Graphs"]} rail={false}>
      <div className="page">
        <header className="page-title">
          <h1>Graphs <Chip size="sm" variant="soft" color="accent" className="tag">SPIKE</Chip></h1>
          <p>One Graph component over React Flow, laid out by elk when the model is generated. Every node and line here is read from Plugged In's model; nothing is placed by hand. Read-only: hover a node to light its neighbours, drag to pan, pinch to zoom, click to open its page.</p>
        </header>

        <Block title="The blueprint map" desc={`${c.things} things, in the app and the ${c.plugins} plugins it mounts; the ${c.events} events their moves emit, and who listens.`} action={<Legend kinds={legend} />} flush>
          <View graph={g.map} lightings={[{ mode: "structure" }]} label="Plugged In's blueprint map" controls />
        </Block>

        <div className="g-stack">
          {g.machines.map((m) => (
            <Block key={m.thing} title={`${m.thing}'s machine`} desc="States and moves. Live puts the moves answered in the window on each arrow, never a count on a state. Trace follows one journey: moves made, and moves refused where they were tried." flush>
              <View graph={m.graph} lightings={m.lightings} start={m.start} label={`${m.thing}'s machine`} />
            </Block>
          ))}
        </div>

        <Block title="Worlds and journeys" desc={`The from chain of starting worlds, rooted at the empty world, and the ${g.journeyCount} journeys on the world each starts from. Both of stage 1's worlds start empty, so the chain is one step deep today. A journey's own steps stay the sequence diagram on its page.`} flush>
          <View graph={g.worlds} lightings={[{ mode: "structure" }]} label="Starting worlds and journeys" />
        </Block>

        <div className="g-stack">
          <Block title="Later: a workflow (M3)" desc="Activities, an await on an event, a durable clock. Hand-written here until M3.01 decides Blueprint.workflow; shaped on stage 3's signature collection." action={<Chip size="sm" variant="soft" color="warning">sketch</Chip>} flush>
            <View graph={g.workflow} lightings={[{ mode: "structure" }]} label="Sketch: a workflow" />
          </Block>
          <Block title="Later: the chain view (K17)" desc="Each operation on the target it runs on: the device signs, the server relays, the chain settles. Stage 2's payment, hand-written until K17's targets are in the model." action={<Chip size="sm" variant="soft" color="warning">sketch</Chip>} flush>
            <View graph={g.chain} lightings={[{ mode: "structure" }]} label="Sketch: a payment across targets" />
          </Block>
        </div>

        <div className="callout info"><InfoIcon size={16} aria-hidden="true" /><span>
          Built with <span className="mono">@xyflow/react 12.12.1</span> (MIT; nothing used sits behind React Flow Pro) and <span className="mono">elkjs 0.12.1</span>, which runs only in the generator.
          The <span className="mono">on:</span> line waits for M3.08; until then K9 declares it and the map draws it dashed. Owner: M1.50, after M1.13.
        </span></div>
      </div>
      <Foot>Every graph above is laid out from the model by elk; the live numbers are the same fixed window as the rest of the drawing. Spike: <span className="mono">spikes/react-flow-graphs</span>.</Foot>
    </Shell>
  );
};
