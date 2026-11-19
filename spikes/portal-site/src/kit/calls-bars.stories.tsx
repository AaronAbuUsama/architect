import { allStat, perMinute, statOf } from "../live.ts";
import { model } from "../model.ts";
import { CallsBars } from "./calls-bars.tsx";
import type { Meta, Story } from "./stories.ts";
type P = Parameters<typeof CallsBars>[0];
export default { title: "Live/CallsBars", component: CallsBars, parameters: { docs: { description: { component: "Calls per minute, stacked by outcome, with Pro's BarChart in the browser. Replaces the line." } } } } satisfies Meta<P>;
export const Everything: Story<P> = { args: { series: perMinute(allStat()), label: "every operation" } };
export const OneOperation: Story<P> = { name: "One operation, with defects", args: { series: perMinute(statOf(model.operations["link.add"]!)), label: "link.add" } };
