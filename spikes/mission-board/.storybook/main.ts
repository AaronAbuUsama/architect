// Storybook for the mission board's parts. The stories are the same files the Design artifact's Components view
// reads, so what Aaron clicks through there is what runs here.
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/components/**/*.stories.tsx"],
  typescript: { reactDocgen: false },
  core: { disableTelemetry: true },
};
export default config;
