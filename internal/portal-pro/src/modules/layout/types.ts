import type { ScreenContext } from "../agent/types.ts";
import type { ReactNode } from "react";

export interface PortalLayoutProps {
  readonly project: string;
  readonly pathname: string;
  readonly children?: ReactNode;
  readonly screen?: ScreenContext;
  readonly navbarEnd?: ReactNode;
  readonly navbarHref?: string;
  readonly workspaceNavigation?: ReactNode;
  readonly aside?: ReactNode;
  readonly onAsideOpenChange?: (open: boolean) => void;
}
