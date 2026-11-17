import type { NextConfig } from "next";

// Static export: the Pro face is built once and served as assets, like the plain portal (F1 §5). No remote images.
const config: NextConfig = { output: "export", devIndicators: { position: "bottom-right" } };

export default config;
