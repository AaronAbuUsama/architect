import type { Meta, StoryObj } from "@storybook/react-vite";
import { later, laterChanges, now } from "../../stories/fixtures.ts";
import { inPanel } from "../../stories/frames.tsx";
import { CoverageMatrix } from "./CoverageMatrix.tsx";

const meta = {
  title: "Grid/CoverageMatrix",
  component: CoverageMatrix,
  decorators: [inPanel(720)],
} satisfies Meta<typeof CoverageMatrix>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AsGraded: Story = { name: "As graded · 117 cards", args: { lanes: now.lanes, outputs: now.outputs } };
export const Moved: Story = {
  name: "After eight moves, moved cards outlined (made-up)",
  args: { lanes: later.lanes, outputs: later.outputs, moved: new Set(laterChanges.map((c) => c.cell)) },
};

export const __namedExportsOrder = ["AsGraded", "Moved"];
