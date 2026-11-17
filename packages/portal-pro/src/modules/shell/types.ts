// The app shell: the catalog navigation of F2 §5 and the frame every page renders inside.

/** One entry in the sidebar. `section` groups entries the way F2's recommended IA does. */
export interface NavItem {
  readonly key: string;
  readonly label: string;
  readonly href: string;
  readonly section: "start" | "things" | "reference" | "proof" | "work" | "read";
}

export interface ShellProps {
  /** The key of the page being shown, for the active entry. */
  readonly current: string;
}
