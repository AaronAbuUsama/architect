import { BudgetMeter } from "./budget-meter.tsx";
import type { Meta, Story } from "./stories.ts";
type P = Parameters<typeof BudgetMeter>[0];
export default { title: "Live/BudgetMeter", component: BudgetMeter, parameters: { docs: { description: { component: "p95 against the declared budget. Replaces \"164 / 150 ms\"." } } } } satisfies Meta<P>;
export const Within: Story<P> = { args: { p95: 6, budget: 150 } };
export const Over: Story<P> = { args: { p95: 164, budget: 150 } };
export const NoBudget: Story<P> = { name: "No budget declared", args: { p95: 41, budget: null } };
export const Compact: Story<P> = { args: { p95: 164, budget: 150, compact: true } };
