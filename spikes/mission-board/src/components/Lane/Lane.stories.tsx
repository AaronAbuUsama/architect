import type { Meta, StoryObj } from "@storybook/react-vite";
import { lane, later, now, outputColumns, stageColumns, stateColumns } from "../../stories/fixtures.ts";
import { inPanel } from "../../stories/frames.tsx";
import { Lane } from "./Lane.tsx";

const meta = {
  title: "Board/Lane",
  component: Lane,
  decorators: [inPanel(1280)],
} satisfies Meta<typeof Lane>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = { name: "Full · operation, columns by state", args: { lane: lane(now, "operation"), outputs: now.outputs, columns: stateColumns, by: "state" } };
export const Empty: Story = {
  name: "Empty · operation, showing red only",
  args: { lane: lane(now, "operation"), outputs: now.outputs, columns: stateColumns, by: "state", visible: (c) => c.state === "red" },
};
export const ManyRed: Story = { name: "Mostly red · visibility", args: { lane: lane(now, "visibility"), outputs: now.outputs, columns: stateColumns, by: "state" } };
export const WithGreen: Story = { name: "With green · operation (made-up history)", args: { lane: lane(later, "operation"), outputs: later.outputs, columns: stateColumns, by: "state" } };
export const ByOutput: Story = { name: "Columns by output · error", args: { lane: lane(now, "error"), outputs: now.outputs, columns: outputColumns, by: "output" } };
export const ByStage: Story = { name: "Columns by stage · error", args: { lane: lane(now, "error"), outputs: now.outputs, columns: stageColumns, by: "stage" } };

export const __namedExportsOrder = ["Full", "Empty", "ManyRed", "WithGreen", "ByOutput", "ByStage"];
