// The shape of a CSF story file, kept local so the spike needs no Storybook install. Each `*.stories.tsx` in kit/ is a
// valid Storybook 8 CSF module: a default export with `title` and `component`, and one named export per story.
import type { ComponentType } from "react";
export type Meta<P> = { title: string; component: ComponentType<P>; parameters?: { docs?: { description?: { component?: string } } } };
export type Story<P> = { name?: string; args: P };
