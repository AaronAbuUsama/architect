// The shape of a CSF story file, kept local so the package needs no Storybook install: each `*.stories.tsx` is a valid Storybook 8
// CSF module (a default export with `title` and `component`, one named export per story).
import type { ComponentType } from "react";

export interface Meta<P> {
  readonly title: string;
  readonly component: ComponentType<P>;
  readonly parameters?: { readonly docs?: { readonly description?: { readonly component?: string } } };
}
export interface Story<P> {
  readonly name?: string;
  readonly args: P;
}
