import type { Meta, StoryObj } from "@storybook/react-vite";
import { cardOf, later, now, pick } from "../../stories/fixtures.ts";
import { inPanel } from "../../stories/frames.tsx";
import { Activity, type ActivityProps } from "./Activity.tsx";

const meta = {
  title: "Pages/Activity",
  component: Activity,
  decorators: [inPanel(560)],
} satisfies Meta<typeof Activity>;
export default meta;
type Story = StoryObj<typeof meta>;

const args = (v: typeof now, cell: (typeof pick)[keyof typeof pick]): ActivityProps =>
  ({ card: cardOf(v, cell), tasks: v.tasks, threads: v.threads, repo: v.repo, asOf: v.asOf, record: v.record });

export const Graded: Story = { name: "Only the grading · visibility.api (real)", args: args(now, pick.red) };
export const Moved: Story = { name: "Two moves with PR links · visibility.api (made-up)", args: args(later, pick.red) };
export const Handed: Story = { name: "Handed between agents · error.telemetry (made-up)", args: args(later, pick.history) };

export const __namedExportsOrder = ["Graded", "Moved", "Handed"];
