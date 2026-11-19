import type { Meta, StoryObj } from "@storybook/react-vite";
import { lane, now, outputColumns, stageColumns, stateColumns } from "../../stories/fixtures.ts";
import { inColumn } from "../../stories/frames.tsx";
import { columnOf } from "../shared/vocab.ts";
import { ColumnHeader } from "./ColumnHeader.tsx";

const meta = {
  title: "Board/ColumnHeader",
  component: ColumnHeader,
  decorators: [inColumn],
} satisfies Meta<typeof ColumnHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

const op = lane(now, "operation");
const count = (by: "state" | "output" | "stage", id: string) => op.cards.filter((c) => columnOf(by, c) === id).length;
const red = stateColumns.find((c) => c.id === "red")!;
const built = stateColumns.find((c) => c.id === "built")!;
const api = outputColumns.find((c) => c.id === "api")!;
const build = stageColumns.find((c) => c.id === "build")!;

export const RedColumn: Story = { name: "By state · Red (operation lane)", args: { column: red, count: count("state", "red") } };
export const BuiltColumn: Story = { name: "By state · Built (operation lane)", args: { column: built, count: count("state", "built") } };
export const OutputColumn: Story = { name: "By output · API", args: { column: api, count: count("output", "api") } };
export const StageColumn: Story = { name: "By stage · Build", args: { column: build, count: count("stage", "build") } };

export const __namedExportsOrder = ["RedColumn", "BuiltColumn", "OutputColumn", "StageColumn"];
