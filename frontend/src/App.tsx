import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

import { AppDataProvider } from "./context/AppDataProvider";
import { ThemeProvider } from "./context/ThemeProvider";
import { ToastProvider } from "./context/ToastProvider";
import { Auth } from "./pages/Auth";
import { Carnet } from "./pages/Carnet";
import { Help } from "./pages/Help";
import { Landing } from "./pages/Landing";
import { NotFound } from "./pages/NotFound";
import { Settings } from "./pages/Settings";
import { Workspace } from "./pages/Workspace";

function RetourEnHaut() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppDataProvider>
          <BrowserRouter>
            <RetourEnHaut />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/connexion" element={<Auth />} />
              <Route path="/atelier" element={<Workspace />} />
              <Route path="/carnet" element={<Carnet />} />
              <Route path="/reglages" element={<Settings />} />
              <Route path="/aide" element={<Help />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
