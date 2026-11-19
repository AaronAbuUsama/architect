// A field table: name, type (the named value, or its base type), and what the type says of itself. Field descriptions and visibility
// arrive with M1.42's wire; until then a field shows what the wire holds.
import { Grid } from "@orthograph/portal-ui";
import type { ReactElement } from "react";
import type { FieldWire } from "#modules/wire/types.js";

interface Row {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly detail: string;
}

const rowOf = (name: string, f: FieldWire): Row => ({
  id: `field:${name}`,
  name: `${name}${f.optional === true ? " (optional)" : ""}`,
  type: f.ref ?? f.named ?? String(f.value["type"] ?? "?"),
  detail: Object.entries(f.value).filter(([k]) => k !== "type").map(([k, v]) => `${k} ${JSON.stringify(v)}`).join(", "),
});

export const FieldTable = ({ fields, label }: { readonly fields: Readonly<Record<string, FieldWire>>; readonly label: string }): ReactElement => (
  <Grid
    aria-label={label}
    data={Object.entries(fields).map(([name, f]) => rowOf(name, f))}
    getRowId={(r: Row) => r.id}
    columns={[
      { id: "name", header: "Field", isRowHeader: true, cell: (r: Row) => <span className="mono">{r.name}</span> },
      { id: "type", header: "Type", cell: (r: Row) => <span className="mono">{r.type}</span> },
      { id: "detail", header: "Detail", cell: (r: Row) => <span className="small muted">{r.detail}</span> },
    ]}
  />
);
