import { StrictMode } from "react";
import * as ReactDOM from "react-dom/client";
import { TooltipProvider } from "@reactive-resume/ui";
import { App } from "./App";
import "./styles/globals.css";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </StrictMode>
);
