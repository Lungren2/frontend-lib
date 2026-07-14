import { createRoot } from "react-dom/client";

import { ui } from "./interface/ui";
import "./interface/ui/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <ui.button>Installed button</ui.button>,
);
