// The render module: a React element to the page's bytes. The portal never imports `react-dom`; it hands its page here.
import type { ReactElement } from "react";

export interface RenderApi {
  /** A whole document: `<!doctype html>` and the element, which is an `<html>`. Deterministic: the same element is the same bytes. */
  readonly document: (page: ReactElement) => string;
  /** A fragment, with no doctype (a drawer's content, a test's piece). */
  readonly fragment: (element: ReactElement) => string;
}
