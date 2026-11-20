// /portal/monitor: M1.49's pages. Listed in the frame and searchable; what they draw is not built yet, and the page says so.
import type { PortalData } from "../types.ts";
import { NotYet } from "./not-yet.tsx";
import { Page } from "./parts.tsx";

export const MonitorPage = ({ data }: { readonly data: PortalData }) => (
  <Page status={200} data={data}>
    <h1>Monitor</h1>
    <p>The monitor pages are a later slice (M1.49): <NotYet hole="monitor" what="M1.49 builds them" /></p>
  </Page>
);
