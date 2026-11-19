# render

`Render.document(page)` turns a React element into the bytes of a page (`<!doctype html>` first); `Render.fragment` does the same for a
piece. It is the only place the portal's pages meet `react-dom/server`, so `@orthograph/portal` imports React's JSX runtime and nothing
else of React.

Tests: `render.test.ts` renders twice and compares bytes.
