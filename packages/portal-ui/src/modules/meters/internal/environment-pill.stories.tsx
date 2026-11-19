import type { EnvironmentPillProps as P } from "../types.ts";
import { EnvironmentPill } from "./environment-pill.tsx";
import type { Meta, Story } from "./stories.ts";

export default { title: "Model/EnvironmentPill", component: EnvironmentPill, parameters: { docs: { description: { component: "An environment as one object: live dot, name, and what it runs on." } } } } satisfies Meta<P>;
export const Local: Story<P> = { name: "Local, live", args: { name: "local", live: true, runsOn: "D1 local" } };
export const Staging: Story<P> = { args: { name: "staging", runsOn: "Cloudflare D1" } };
export const NameOnly: Story<P> = { name: "Small, name only", args: { name: "staging", size: "sm" } };
