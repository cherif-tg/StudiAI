import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { demarrerPwa } from "./lib/pwa";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app.css";
import "./styles/pages.css";
import "./styles/landing.css";

const racine = document.getElementById("root");
if (!racine) throw new Error("Élément #root introuvable dans index.html");

demarrerPwa();

createRoot(racine).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
