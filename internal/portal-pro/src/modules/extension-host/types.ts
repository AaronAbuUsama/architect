export const extensionSlots = {
  "portal.sidebar.bottom": "Below the portal navigation.",
  "operation.contract.bottom": "After the selected operation's contract reference.",
  "trace.detail.bottom": "After the selected trace's span details.",
} as const;

export type ExtensionSlotName = keyof typeof extensionSlots;

export interface ExtensionManifest {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly entry: "index.html";
  readonly slots: readonly ExtensionSlotName[];
  readonly permissions: { readonly appActions: readonly string[] };
}
