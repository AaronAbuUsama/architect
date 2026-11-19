// Every story renders dark, inside the console's root, with HeroUI's and the board's styles, as on the page.
import type { Preview } from "@storybook/react-vite";
import "../node_modules/@heroui/styles/dist/heroui.min.css"; // the built CSS; the package exports only Tailwind sources
import "../node_modules/@heroui-pro/react/dist/heroui-pro.min.css";
import "../src/app/tokens.css";
import "../src/app/board.css";

document.documentElement.classList.add("dark");
document.documentElement.setAttribute("data-theme", "dark");

const preview: Preview = {
  parameters: { layout: "fullscreen", backgrounds: { disable: true } },
  decorators: [(Story) => <div className="dark console-root" data-theme="dark" style={{ padding: 24 }}><Story /></div>],
};
export default preview;
