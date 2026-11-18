import { ArrowRightIcon, BracketsAngleIcon, CubeIcon, GaugeIcon, GitBranchIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import type { Activity, BlueprintWire, FieldWire } from "../types.ts";
import { OperationActivity } from "./activity.tsx";
import { allowedLabel, Kind, OperationTable } from "./catalog.tsx";
import { link } from "./links.ts";

type Operation = BlueprintWire["model"]["operations"][string];
type Thing = BlueprintWire["model"]["things"][string];

const Fields = ({ title, fields }: { title: string; fields: Readonly<Record<string, FieldWire>> }) => (
  <section className="detail-block">
    <h2>{title}</h2>
    {Object.keys(fields).length === 0 ? <p className="empty">No fields declared.</p> :
      <div className="table-wrap"><table className="field-table">
        <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Declaration</th></tr></thead>
        <tbody>{Object.entries(fields).map(([name, field]) => (
          <tr key={name}>
            <th scope="row"><code>{name}</code>{field.optional && <small>Optional</small>}</th>
            <td><code>{String(field.value["type"] ?? "—")}</code>
              {Object.entries(field.value).filter(([key]) => key !== "type").map(([key, value]) =>
                <small key={key}>{key} <code>{typeof value === "string" ? value : JSON.stringify(value)}</code></small>)}</td>
            <td>{field.named && <code>{field.named}</code>}{field.ref && <small><code>{field.ref}</code></small>}
              {!field.named && !field.ref && "—"}</td>
          </tr>
        ))}</tbody>
      </table></div>}
  </section>
);

const Info = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="info-block"><h2>{title}</h2>{children}</section>
);

export const OperationDetail = ({ operation, blueprint, base, activity }: { operation: Operation; blueprint: BlueprintWire; base: string; activity?: Activity | undefined }) => {
  const move = operation.move;
  const steps = Object.values(operation.steps);
  const hashes = Object.entries(blueprint.dependsOnByOperation[operation.name] ?? {});
  const hasThing = Object.hasOwn(blueprint.model.things, operation.thing);
  return (
    <>
      <header className="page-heading record-heading">
        <div className="record-mark"><BracketsAngleIcon size={26} aria-hidden="true" /></div>
        <div>
          <div className="title-line"><h1>{operation.name}</h1><Kind kind={operation.kind} /></div>
          {operation.description && <p>{operation.description}</p>}
        </div>
      </header>
      <div className="record-facts">
        <div><CubeIcon aria-hidden="true" /><span>Thing</span>{hasThing
          ? <a href={base + link("things", operation.thing)}>{operation.thing}</a> : <code>{operation.thing}</code>}</div>
        <div><GaugeIcon aria-hidden="true" /><span>p95 budget</span><strong>{operation.budget ? `${operation.budget.p95Ms} ms` : "Undeclared"}</strong></div>
        <div><GitBranchIcon aria-hidden="true" /><span>Idempotency</span><strong>{operation.idempotent === "request" ? "By request" : "Undeclared"}</strong></div>
      </div>
      <nav className="record-jump" aria-label="On this operation"><a href="#activity">Activity</a><a href="#contract">Contract</a></nav>
      <OperationActivity activity={activity} operation={operation.name} budget={operation.budget?.p95Ms} />
      <h2 id="contract" className="contract-title">Contract</h2>
      <div className="record-grid">
        <div className="record-main">
          <Fields title="Payload" fields={operation.payload} />
          <Fields title="Answer" fields={operation.answer} />
          {move && <section className="detail-block">
            <h2>State move</h2>
            <div className="state-move">
              <div><span>From</span><code>{move.from.join(" · ") || "Creation"}</code></div>
              <ArrowRightIcon aria-hidden="true" />
              <div><span>To</span><code>{move.to.join(" · ")}</code></div>
              <div><span>Emits</span><code>{move.emits}</code></div>
            </div>
          </section>}
          {operation.kind === "read" && <section className="detail-block"><h2>Execution</h2><p>Reads records directly. No handler or state move is declared.</p></section>}
          {steps.length > 0 && <section className="detail-block">
            <h2>Steps</h2>
            <ul className="line-list">{steps.map((step) => <li key={step.name}><code>{step.name}</code><span>{step.type ?? "Type undeclared"}</span></li>)}</ul>
          </section>}
        </div>
        <aside className="record-aside" aria-label="Operation context">
          <Info title="Who can call">
            {operation.allowed.length ? <ul>{operation.allowed.map((entry, index) => (
              <li key={index}>{allowedLabel(entry)}</li>
            ))}</ul> : <p>No access rules declared.</p>}
          </Info>
          <Info title="Refusals">
            {operation.refusals.length ? <ul>{operation.refusals.map((refusal) => <li key={refusal}><code>{refusal}</code></li>)}</ul>
              : <p>No refusals declared.</p>}
          </Info>
          <Info title="Proof dependencies">
            {hashes.length ? <ul>{hashes.map(([key, hash]) => <li key={key}><code>{key}</code><small><code>{hash}</code></small></li>)}</ul>
              : <p>No dependency hashes in this blueprint.</p>}
          </Info>
        </aside>
      </div>
    </>
  );
};

export const ThingDetail = ({ thing, blueprint, base }: { thing: Thing; blueprint: BlueprintWire; base: string }) => (
  <>
    <header className="page-heading record-heading">
      <div className="record-mark"><CubeIcon size={26} aria-hidden="true" /></div>
      <div><h1>{thing.name}</h1>{thing.description && <p>{thing.description}</p>}</div>
    </header>
    <div className="record-facts"><div><span>Lives in</span><strong>{thing.lives}</strong></div></div>
    <div className="record-grid">
      <div className="record-main">
        <section className="detail-block">
          <h2>Operations &amp; reads</h2>
          <OperationTable base={base} operations={Object.values(blueprint.model.operations).filter((op) => op.thing === thing.name)} />
        </section>
        <Fields title="Fields" fields={thing.fields} />
      </div>
      <aside className="record-aside" aria-label="Thing context">
        {thing.machine && <Info title="Machine states"><ul>{thing.machine.states.map((state) => <li key={state}><code>{state}</code></li>)}</ul></Info>}
        {thing.roles.length > 0 && <Info title="Roles"><ul>{thing.roles.map((role) => <li key={role}><code>{role}</code></li>)}</ul></Info>}
      </aside>
    </div>
  </>
);
