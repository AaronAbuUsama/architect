import type { Meta, StoryObj } from "@storybook/react-vite";
import { cardOf, laneOf, later, now, pick } from "../../stories/fixtures.ts";
import { inCard } from "../../stories/frames.tsx";
import { heldBy } from "../Lane/Lane.tsx";
import { OutputCard, type OutputCardProps } from "./OutputCard.tsx";

const meta = {
  title: "Board/OutputCard",
  component: OutputCard,
  decorators: [inCard()],
} satisfies Meta<typeof OutputCard>;
export default meta;
type Story = StoryObj<typeof meta>;

const args = (v: typeof now, cell: (typeof pick)[keyof typeof pick]): OutputCardProps => {
  const lane = laneOf(v, cell);
  const card = cardOf(v, cell);
  return { card, block: lane.block.name, heldBy: heldBy(lane, v.outputs, card) };
};

export const Red: Story = { name: "Red · visibility.api", args: args(now, pick.red) };
export const Partly: Story = { name: "Partly · operation.portal", args: args(now, pick.partly) };
export const Built: Story = { name: "Built · operation.model", args: args(now, pick.built) };
export const Green: Story = { name: "Green · operation.api (made-up history)", args: args(later, pick.green) };
export const ProposedGrey: Story = { name: "Proposed grey · event.sdk", args: args(now, pick.proposedGrey) };
export const Waiting: Story = { name: "Held by a dependency · error.portal", args: args(now, pick.waiting) };
export const WithHistory: Story = { name: "With history · error.telemetry (made-up)", args: args(later, pick.history) };

export const Absence: Story = { name: "Absence check · step.sdk", args: args(now, pick.absence) };

export const __namedExportsOrder = ["Red", "Partly", "Built", "Green", "ProposedGrey", "Waiting", "WithHistory", "Absence"];
