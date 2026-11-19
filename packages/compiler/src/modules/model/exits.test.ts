// An exit means one thing (K16 g, M1.47) and a declared `<Thing>NotFound` carries only the id (M1.46): the rules check 19
// doesn't reach — a machine's own exit, another thing's error named like a not-found, and a not-found with fields.
import { describe, expect, it } from "vitest";
import { exitClashes, notFoundShapes } from "./internal/exits.ts";

const app = { kind: "app" } as const;
const widget = (errors: Record<string, { exit: number; fields?: object }>, notFromExit?: number) => ({
  widget: {
    identifier: "Widget", from: app,
    errors: Object.fromEntries(Object.entries(errors).map(([n, e]) => [n, { exit: e.exit, fields: e.fields ?? {} }])),
    machine: notFromExit === undefined ? null : { notFrom: { error: "WidgetNotActive", exit: notFromExit } },
  },
});

describe("exits", () => {
  it("refuses a machine's own exit that is reserved or out of range, naming its machine.ts", () => {
    expect(exitClashes(widget({}, 3))).toEqual(["blueprint/things/widget/machine.ts: WidgetNotActive's exit 3 is NotAllowed's; pick another"]);
    expect(exitClashes(widget({}, 200))).toEqual(["blueprint/things/widget/machine.ts: WidgetNotActive's exit 200 is outside 5 to 125, the exits a refusal may use; pick another"]);
    expect(exitClashes(widget({}, 40))).toEqual([]);
  });

  it("lets only the thing's own <Thing>NotFound keep exit 4", () => {
    expect(exitClashes(widget({ WidgetNotFound: { exit: 4 } }))).toEqual([]);
    expect(exitClashes(widget({ GadgetNotFound: { exit: 4 } }))).toEqual(["blueprint/things/widget/errors.ts: GadgetNotFound's exit 4 is NotFound's; pick another"]);
  });

  it("refuses a declared <Thing>NotFound with any field but id", () => {
    expect(notFoundShapes(widget({ WidgetNotFound: { exit: 43, fields: { id: {} } } }))).toEqual([]);
    expect(notFoundShapes(widget({ WidgetNotFound: { exit: 43, fields: { id: {}, owner: {} } } }))).toEqual([
      "blueprint/things/widget/errors.ts: WidgetNotFound is the runtime's not-found refusal, which carries only the missing id; drop owner",
    ]);
  });
});
