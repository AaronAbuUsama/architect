import type { Meta, StoryObj } from "@storybook/react-vite";
import { laterClimb, nowClimb } from "../../stories/fixtures.ts";
import { inPanel } from "../../stories/frames.tsx";
import { ClimbChart } from "./ClimbChart.tsx";

const meta = {
  title: "Grid/ClimbChart",
  component: ClimbChart,
  decorators: [inPanel(720)],
} satisfies Meta<typeof ClimbChart>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OnePoint: Story = { name: "Only the baseline · real", args: { climb: nowClimb } };
export const Climbing: Story = { name: "Eight moves · made-up history", args: { climb: laterClimb } };

export const __namedExportsOrder = ["OnePoint", "Climbing"];
