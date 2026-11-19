import type { Meta, StoryObj } from "@storybook/react-vite";
import { cardOf, laneOf, later, now, pick } from "../../stories/fixtures.ts";
import { inPanel } from "../../stories/frames.tsx";
import { CardDetail, type CardDetailProps } from "./CardDetail.tsx";

// The same CardDetail as a full page: a Linear issue, properties in the rail (GRILL-3 Q1 A).
const meta = {
  title: "Pages/EvalPage",
  component: CardDetail,
  decorators: [inPanel(1180)],
} satisfies Meta<typeof CardDetail>;
export default meta;
type Story = StoryObj<typeof meta>;

const args = (v: typeof now, cell: (typeof pick)[keyof typeof pick]): CardDetailProps =>
  ({ card: cardOf(v, cell), lane: laneOf(v, cell), view: v, layout: "page" });

export const WithHistory: Story = { name: "Moved twice, with notes · visibility.api (made-up history)", args: args(later, pick.red) };
export const Handed: Story = { name: "Handed between agents · error.telemetry (made-up history)", args: args(later, pick.history) };
export const AsGraded: Story = { name: "As graded, nothing moved · operation.model (real)", args: args(now, pick.built) };

export const __namedExportsOrder = ["WithHistory", "Handed", "AsGraded"];
