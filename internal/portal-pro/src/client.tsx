import { createRoot } from "react-dom/client";
import blueprint from "../../../examples/acme/generated/portal/blueprint.json";
import { ExtensionGallery } from "./modules/extension-host/service.tsx";
import { PortalLayout } from "./modules/layout/service.tsx";
import { Operations } from "./modules/operations/service.tsx";
import { Workspace } from "./modules/workspace-view/service.tsx";
import type { OperationsBlueprint } from "./modules/operations/types.ts";

const pathname = window.location.pathname;
createRoot(document.getElementById("root")!).render(
  pathname === "/operations" || pathname.startsWith("/operations/")
    ? <Operations blueprint={blueprint as OperationsBlueprint} />
    : pathname === "/extensions" || pathname.startsWith("/extensions/")
      ? <PortalLayout project={blueprint.project} pathname="/extensions">
          <ExtensionGallery id={pathname.split("/")[2]} context={{ path: pathname }} />
        </PortalLayout>
      : pathname === "/" || pathname === "/workspace" || pathname.startsWith("/workspace/")
        ? <Workspace blueprint={blueprint as OperationsBlueprint} path={pathname} />
        : <PortalLayout project={blueprint.project} pathname={pathname} />,
);
