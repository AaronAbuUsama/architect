// A blank operation (round 3 Q6 A): it sits in the tree where it will live, greyed; its page is the spec, with no live parts.
import { Chip } from "@heroui/react";
import { blank } from "../overlay.ts";
import { Foot, Shell } from "../shell.tsx";
import { Block } from "../ui.tsx";

const parts = ["description", "payload", "answer", "move", "allowed", "errors", "steps", "budget"];

export const BlankOp = () => (
  <Shell here={{ id: `op:${blank.name}`, thing: blank.thing, op: blank.name }} crumbs={["Plugged In", "Plugged In", blank.thing, blank.verb]} rail={false}>
    <div className="page">
      <header className="page-title">
        <div className="title-row"><h1 className="mono-title">{blank.name}</h1><Chip size="sm" variant="soft" color="warning">blank</Chip></div>
        <p>{blank.description}</p>
        <div className="props"><Chip size="sm" variant="soft" className="mono">{blank.file}</Chip><Chip size="sm" variant="soft">no calls: nothing is generated until its blanks are filled</Chip></div>
      </header>
      <Block title="Spec" desc="What is declared, and what is still Blueprint.todo" flush>
        <table className="tbl"><tbody>{parts.map((p) => {
          const has = (blank.has as readonly string[]).includes(p), todo = (blank.blanks as readonly string[]).includes(p);
          return <tr key={p}><td className="mono">{p}</td><td>{has ? <Chip size="sm" variant="soft" color="success">declared</Chip> : todo ? <Chip size="sm" variant="soft" color="warning">blank</Chip> : <span className="muted small">optional, not declared</span>}</td>
            <td className="small muted">{p === "move" && todo ? "Which state does pinning need? listed only?" : p === "allowed" && todo ? "Probably linkOwner, like order and remove." : ""}</td></tr>;
        })}</tbody></table>
      </Block>
      <Block title="Work on it" desc="Each blank links to its work item once the board lands (M3.17)"><p className="muted small">No work items yet.</p></Block>
      <Foot>Illustrative: Plugged In has no blank operation today. In the product this page falls out of `Model.blankOperations` and `Model.blanks`.</Foot>
    </div>
  </Shell>
);
