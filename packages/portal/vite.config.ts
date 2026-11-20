// The portal's client build (K19): `src/main.ts` and the pages, with `@orthograph/portal-ui` and HeroUI Pro, into `dist/client`
// (index.html, JS, CSS). It runs once, here, where the licence is (`nx run portal:client`), and the built files are what ships:
// a project's Worker serves them as static assets and never builds them. HeroUI's and Pro's precompiled sheets are read from where
// the package manager put them, through portal-ui, the only package that depends on Pro.
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig } from "vite";

const fromPortalUi = createRequire(join(import.meta.dirname, "../portal-ui/package.json"));
const sheet = (name: string, file: string): string => join(dirname(fromPortalUi.resolve(`${name}/package.json`)), file);

export default defineConfig({
  root: import.meta.dirname,
  base: "/portal/",
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "heroui-styles": sheet("@heroui/styles", "dist/heroui.min.css"),
      "heroui-pro-styles": sheet("@heroui-pro/react", "dist/heroui-pro.min.css"),
    },
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
    rolldownOptions: {
      // HeroUI's dependencies carry `"use client"`; a browser bundle has no server components to tell apart, so the directive is noise.
      onwarn: (warning, warn) => { if (warning.code !== "MODULE_LEVEL_DIRECTIVE") warn(warning); },
    },
  },
});
