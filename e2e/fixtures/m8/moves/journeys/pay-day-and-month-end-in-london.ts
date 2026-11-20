// Journey-author file (M8.04). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`.
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { BudgetReported, BudgetReset } from "../blueprint/things/budget/events.ts";
import get from "../blueprint/things/budget/verbs/get.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}`);

// Calendar anchors in Europe/London fire at the start of the day there. London's clocks go forward on 28 March 2027:
// before it, the start of a London day is midnight UTC; after it, eleven the evening before, UTC.
export default Blueprint.journey("pay day and month end in London, across the clocks going forward", {
  cast: { office: Blueprint.anyone },
  starts: "budget-opened",
  steps: (s) => [
    s.step(
      "January: the 25th, then the 31st, at midnight UTC",
      s.clock.moveTo("2027-02-01T00:00:00Z"),
      expect(fired).toEqual(["budget.reset due 2027-01-25T00:00:00.000Z", "budget.report due 2027-01-31T00:00:00.000Z"]),
      emits(BudgetReset, { budget: s.world.budget, at: "2027-01-25T00:00:00.000Z" }),
      emits(BudgetReported, { budget: s.world.budget, at: "2027-01-31T00:00:00.000Z" }),
    ),
    s.step(
      "February: the 25th, then the 28th, its last day",
      s.clock.moveTo("2027-03-01T00:00:00Z"),
      expect(fired).toEqual(["budget.reset due 2027-02-25T00:00:00.000Z", "budget.report due 2027-02-28T00:00:00.000Z"]),
    ),
    s.step(
      "March: the 25th still in winter time, the 31st after the clocks went forward",
      s.clock.moveTo("2027-04-01T00:00:00Z"),
      expect(fired).toEqual(["budget.reset due 2027-03-25T00:00:00.000Z", "budget.report due 2027-03-30T23:00:00.000Z"]),
      emits(BudgetReported, { budget: s.world.budget, at: "2027-03-30T23:00:00.000Z" }),
    ),
    s.step(
      "April: both in summer time, an hour before midnight UTC",
      s.clock.moveTo("2027-05-01T00:00:00Z"),
      expect(fired).toEqual(["budget.reset due 2027-04-24T23:00:00.000Z", "budget.report due 2027-04-29T23:00:00.000Z"]),
      emits(BudgetReset, { budget: s.world.budget, at: "2027-04-24T23:00:00.000Z" }),
    ),
    s.step(
      "read back, four of each",
      s.office.run(get, { id: s.world.budget }),
      expect((a) => [a.openedAt, a.resets, a.reports]).toEqual(["2027-01-10T09:00:00.000Z", 4n, 4n]),
      noEvents(),
    ),
  ],
});
