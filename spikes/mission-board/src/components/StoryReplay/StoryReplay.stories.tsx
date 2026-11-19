import type { Meta, StoryObj } from "@storybook/react-vite";
import { now } from "../../stories/fixtures.ts";
import { inPanel } from "../../stories/frames.tsx";
import { StoryReplay } from "./StoryReplay.tsx";

const meta = {
  title: "Goal/StoryReplay",
  component: StoryReplay,
  decorators: [inPanel(760)],
} satisfies Meta<typeof StoryReplay>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Story8: Story = { name: "The eight steps · real", args: { steps: now.story.steps } };
export const Fast: Story = { name: "The same, played fast", args: { steps: now.story.steps, pace: 0.6 } };

export const __namedExportsOrder = ["Story8", "Fast"];
