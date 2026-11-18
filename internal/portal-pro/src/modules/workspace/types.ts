export interface WorkspacePage {
  readonly key: string;
  readonly title: string;
  readonly group: string;
  readonly path: string;
  readonly kind: "thing" | "operation";
  readonly name: string;
  readonly hash: string;
  readonly noteFile: string;
}

export interface WorkspaceNote {
  readonly markdown: string;
  readonly revision: string;
  readonly stale: boolean;
}
