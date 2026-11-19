import type { Meta, StoryObj } from "@storybook/react-vite";
import { lane, now } from "../../stories/fixtures.ts";
import { inPanel } from "../../stories/frames.tsx";
import { LaneEndState } from "./LaneEndState.tsx";

const meta = {
  title: "Board/LaneEndState",
  component: LaneEndState,
  decorators: [inPanel(440)],
} satisfies Meta<typeof LaneEndState>;
export default meta;
type Story = StoryObj<typeof meta>;

// No end state is built yet (every ref is null at the grid's grading), so the stories are the first and last lanes.
const first = now.lanes[0]!;
const last = now.lanes[now.lanes.length - 1]!;

export const First: Story = { name: `First in the climb · ${first.block.name}`, args: { lane: first } };
export const Last: Story = { name: `Last in the climb · ${last.block.name}`, args: { lane: last } };
export const Visibility: Story = { name: "Visibility", args: { lane: lane(now, "visibility") } };

export const __namedExportsOrder = ["First", "Last", "Visibility"];
