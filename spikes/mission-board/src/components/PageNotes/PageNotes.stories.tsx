import type { Meta, StoryObj } from "@storybook/react-vite";
import { cardOf, later, now, pick } from "../../stories/fixtures.ts";
import { inPanel } from "../../stories/frames.tsx";
import { PageNotes } from "./PageNotes.tsx";

const meta = {
  title: "Pages/PageNotes",
  component: PageNotes,
  decorators: [inPanel(460)],
} satisfies Meta<typeof PageNotes>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { name: "Nobody wrote any · visibility.api (real)", args: cardOf(now, pick.red).notes };
export const Written: Story = { name: "Written · visibility.api (made-up)", args: cardOf(later, pick.red).notes };
export const Stale: Story = { name: "Stale, the grid was regraded · error.telemetry (made-up)", args: cardOf(later, pick.history).notes };

export const __namedExportsOrder = ["Empty", "Written", "Stale"];
