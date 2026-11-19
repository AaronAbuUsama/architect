import type { Meta, StoryObj } from "@storybook/react-vite";
import { cardOf, laneOf, later, now, pick } from "../../stories/fixtures.ts";
import { inPanel } from "../../stories/frames.tsx";
import { CardDetail, type CardDetailProps } from "./CardDetail.tsx";

const meta = {
  title: "Board/CardDetail",
  component: CardDetail,
  decorators: [inPanel(460)],
} satisfies Meta<typeof CardDetail>;
export default meta;
type Story = StoryObj<typeof meta>;

const args = (v: typeof now, cell: (typeof pick)[keyof typeof pick]): CardDetailProps =>
  ({ card: cardOf(v, cell), lane: laneOf(v, cell), view: v });

export const Red: Story = { name: "Red · visibility.api", args: args(now, pick.red) };
export const Built: Story = { name: "Built · operation.model", args: args(now, pick.built) };
export const ProposedGrey: Story = { name: "Proposed grey, with Aaron's question · event.sdk", args: args(now, pick.proposedGrey) };
export const Waiting: Story = { name: "Waits on others · error.portal", args: args(now, pick.waiting) };
export const WithHistory: Story = { name: "With history · error.telemetry (made-up)", args: args(later, pick.history) };

export const Absence: Story = { name: "Absence check · step.sdk", args: args(now, pick.absence) };
export const __namedExportsOrder = ["Red", "Built", "ProposedGrey", "Waiting", "WithHistory", "Absence"];
