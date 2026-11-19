import type { Meta, StoryObj } from "@storybook/react-vite";
import { later, laterChanges, now } from "../../stories/fixtures.ts";
import { inPanel } from "../../stories/frames.tsx";
import { ChangedList } from "./ChangedList.tsx";

const meta = {
  title: "Grid/ChangedList",
  component: ChangedList,
  decorators: [inPanel(440)],
} satisfies Meta<typeof ChangedList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Nothing: Story = { name: "Nothing moved · real", args: { changes: [], lanes: now.lanes } };
export const Moves: Story = { name: "Eight moves, newest first · made-up", args: { changes: laterChanges, lanes: later.lanes } };

export const __namedExportsOrder = ["Nothing", "Moves"];
