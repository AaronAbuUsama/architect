import type { Meta, StoryObj } from "@storybook/react-vite";
import { later, now } from "../../stories/fixtures.ts";
import { inPanel } from "../../stories/frames.tsx";
import { FalloutDiagram } from "./FalloutDiagram.tsx";

const meta = {
  title: "Goal/FalloutDiagram",
  component: FalloutDiagram,
  decorators: [inPanel(860)],
} satisfies Meta<typeof FalloutDiagram>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AsGraded: Story = { name: "As graded · real", args: { lanes: now.lanes, outputs: now.outputs } };
export const Later: Story = { name: "After eight moves · made-up", args: { lanes: later.lanes, outputs: later.outputs } };

export const __namedExportsOrder = ["AsGraded", "Later"];
