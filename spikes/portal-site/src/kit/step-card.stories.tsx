import { journeys } from "../journeys.ts";
import type { Meta, Story } from "./stories.ts";
import { StepCard } from "./step-card.tsx";
type P = Parameters<typeof StepCard>[0];
export default { title: "Proof/StepCard", component: StepCard, parameters: { docs: { description: { component: "What a journey step's hover preview shows, inside Pro's HoverCard." } } } } satisfies Meta<P>;
export const Refused: Story<P> = { name: "A step that expects a refusal", args: { j: journeys[0]!, i: 3 } };
export const Failed: Story<P> = { name: "The step that failed in staging", args: { j: journeys.find((j) => j.steps.some((s) => !s.ok))!, i: journeys.find((j) => j.steps.some((s) => !s.ok))!.steps.findIndex((s) => !s.ok) } };
