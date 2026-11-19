import type { Meta, StoryObj } from "@storybook/react-vite";
import { now } from "../../stories/fixtures.ts";
import { inPanel } from "../../stories/frames.tsx";
import { GoalOverview } from "./GoalOverview.tsx";

const meta = {
  title: "Goal/GoalOverview",
  component: GoalOverview,
  decorators: [inPanel(820)],
} satisfies Meta<typeof GoalOverview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AsGraded: Story = { name: "The goal as written · real", args: { view: now } };

export const __namedExportsOrder = ["AsGraded"];
