import type { CallsMeterProps as P } from "../types.ts";
import { CallsMeter } from "./calls-meter.tsx";
import type { Meta, Story } from "./stories.ts";

export default { title: "Live/CallsMeter", component: CallsMeter, parameters: { docs: { description: { component: "A window's calls split into answered, refused and defects." } } } } satisfies Meta<P>;
export const Default: Story<P> = { args: { split: { answered: 2193, refused: 128, defects: 0 }, label: "handle" } };
export const WithDefects: Story<P> = { name: "With defects", args: { split: { answered: 1146, refused: 15, defects: 3 }, label: "link" } };
export const InACard: Story<P> = { name: "Small, no legend", args: { split: { answered: 2193, refused: 128, defects: 0 }, size: "sm", legend: false, label: "handle" } };
export const Quiet: Story<P> = { name: "No calls", args: { split: { answered: 0, refused: 0, defects: 0 }, size: "sm" } };
