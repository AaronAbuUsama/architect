// The editor's own page (/editor): web.css, the editor's sheet and fonts, and the agent bridge so a test can drive it.
import "@ui-sdk/core/web.css";
import "./editor.css";
import { createRoot } from "react-dom/client";
import { createAgent } from "@ui-sdk/react/agent";
import { Editor } from "./editor.tsx";

(window as unknown as { editor: unknown }).editor = { agent: createAgent() };
createRoot(document.getElementById("root")!).render(<Editor />);
