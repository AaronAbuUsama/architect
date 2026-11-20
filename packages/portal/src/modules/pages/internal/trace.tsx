// /portal/traces/<id>: one call's structure and timing, from `/_portal/v1/traces/<id>`; never a payload, an answer, a statement, a person or a log body.
import type { PortalData } from "../types.ts";
import { NotYet } from "./not-yet.tsx";
import { Page } from "./parts.tsx";

export const TracePage = ({ data, id }: { readonly data: PortalData; readonly id: string }) => (
  <Page status={200} data={data}>
    <h1>{`Trace ${id}`}</h1>
    <p><NotYet hole="trace" what="the trace reader is not wired yet" /></p>
  </Page>
);
