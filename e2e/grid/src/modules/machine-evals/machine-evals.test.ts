// The machine row's evals over Plugged In's real model and outputs, and acme's. The same suite runs for every thing that has a machine.
import { describe, expect, it } from "vitest";
import { editFile, editPortal, editSpans, evidenceOf, judge, withoutProveLine } from "../project-evidence/testing.ts";
import { MachineEvals } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const acme = await evidenceOf("acme");
const machines = (e: typeof pluggedIn) => Object.values(e.model.things).filter((t) => t.machine != null).map((t) => t.name);
const check = (cell: string, subject: string, evidence = pluggedIn) => judge(MachineEvals.evals, `machine.${cell}`, subject, evidence);

describe("Plugged In, as it is today", () => {
  it("has two machines, handle and link; profile has none", () => {
    expect(machines(pluggedIn)).toEqual(["handle", "link"]);
    expect(check("model", "profile")).toEqual({ ok: false, why: ["the model has no thing with a machine profile"] });
  });

  it.each(["model", "server", "docs"])("machine.%s is green for every machine", (cell) => {
    for (const thing of machines(pluggedIn)) expect({ thing, ...check(cell, thing) }).toEqual({ thing, ok: true, why: [] });
  });

  it("machine.api is red: a wrong-state refusal's state is text, not the union of the states (generators render/internal/api)", () => {
    expect(check("api", "handle").why).toEqual([expect.stringMatching(/^HandleNotClaimed's state is not typed as the union of claimed \| released: state: Schema.String/)]);
    expect(check("api", "link").why).toEqual([expect.stringMatching(/^LinkNotListed's state is not typed as the union of listed \| removed/)]);
  });

  it("machine.sdk, machine.cli and machine.mcp are red: nothing a caller sees says the states", () => {
    expect(check("sdk", "link").why).toEqual(["the SDK exports no type for link's states (listed | removed): a caller's state is not a typed union"]);
    expect(check("cli", "link").why).toEqual(["`link add --help` does not name the states it moves between (listed missing)", "`link remove --help` does not name the states it moves between (listed, removed missing)"]);
    expect(check("mcp", "link").why).toEqual(["link.add's description does not name the states it moves between (listed missing)", "link.remove's description does not name the states it moves between (listed, removed missing)"]);
  });

  it("machine.portal is red: the lifecycle shows no live move count", () => {
    for (const thing of machines(pluggedIn)) expect(check("portal", thing).why, thing).toEqual([`/portal/things/${thing}'s lifecycle shows no live move count on its arrows: the portal does not yet count moves from telemetry (M1.13)`]);
  });

  it("machine.telemetry is red: the committed span of a move from a state carries move.from, and move.name and move.to sit on the step's span", () => {
    expect(check("telemetry", "link").why).toEqual(["no committed link.remove span carries move.name remove, move.from and move.to (it has move.from); the rest are on another span"]);
    expect(check("telemetry", "handle").why).toEqual(["no committed handle.release span carries move.name release, move.from and move.to (it has move.from); the rest are on another span"]);
  });
});

describe("acme", () => {
  it("passes what its model, API, docs and portal say, for every machine it has", () => {
    expect(machines(acme).length).toBeGreaterThan(0);
    for (const thing of machines(acme)) {
      for (const cell of ["model", "docs"]) expect({ thing, cell, ...check(cell, thing, acme) }).toEqual({ thing, cell, ok: true, why: [] });
    }
  });
});

describe("a wrong output is red, and says what", () => {
  it("model: a move out of a state the machine does not have, and an event the thing does not declare", () => {
    const link = pluggedIn.model.things["link"]!;
    const broken = { ...pluggedIn, model: { ...pluggedIn.model, things: { ...pluggedIn.model.things, link: { ...link, machine: { ...link.machine!, moves: { ...link.machine!.moves, remove: { from: ["listed", "ghost"], to: ["removed"], emits: "LinkGone" } } } } } } };
    expect(check("model", "link", broken).why).toEqual(["move remove names ghost, which is not a state", "move remove emits LinkGone, which the thing does not declare", "link.remove's move remove disagrees with the machine's"]);
  });

  it("api: an endpoint that does not declare the wrong-state refusal, and a state typed as the union", () => {
    expect(check("api", "link", editFile(pluggedIn, "generated/api/src/link/remove.ts", (t) => t.replace("[LinkNotListed, NotAllowed]", "[NotAllowed]"))).why[0]).toBe("link.remove's endpoint does not declare LinkNotListed");
    const typed = editFile(pluggedIn, "generated/api/src/errors.ts", (t) => t.replace(/(class LinkNotListed .*?)\.\.\.\{ state: Schema\.String \}/, '$1...{ state: Schema.Literals(["listed", "removed"]) }'));
    expect(check("api", "link", typed)).toEqual({ ok: true, why: [] });
  });

  it("server: a machine path prove did not tick", () => {
    expect(check("server", "link", withoutProveLine(pluggedIn, "link.remove machine path")).why).toEqual(['prove did not report "link.remove machine path ✔"']);
  });

  it("sdk, cli, mcp: pass once the states are named", () => {
    const sdk = editFile(pluggedIn, "generated/sdk/src/link/index.ts", (t) => `${t}export type LinkState = "listed" | "removed";\n`);
    expect(check("sdk", "link", sdk)).toEqual({ ok: true, why: [] });
    const cli = { ...pluggedIn, cli: { ...pluggedIn.cli, "link add": "Moves a link from nothing to listed", "link remove": "Moves a link from listed to removed" } };
    expect(check("cli", "link", cli)).toEqual({ ok: true, why: [] });
    const mcp = { ...pluggedIn, mcp: pluggedIn.mcp!.map((t) => (t.name === "link.add" ? { ...t, description: `${t.description} Moves it to listed.` } : t.name === "link.remove" ? { ...t, description: `${t.description} Moves it from listed to removed.` } : t)) };
    expect(check("mcp", "link", mcp)).toEqual({ ok: true, why: [] });
  });

  it("docs: a machine section that lost a state, the refusal or a move's row", () => {
    const path = "generated/docs/link/index.md";
    expect(check("docs", "link", editFile(pluggedIn, path, (t) => t.replace(/removed/g, "gone"))).why).toContain("the Machine section does not name the states removed");
    expect(check("docs", "link", editFile(pluggedIn, path, (t) => t.replace("LinkNotListed (exit 31)", "LinkNotListed"))).why[0]).toMatch(/does not name the wrong-state refusal LinkNotListed with its exit 31/);
    expect(check("docs", "link", editFile(pluggedIn, path, (t) => t.replace("| remove | listed | removed | LinkRemoved |\n", ""))).why).toEqual(["the move table has no correct row for remove"]);
    expect(check("docs", "link", editFile(pluggedIn, "generated/docs/link/remove.md", (t) => t.replace("## Move", "## Moved"))).why).toEqual(["link.remove's page has no Move section with remove, its states and LinkRemoved"]);
  });

  it("portal: a lifecycle with a live count passes; one missing a move's row is red", () => {
    const route = "/portal/things/link";
    const counted = editPortal(pluggedIn, route, (h) => h.replace("<th>Emits</th>", "<th>Emits</th><th>Count</th>"));
    expect(check("portal", "link", counted)).toEqual({ ok: true, why: [] });
    expect(check("portal", "link", editPortal(counted, route, (h) => h.replace("<td>LinkRemoved</td>", "<td>LinkGone</td>"))).why).toEqual([`${route}'s move table has no correct row for remove`]);
  });

  it("telemetry: a committed span that carries all of the move passes; a refused one does not count", () => {
    const whole = editSpans(pluggedIn, (spans) => spans.map((s) => (s.name === "link.remove" && s.attrs["refusal"] === undefined ? { ...s, attrs: { ...s.attrs, "move.name": "remove", "move.to": "removed", "move.from": "listed" } } : s)));
    expect(check("telemetry", "link", whole)).toEqual({ ok: true, why: [] });
    expect(check("telemetry", "link", editSpans(whole, (spans) => spans.filter((s) => !(s.name === "link.remove" && s.attrs["refusal"] === undefined)))).why).toEqual(["no committed link.remove span was recorded"]);
  });
});
