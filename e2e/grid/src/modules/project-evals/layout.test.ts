// The evals judge what an output says, not how it is laid out (the 🔍 on #143). For each one that read a layout, the same correct output
// written another way stays green, and the real defect stays red. The client builder (M1.42) is about to reformat the CLI, docs, API and SDK.
import { describe, expect, it } from "vitest";
import { EventEvals } from "../event-evals/service.ts";
import { MachineEvals } from "../machine-evals/service.ts";
import { OperationEvals } from "../operation-evals/service.ts";
import { editFile, editPortal, evidenceOf, judge } from "../project-evidence/testing.ts";
import { ThingEvals } from "../thing-evals/service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const link = "generated/docs/link/index.md";

describe("machine.docs: columns by header, states by content", () => {
  const check = (e: typeof pluggedIn) => judge(MachineEvals.evals, "machine.docs", "link", e);
  const prose = `## Machine

Two states, listed and removed. LinkNotListed (code 31) is what a move from the wrong state gets.

| emits | to | move | note | from |
|---|---|---|---|---|
| LinkAdded | listed | add | new | (creates) |
| LinkRemoved | removed | remove | gone | listed |

`;
  const reformatted = editFile(pluggedIn, link, (t) => t.replace(/## Machine[\s\S]*?(?=## Roles)/, prose));

  it("stays green when the columns are reordered, another column is added and the states are in a sentence", () => {
    expect(check(reformatted)).toEqual({ ok: true, why: [] });
  });
  it("is red when a move's row ends in another state, whatever the column order", () => {
    expect(check(editFile(reformatted, link, (t) => t.replace("| LinkRemoved | removed |", "| LinkRemoved | listed |"))).why).toEqual(["the move table has no correct row for remove"]);
  });
  it("is red when a move emits another event, when a state is never named and when the refusal is gone", () => {
    expect(check(editFile(reformatted, link, (t) => t.replace("| LinkAdded | listed |", "| LinkRemoved | listed |"))).why).toEqual(["the move table has no correct row for add"]);
    expect(check(editFile(reformatted, link, (t) => t.replace(/removed/g, "gone"))).why).toContain("the Machine section does not name the states removed");
    expect(check(editFile(reformatted, link, (t) => t.replace("LinkNotListed (code 31)", "an error"))).why).toEqual(["the Machine section does not name the wrong-state refusal LinkNotListed with its exit 31"]);
  });
});

describe("machine.portal: the same, on the portal's table", () => {
  const route = "/portal/things/link";
  const check = (e: typeof pluggedIn) => judge(MachineEvals.evals, "machine.portal", "link", e);
  const counted = editPortal(pluggedIn, route, (h) => h.replace("<th>Emits</th>", "<th>Emits</th><th>Count</th>"));
  it("stays green when the portal's columns are reordered", () => {
    const swapped = editPortal(counted, route, (h) => h.replace(/(<h2>Machine<\/h2>[\s\S]*?)<thead>[\s\S]*?<\/tbody>/, "$1<thead><tr><th>Emits</th><th>Move</th><th>To</th><th>From</th><th>Count</th></tr></thead><tbody><tr><td>LinkAdded</td><td>add</td><td>listed</td><td>(creates)</td><td>0</td></tr><tr><td>LinkRemoved</td><td>remove</td><td>removed</td><td>listed</td><td>0</td></tr></tbody>"));
    expect(check(swapped)).toEqual({ ok: true, why: [] });
    expect(check(editPortal(swapped, route, (h) => h.replace("<td>removed</td><td>listed</td><td>0</td>", "<td>listed</td><td>listed</td><td>0</td>"))).why).toEqual([`${route}'s move table has no correct row for remove`]);
  });
});

describe("event.docs: an event's fields, in any layout", () => {
  const check = (e: typeof pluggedIn, event = "LinkAdded") => judge(EventEvals.evals, "event.docs", event, e);
  it("stays green as a table row, a nested list or prose; red when a field is missing or belongs to the next event", () => {
    const table = editFile(pluggedIn, link, (t) => `${t}\n## Events\n\n| event | fields |\n|---|---|\n| LinkAdded | link |\n| LinkRemoved | link |\n`);
    const nested = editFile(pluggedIn, link, (t) => `${t}\n## Events\n\n- LinkAdded\n  - link: the new link\n- LinkRemoved\n  - link\n`);
    for (const e of [table, nested]) expect(check(e)).toEqual({ ok: true, why: [] });
    const borrowed = editFile(pluggedIn, link, (t) => `${t}\n## Events\n\n- LinkAdded\n- LinkRemoved\n  - link\n`);
    expect(check(borrowed).why).toEqual([`${link}'s Events lists LinkAdded without its field link`]);
  });
  it("anchors on the event's own entry: prose that mentions it first, or fields that follow the last event, are not its", () => {
    const prose = editFile(pluggedIn, link, (t) => `${t}\n## Events\n\nA link is listed with LinkAdded, the link field says which, and later LinkRemoved.\n\n- LinkAdded\n- LinkRemoved\n  - link\n`);
    expect(check(prose).why).toEqual([`${link}'s Events lists LinkAdded without its field link`]);
    const last = editFile(pluggedIn, link, (t) => `${t}\n## Events\n\n- LinkRemoved\n- LinkAdded\n  - link\n`);
    expect(check(last, "LinkRemoved").why).toEqual([`${link}'s Events lists LinkRemoved without its field link`]);
    expect(check(last, "LinkAdded")).toEqual({ ok: true, why: [] });
  });
  it("reads an entry whose markup has line breaks inside it", () => {
    const route = "/portal/things/link";
    const portal = (events: string) => judge(EventEvals.evals, "event.portal", "LinkAdded", editPortal(pluggedIn, route, (h) => h.replace("<h2>Roles</h2>", `<h2>Events</h2>${events}<h2>Roles</h2>`)));
    expect(portal("<ul>\n<li>\n  LinkAdded:\n  link\n</li>\n<li>\nLinkRemoved\n</li>\n</ul>")).toEqual({ ok: true, why: [] });
    expect(portal("<table>\n<tr>\n<td>\nLinkAdded\n</td>\n<td>\nlink\n</td>\n</tr>\n</table>")).toEqual({ ok: true, why: [] });
    expect(portal("<ul>\n<li>\n  LinkAdded:\n  nothing\n</li>\n</ul>").why).toEqual([`${route}'s Events lists LinkAdded without its field link`]);
  });
  it("reads the portal's list items and table rows the same way", () => {
    const route = "/portal/things/link";
    const portal = (events: string) => judge(EventEvals.evals, "event.portal", "LinkAdded", editPortal(pluggedIn, route, (h) => h.replace("<h2>Roles</h2>", `<h2>Events</h2>${events}<h2>Roles</h2>`)));
    expect(portal("<ul><li>LinkAdded<ul><li>link</li></ul></li><li>LinkRemoved</li></ul>")).toEqual({ ok: true, why: [] });
    expect(portal("<table><tbody><tr><td>LinkAdded</td><td>link</td></tr><tr><td>LinkRemoved</td><td>link</td></tr></tbody></table>")).toEqual({ ok: true, why: [] });
    expect(portal("<p>LinkAdded carries link.</p><ul><li>LinkAdded</li><li>LinkRemoved<ul><li>link</li></ul></li></ul>").why).toEqual([`${route}'s Events lists LinkAdded without its field link`]);
  });
});

describe("thing.cli: a flag's name, type and description, in any layout", () => {
  const check = (help: string) => judge(ThingEvals.evals, "thing.cli", "link", { ...pluggedIn, cli: { ...pluggedIn.cli, "link order": help } });
  it("stays green on a wide table, a short-flag form and flags with the type after an equals sign", () => {
    expect(check("USAGE\n  plugged-in link order [flags]\n\nFLAGS\n  --link string      the link\n  --position integer\n  --json\n")).toEqual({ ok: true, why: [] });
    expect(check("Options:\n  -l, --link <string>\n      Which link.\n  -p, --position=<integer>\n      Where it goes.\n")).toEqual({ ok: true, why: [] });
    expect(check("--link  TEXT\n--position  NUMBER\n")).toEqual({ ok: true, why: [] });
  });
  it("is red when the number is a string, or the flag is gone, in any of them", () => {
    expect(check("Options:\n  -l, --link <string>\n  -p, --position=<string>\n").why).toEqual(['link order --position: a uint is shown as "string", not a number']);
    expect(check("Options:\n  -l, --link <string>\n").why).toEqual(["link order has no --position flag"]);
    expect(check("FLAGS\n  --link string\n  --positional integer\n").why).toEqual(["link order has no --position flag"]);
  });
  it("judges the type on the type token alone: a word in the description does not make a string a number", () => {
    expect(check("FLAGS\n  --link string  the link\n  --position string  The integer position\n").why).toEqual(['link order --position: a uint is shown as "string", not a number']);
    expect(check("FLAGS\n  --link string\n  --position string\n      A number, an integer, from zero\n").why).toEqual(['link order --position: a uint is shown as "string", not a number']);
    expect(check("FLAGS\n  --link string\n  --position integer  The string position\n")).toEqual({ ok: true, why: [] });
  });
  it("reads the whole type expression: an enum's choices in brackets, and a type written after the description", () => {
    const enumField = (type: string) => {
      const add = pluggedIn.model.operations["link.order"]!;
      const model = { ...pluggedIn.model, operations: { ...pluggedIn.model.operations, "link.order": { ...add, payload: { ...add.payload, position: { value: { type: "enum" } } } } } };
      return judge(ThingEvals.evals, "thing.cli", "link", { ...pluggedIn, model, cli: { ...pluggedIn.cli, "link order": `FLAGS\n  --link string\n  --position ${type}\n` } });
    };
    expect(enumField("<listed | removed>")).toEqual({ ok: true, why: [] });
    expect(enumField("[listed|removed]  where it goes")).toEqual({ ok: true, why: [] });
    expect(enumField("{a,b}")).toEqual({ ok: true, why: [] });
    expect(enumField("<string>").why).toEqual(['link order --position: an enum is shown as "string", not its choices']);
    expect(check("FLAGS\n  --link string\n  --position  Where it goes <integer>\n")).toEqual({ ok: true, why: [] });
    expect(check("FLAGS\n  --link string\n  --position  Where it goes <string>\n").why).toEqual(['link order --position: a uint is shown as "string", not a number']);
    expect(check("FLAGS\n  --link string\n  --position <integer | string>\n").ok).toBe(false);
  });
  it("finds a flag by its own declaration: the usage line and another flag's description do not name it", () => {
    expect(check("USAGE\n  plugged-in link order --position <integer> --link <link>\n\nFLAGS\n  --link string  like --position integer\n").why).toEqual(["link order has no --position flag"]);
    expect(check("FLAGS\n  --link string  set it with --position integer\n  --position string\n").why).toEqual(['link order --position: a uint is shown as "string", not a number']);
  });
  it("ends the last flag's text with the flags section, not with the help", () => {
    const help = "FLAGS\n  --link string\n  --position integer\n\nNOTES\n  --position is the integer position, a string\n";
    expect(check(help)).toEqual({ ok: true, why: [] });
    expect(check("FLAGS\n  --link string\n  --position\n\nGLOBAL FLAGS\n  --log-level integer  the integer level\n").why).toEqual(['link order --position: a uint is shown as no type, not a number']);
  });
});

describe("operation.api: the endpoint's method and path, not its formatting", () => {
  const check = (t: (text: string) => string) => judge(OperationEvals.evals, "operation.api", "link.remove", editFile(pluggedIn, "generated/api/src/link/remove.ts", t));
  it("stays green when the call is spread over lines, single-quoted, or has a comment beside it", () => {
    expect(check((t) => t.replace('HttpApiEndpoint.post("remove", "/link/remove", {', "HttpApiEndpoint\n  .post(\n    'remove',\n    `/link/remove`,\n    {"))).toEqual({ ok: true, why: [] });
    expect(check((t) => `// HttpApiEndpoint.get("remove", "/link/remove")\n${t}`)).toEqual({ ok: true, why: [] });
  });
  it("owns the method: an operation is called with POST (design/frame/projections.md), whatever the endpoint says", () => {
    expect(check((t) => t.replace("HttpApiEndpoint.post(", "HttpApiEndpoint.delete(")).why).toEqual(["generated/api/src/link/remove.ts's endpoint remove is DELETE, but an operation is called with POST (design/frame/projections.md)"]);
    expect(check((t) => t.replace("HttpApiEndpoint.post(", "HttpApiEndpoint.get(")).ok).toBe(false);
  });
  it("is red when the only endpoint call is in a comment", () => {
    expect(check((t) => t.replace("export const endpoint = HttpApiEndpoint.post(", "// HttpApiEndpoint.post(").replace('"remove", "/link/remove", {', '"remove", "/link/remove", {')).ok).toBe(false);
    expect(check((t) => t.replace("export const endpoint = ", "/* ").replace("});\n", "}); */\n")).why[0]).toMatch(/has no endpoint "remove" at \/link\/remove/);
  });
  it("is red when the verb or the path is another", () => {
    expect(check((t) => t.replace('"/link/remove"', '"/link/rm"')).why[0]).toMatch(/has no endpoint "remove" at \/link\/remove/);
    expect(check((t) => t.replace('post("remove"', 'post("rm"')).why[0]).toMatch(/has no endpoint "remove"/);
  });
});

describe("machine.mcp and operation.mcp do not contradict: the description is the model's, the states are in the schema", () => {
  it("is green on both for a tool whose description names no state but whose schema does, and red on machine.mcp when neither does", () => {
    const schema = { properties: { state: { enum: ["listed", "removed"] } } };
    const named = { ...pluggedIn, mcp: pluggedIn.mcp!.map((t) => (t.name === "link.add" || t.name === "link.remove" ? { ...t, outputSchema: schema } : t)) };
    expect(judge(OperationEvals.evals, "operation.mcp", "link.remove", named)).toEqual({ ok: true, why: [] });
    expect(judge(MachineEvals.evals, "machine.mcp", "link", named)).toEqual({ ok: true, why: [] });
    expect(judge(OperationEvals.evals, "operation.mcp", "link.remove", pluggedIn)).toEqual({ ok: true, why: [] });
    expect(judge(MachineEvals.evals, "machine.mcp", "link", pluggedIn).ok).toBe(false);
  });
});

describe("machine.sdk: a type exported for the thing, not a string anywhere", () => {
  const check = (e: typeof pluggedIn) => judge(MachineEvals.evals, "machine.sdk", "link", e);
  const index = "generated/sdk/src/link/index.ts";
  it("stays green when the SDK has no semicolons, so one type's body ends where the next declaration starts", () => {
    expect(check(editFile(pluggedIn, index, (t) => `${t.replace(/;\n/g, "\n")}export type LinkState =\n  | "listed"\n  | "removed"\nexport type Other = "x"\n`))).toEqual({ ok: true, why: [] });
  });
  it("is red when a neighbour's literals are swallowed, or a state is only in a comment inside the type", () => {
    expect(check(editFile(pluggedIn, index, (t) => `${t}export type LinkState = "listed"\nexport type Removed = "removed"\n`)).ok).toBe(false);
    expect(check(editFile(pluggedIn, index, (t) => `${t}export type LinkState = string /* "listed" | "removed" */\n`)).ok).toBe(false);
    expect(check(editFile(pluggedIn, index, (t) => `${t}export type LinkState = "listed" // or "removed"\n`)).ok).toBe(false);
  });
  it("stays green for a type with single quotes, spread over lines, or named for the thing in another file", () => {
    expect(check(editFile(pluggedIn, index, (t) => `${t}export type LinkState =\n  | 'listed'\n  | 'removed';\n`))).toEqual({ ok: true, why: [] });
    expect(check(editFile(pluggedIn, "generated/sdk/src/link/state.ts", () => 'export type LinkStatus = "removed" | "listed";\n'))).toEqual({ ok: true, why: [] });
  });
  it("is red when the states are only strings in a comment, a function or another thing's type", () => {
    expect(check(editFile(pluggedIn, index, (t) => `${t}// "listed" and "removed"\nexport const states = ["listed", "removed"];\n`)).ok).toBe(false);
    expect(check(editFile(pluggedIn, "generated/sdk/src/profile/index.ts", (t) => `${t}export type Other = "listed" | "removed";\n`)).ok).toBe(false);
    expect(check(editFile(pluggedIn, index, (t) => `${t}export type LinkState = "listed";\n`)).ok).toBe(false);
  });
});
