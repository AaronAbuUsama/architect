import type { Meta, StoryObj } from "@storybook/react-vite";
import { later, now } from "../../stories/fixtures.ts";
import { inPanel } from "../../stories/frames.tsx";
import { GoalScore } from "./GoalScore.tsx";

const meta = {
  title: "Goal/GoalScore",
  component: GoalScore,
  decorators: [inPanel(720)],
} satisfies Meta<typeof GoalScore>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AsGraded: Story = { name: "As graded · real", args: { now: now.score } };
export const SinceGrid: Story = { name: "With change since the grid · made-up", args: { now: later.score, then: now.score, sinceLabel: "since the grid" } };

export const __namedExportsOrder = ["AsGraded", "SinceGrid"];
