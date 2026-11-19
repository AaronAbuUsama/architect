import type { MoveProps as P } from "../types.ts";
import { Move } from "./move.tsx";
import type { Meta, Story } from "./stories.ts";

export default { title: "Model/Move", component: Move, parameters: { docs: { description: { component: "A machine move: from chips, an arrow, to chips." } } } } satisfies Meta<P>;
export const Creates: Story<P> = { args: { from: [], to: ["claimed"] } };
export const Between: Story<P> = { args: { from: ["listed"], to: ["removed"] } };
