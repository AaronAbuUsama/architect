import { KeyPath } from "./key-path.tsx";
import type { Meta, Story } from "./stories.ts";
type P = Parameters<typeof KeyPath>[0];
export default { title: "Model/KeyPath", component: KeyPath, parameters: { docs: { description: { component: "A grouping key read left to right. Replaces \"link.add · record · DatabaseError\". Its sibling Move replaces \"listed | removed → removed\"." } } } } satisfies Meta<P>;
export const Issue: Story<P> = { name: "An issue's key", args: { parts: ["link.add", "record", "DatabaseError"], tone: "danger" } };
export const Refusal: Story<P> = { args: { parts: ["handle.claim", "HandleTaken"], tone: "warning" } };
